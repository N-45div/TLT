/// ClaimRegistry: Core module for creating and managing truth claims
module truth_markets::claim_registry {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use std::string::String;
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};

    /// Errors
    const EInvalidDeadline: u64 = 0;
    const EClaimAlreadyResolved: u64 = 1;
    const EDeadlineNotReached: u64 = 2;
    const EUnauthorized: u64 = 3;
    const EInvalidStatus: u64 = 4;

    /// Claim status
    const STATUS_OPEN: u8 = 0;
    const STATUS_RESOLVING: u8 = 1;
    const STATUS_RESOLVED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;

    /// Claim object representing a factual assertion
    public struct Claim has key, store {
        id: UID,
        /// Creator of the claim
        creator: address,
        /// Walrus blob ID containing ClaimSpec JSON
        spec_blob_id: String,
        /// Walrus blob ID containing encrypted evidence (Seal ciphertext)
        evidence_blob_id: String,
        /// Human-readable description
        description: String,
        /// Deadline timestamp (ms since epoch)
        deadline: u64,
        /// Current status
        status: u8,
        /// Resolution result (true = YES, false = NO)
        result: Option<bool>,
        /// Walrus blob ID of attested result
        result_blob_id: Option<String>,
        /// Enclave measurement that resolved this claim
        resolver_measurement: Option<vector<u8>>,
        /// Total staked on YES
        yes_stake: u64,
        /// Total staked on NO
        no_stake: u64,
        /// Creator fee (basis points, e.g., 100 = 1%)
        creator_fee_bps: u64,
        /// Protocol fee (basis points)
        protocol_fee_bps: u64,
        /// Escrow balance
        escrow: Balance<SUI>,
        /// Creation timestamp
        created_at: u64,
        /// Resolution timestamp
        resolved_at: Option<u64>,
    }

    /// Registry to track all claims
    public struct ClaimRegistry has key {
        id: UID,
        /// Total claims created
        total_claims: u64,
        /// Protocol fee recipient
        protocol_fee_recipient: address,
        /// Default protocol fee (basis points)
        default_protocol_fee_bps: u64,
    }

    /// Events
    public struct ClaimCreated has copy, drop {
        claim_id: ID,
        creator: address,
        spec_blob_id: String,
        evidence_blob_id: String,
        description: String,
        deadline: u64,
    }

    public struct ClaimResolved has copy, drop {
        claim_id: ID,
        result: bool,
        result_blob_id: String,
        resolver_measurement: vector<u8>,
        yes_stake: u64,
        no_stake: u64,
        resolved_at: u64,
    }

    public struct ClaimCancelled has copy, drop {
        claim_id: ID,
        reason: String,
    }

    /// Initialize the registry (called once on publish)
    fun init(ctx: &mut TxContext) {
        let registry = ClaimRegistry {
            id: object::new(ctx),
            total_claims: 0,
            protocol_fee_recipient: tx_context::sender(ctx),
            default_protocol_fee_bps: 100, // 1%
        };
        transfer::share_object(registry);
    }

    /// Create a new claim
    public entry fun create_claim(
        registry: &mut ClaimRegistry,
        spec_blob_id: String,
        evidence_blob_id: String,
        description: String,
        deadline: u64,
        creator_fee_bps: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let now = clock::timestamp_ms(clock);
        assert!(deadline > now, EInvalidDeadline);

        let claim = Claim {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            spec_blob_id,
            evidence_blob_id,
            description,
            deadline,
            status: STATUS_OPEN,
            result: std::option::none(),
            result_blob_id: std::option::none(),
            resolver_measurement: std::option::none(),
            yes_stake: 0,
            no_stake: 0,
            creator_fee_bps,
            protocol_fee_bps: registry.default_protocol_fee_bps,
            escrow: balance::zero(),
            created_at: now,
            resolved_at: std::option::none(),
        };

        let claim_id = object::uid_to_inner(&claim.id);
        
        event::emit(ClaimCreated {
            claim_id,
            creator: tx_context::sender(ctx),
            spec_blob_id: claim.spec_blob_id,
            evidence_blob_id: claim.evidence_blob_id,
            description: claim.description,
            deadline: claim.deadline,
        });

        registry.total_claims = registry.total_claims + 1;
        transfer::share_object(claim);
    }

    /// Add stake to escrow (called by market module)
    public(package) fun add_stake(
        claim: &mut Claim,
        amount: Coin<SUI>,
        is_yes: bool,
    ) {
        assert!(claim.status == STATUS_OPEN, EInvalidStatus);
        
        let stake_amount = coin::value(&amount);
        coin::put(&mut claim.escrow, amount);

        if (is_yes) {
            claim.yes_stake = claim.yes_stake + stake_amount;
        } else {
            claim.no_stake = claim.no_stake + stake_amount;
        }
    }

    /// Resolve claim with attested result (called by attestation module)
    public(package) fun resolve_claim(
        claim: &mut Claim,
        result: bool,
        result_blob_id: String,
        resolver_measurement: vector<u8>,
        clock: &Clock,
    ) {
        let now = clock::timestamp_ms(clock);
        assert!(now >= claim.deadline, EDeadlineNotReached);
        assert!(claim.status == STATUS_OPEN || claim.status == STATUS_RESOLVING, EClaimAlreadyResolved);

        claim.status = STATUS_RESOLVED;
        claim.result = std::option::some(result);
        claim.result_blob_id = std::option::some(result_blob_id);
        claim.resolver_measurement = std::option::some(resolver_measurement);
        claim.resolved_at = std::option::some(now);

        event::emit(ClaimResolved {
            claim_id: object::uid_to_inner(&claim.id),
            result,
            result_blob_id,
            resolver_measurement,
            yes_stake: claim.yes_stake,
            no_stake: claim.no_stake,
            resolved_at: now,
        });
    }

    /// Cancel claim (only creator, only if no stakes)
    public entry fun cancel_claim(
        claim: &mut Claim,
        reason: String,
        ctx: &mut TxContext,
    ) {
        assert!(claim.creator == tx_context::sender(ctx), EUnauthorized);
        assert!(claim.yes_stake == 0 && claim.no_stake == 0, EInvalidStatus);
        assert!(claim.status == STATUS_OPEN, EInvalidStatus);

        claim.status = STATUS_CANCELLED;

        event::emit(ClaimCancelled {
            claim_id: object::uid_to_inner(&claim.id),
            reason,
        });
    }

    /// Withdraw from escrow (called by market module for payouts)
    public(package) fun withdraw_escrow(
        claim: &mut Claim,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        coin::take(&mut claim.escrow, amount, ctx)
    }

    // === Getters ===

    public fun get_status(claim: &Claim): u8 { claim.status }
    public fun get_result(claim: &Claim): Option<bool> { claim.result }
    public fun get_deadline(claim: &Claim): u64 { claim.deadline }
    public fun get_yes_stake(claim: &Claim): u64 { claim.yes_stake }
    public fun get_no_stake(claim: &Claim): u64 { claim.no_stake }
    public fun get_creator(claim: &Claim): address { claim.creator }
    public fun get_creator_fee_bps(claim: &Claim): u64 { claim.creator_fee_bps }
    public fun get_protocol_fee_bps(claim: &Claim): u64 { claim.protocol_fee_bps }
    public fun get_escrow_balance(claim: &Claim): u64 { balance::value(&claim.escrow) }
    public fun is_resolved(claim: &Claim): bool { claim.status == STATUS_RESOLVED }

    // === Admin functions ===

    public entry fun update_protocol_fee(
        registry: &mut ClaimRegistry,
        new_fee_bps: u64,
        ctx: &mut TxContext,
    ) {
        assert!(registry.protocol_fee_recipient == tx_context::sender(ctx), EUnauthorized);
        registry.default_protocol_fee_bps = new_fee_bps;
    }

    public entry fun update_fee_recipient(
        registry: &mut ClaimRegistry,
        new_recipient: address,
        ctx: &mut TxContext,
    ) {
        assert!(registry.protocol_fee_recipient == tx_context::sender(ctx), EUnauthorized);
        registry.protocol_fee_recipient = new_recipient;
    }

    public fun get_protocol_fee_recipient(registry: &ClaimRegistry): address {
        registry.protocol_fee_recipient
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
