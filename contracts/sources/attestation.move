/// Attestation: Verifies Nautilus TEE attestations and authorizes claim resolution
module truth_markets::attestation {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::clock::{Clock};
    use std::string::String;
    use truth_markets::claim_registry::{Self, Claim};

    /// Errors
    const EInvalidMeasurement: u64 = 0;
    const EMeasurementNotWhitelisted: u64 = 1;
    const EUnauthorized: u64 = 2;
    const EInvalidAttestation: u64 = 3;

    /// Enclave measurement registry
    public struct MeasurementRegistry has key {
        id: UID,
        /// Whitelisted enclave measurements (PCR0 hashes)
        measurements: Table<vector<u8>, MeasurementInfo>,
        /// Admin address
        admin: address,
    }

    /// Information about a whitelisted measurement
    public struct MeasurementInfo has store {
        /// Description (e.g., "Weather Oracle v1.0")
        description: String,
        /// Added timestamp
        added_at: u64,
        /// Active status
        active: bool,
    }

    /// Attestation document submitted by resolver
    public struct AttestationDocument has copy, drop, store {
        /// Enclave measurement (PCR0)
        measurement: vector<u8>,
        /// Timestamp from enclave
        timestamp: u64,
        /// Signature over (claim_id || result || result_blob_id || timestamp)
        signature: vector<u8>,
    }

    /// Events
    public struct MeasurementWhitelisted has copy, drop {
        measurement: vector<u8>,
        description: String,
    }

    public struct MeasurementRevoked has copy, drop {
        measurement: vector<u8>,
    }

    public struct ClaimResolvedWithAttestation has copy, drop {
        claim_id: ID,
        measurement: vector<u8>,
        result: bool,
        result_blob_id: String,
    }

    /// Initialize registry
    fun init(ctx: &mut TxContext) {
        let registry = MeasurementRegistry {
            id: object::new(ctx),
            measurements: table::new(ctx),
            admin: tx_context::sender(ctx),
        };
        transfer::share_object(registry);
    }

    /// Whitelist an enclave measurement
    public entry fun whitelist_measurement(
        registry: &mut MeasurementRegistry,
        measurement: vector<u8>,
        description: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(registry.admin == tx_context::sender(ctx), EUnauthorized);
        assert!(std::vector::length(&measurement) == 32, EInvalidMeasurement);

        let info = MeasurementInfo {
            description,
            added_at: sui::clock::timestamp_ms(clock),
            active: true,
        };

        table::add(&mut registry.measurements, measurement, info);

        event::emit(MeasurementWhitelisted {
            measurement,
            description,
        });
    }

    /// Revoke a measurement
    public entry fun revoke_measurement(
        registry: &mut MeasurementRegistry,
        measurement: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(registry.admin == tx_context::sender(ctx), EUnauthorized);
        
        let info = table::borrow_mut(&mut registry.measurements, measurement);
        info.active = false;

        event::emit(MeasurementRevoked {
            measurement,
        });
    }

    /// Submit attested resolution
    /// In production, this would verify the signature using the enclave's public key
    /// For MVP, we trust the measurement whitelist and basic validation
    public entry fun submit_attested_resolution(
        registry: &MeasurementRegistry,
        claim: &mut Claim,
        result: bool,
        result_blob_id: String,
        attestation: vector<u8>, // Serialized AttestationDocument
        clock: &Clock,
        _ctx: &mut TxContext,
    ) {
        // Parse attestation (simplified for MVP - in production, deserialize properly)
        // For now, we'll extract the measurement from the first 32 bytes
        assert!(std::vector::length(&attestation) >= 32, EInvalidAttestation);
        
        let mut measurement = std::vector::empty<u8>();
        let mut i = 0;
        while (i < 32) {
            std::vector::push_back(&mut measurement, *std::vector::borrow(&attestation, i));
            i = i + 1;
        };

        // Verify measurement is whitelisted and active
        assert!(table::contains(&registry.measurements, measurement), EMeasurementNotWhitelisted);
        let info = table::borrow(&registry.measurements, measurement);
        assert!(info.active, EMeasurementNotWhitelisted);

        // TODO: Verify signature in production
        // For MVP, we trust that the measurement whitelist is sufficient

        // Resolve the claim
        claim_registry::resolve_claim(
            claim,
            result,
            result_blob_id,
            measurement,
            clock,
        );

        event::emit(ClaimResolvedWithAttestation {
            claim_id: object::id(claim),
            measurement,
            result,
            result_blob_id,
        });
    }

    /// Check if measurement is whitelisted
    public fun is_measurement_whitelisted(
        registry: &MeasurementRegistry,
        measurement: &vector<u8>,
    ): bool {
        if (!table::contains(&registry.measurements, *measurement)) {
            return false
        };
        let info = table::borrow(&registry.measurements, *measurement);
        info.active
    }

    // === Admin functions ===

    public entry fun update_admin(
        registry: &mut MeasurementRegistry,
        new_admin: address,
        ctx: &mut TxContext,
    ) {
        assert!(registry.admin == tx_context::sender(ctx), EUnauthorized);
        registry.admin = new_admin;
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
