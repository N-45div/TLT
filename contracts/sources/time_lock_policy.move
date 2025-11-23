/// Time-lock encryption access policy for Seal.
///
/// This module implements a simple Seal `seal_approve` function that
/// allows decryption only after a specified unlock timestamp.
///
/// The key id format follows the official Seal `patterns::tle` example:
///   key-id = [pkg id][bcs::to_bytes(T)] where T is a u64 timestamp (ms).
module truth_markets::time_lock_policy {
    use sui::{bcs::{Self, BCS}, clock};

    const ENoAccess: u64 = 77;

    /// Check that the provided key id encodes a single u64 timestamp T,
    /// and that the current time has passed T.
    fun check_policy(id: vector<u8>, c: &clock::Clock): bool {
        let mut prepared: BCS = bcs::new(id);
        let t = prepared.peel_u64();
        let leftovers = prepared.into_remainder_bytes();

        // Allow decryption only once time T has passed and id had no
        // extra trailing bytes.
        (leftovers.length() == 0) && (c.timestamp_ms() >= t)
    }

    /// Seal access policy entry point called by key servers.
    ///
    /// `id` is the key identity suffix (without the pkg id prefix).
    /// `c` is the onchain Clock object used to check current time.
    entry fun seal_approve(id: vector<u8>, c: &clock::Clock) {
        assert!(check_policy(id, c), ENoAccess);
    }
}
