/// Market: Handles staking, position tracking, and payouts
module truth_markets::market {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use truth_markets::claim_registry::{Self, Claim};

    /// Errors
    const EInvalidAmount: u64 = 0;
    const EClaimNotResolved: u64 = 1;
    const EAlreadyClaimed: u64 = 2;
    const ENoWinnings: u64 = 3;
    const EInvalidClaim: u64 = 4;

    /// Position tracking for a user on a specific claim
    public struct Position has key, store {
        id: UID,
        claim_id: ID,
        user: address,
        yes_amount: u64,
        no_amount: u64,
        claimed: bool,
    }

    /// Market state for a claim
    public struct MarketState has key {
        id: UID,
        claim_id: ID,
        /// Map of user address to position ID
        positions: Table<address, ID>,
        total_positions: u64,
    }

    /// Events
    public struct StakePlaced has copy, drop {
        claim_id: ID,
        user: address,
        is_yes: bool,
        amount: u64,
    }

    public struct WinningsClaimed has copy, drop {
        claim_id: ID,
        user: address,
        payout: u64,
    }

    /// Create market state for a claim
    public entry fun create_market(
        claim_id: ID,
        ctx: &mut TxContext,
    ) {
        let market = MarketState {
            id: object::new(ctx),
            claim_id,
            positions: table::new(ctx),
            total_positions: 0,
        };
        transfer::share_object(market);
    }

    /// Stake on YES or NO
    public entry fun stake(
        claim: &mut Claim,
        market: &mut MarketState,
        payment: Coin<SUI>,
        is_yes: bool,
        ctx: &mut TxContext,
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, EInvalidAmount);
        assert!(claim_registry::get_status(claim) == 0, EInvalidClaim); // STATUS_OPEN

        let user = tx_context::sender(ctx);
        let claim_id = object::id(claim);

        // Add stake to claim escrow
        claim_registry::add_stake(claim, payment, is_yes);

        // Update or create position
        if (table::contains(&market.positions, user)) {
            let position_id = *table::borrow(&market.positions, user);
            let position = object::id_to_address(&position_id);
            // Note: In production, we'd fetch and update the position object
            // For MVP, we'll create a new position each time (simplified)
        };

        // Create new position
        let position = Position {
            id: object::new(ctx),
            claim_id,
            user,
            yes_amount: if (is_yes) amount else 0,
            no_amount: if (is_yes) 0 else amount,
            claimed: false,
        };

        let position_id = object::uid_to_inner(&position.id);
        table::add(&mut market.positions, user, position_id);
        market.total_positions = market.total_positions + 1;

        event::emit(StakePlaced {
            claim_id,
            user,
            is_yes,
            amount,
        });

        transfer::transfer(position, user);
    }

    /// Claim winnings after resolution
    public entry fun claim_winnings(
        claim: &mut Claim,
        position: &mut Position,
        ctx: &mut TxContext,
    ) {
        assert!(claim_registry::is_resolved(claim), EClaimNotResolved);
        assert!(!position.claimed, EAlreadyClaimed);
        assert!(position.user == tx_context::sender(ctx), EInvalidClaim);

        let result = claim_registry::get_result(claim);
        assert!(std::option::is_some(&result), EClaimNotResolved);

        let won = *std::option::borrow(&result);
        let user_stake = if (won) position.yes_amount else position.no_amount;
        
        assert!(user_stake > 0, ENoWinnings);

        // Calculate payout
        let yes_stake = claim_registry::get_yes_stake(claim);
        let no_stake = claim_registry::get_no_stake(claim);
        let total_stake = yes_stake + no_stake;
        let winning_stake = if (won) yes_stake else no_stake;
        let losing_stake = if (won) no_stake else yes_stake;

        // Payout = user_stake + (user_stake / winning_stake) * losing_stake * (1 - fees)
        let creator_fee_bps = claim_registry::get_creator_fee_bps(claim);
        let protocol_fee_bps = claim_registry::get_protocol_fee_bps(claim);
        let total_fee_bps = creator_fee_bps + protocol_fee_bps;

        let user_share = (user_stake * 10000) / winning_stake; // basis points
        let winnings_from_losers = (losing_stake * user_share) / 10000;
        let fees = (winnings_from_losers * total_fee_bps) / 10000;
        let net_winnings = winnings_from_losers - fees;
        
        let total_payout = user_stake + net_winnings;

        // Withdraw from escrow
        let payout_coin = claim_registry::withdraw_escrow(claim, total_payout, ctx);
        
        position.claimed = true;

        event::emit(WinningsClaimed {
            claim_id: object::id(claim),
            user: position.user,
            payout: total_payout,
        });

        transfer::public_transfer(payout_coin, position.user);
    }

    /// Claim refund if claim was cancelled
    public entry fun claim_refund(
        claim: &mut Claim,
        position: &mut Position,
        ctx: &mut TxContext,
    ) {
        assert!(claim_registry::get_status(claim) == 3, EInvalidClaim); // STATUS_CANCELLED
        assert!(!position.claimed, EAlreadyClaimed);
        assert!(position.user == tx_context::sender(ctx), EInvalidClaim);

        let refund_amount = position.yes_amount + position.no_amount;
        assert!(refund_amount > 0, ENoWinnings);

        let refund_coin = claim_registry::withdraw_escrow(claim, refund_amount, ctx);
        position.claimed = true;

        transfer::public_transfer(refund_coin, position.user);
    }

    // === Getters ===

    public fun get_position_yes_amount(position: &Position): u64 { position.yes_amount }
    public fun get_position_no_amount(position: &Position): u64 { position.no_amount }
    public fun is_position_claimed(position: &Position): bool { position.claimed }
}
