use crate::types::{ClaimSpec, ResolutionResult};
use anyhow::Result;
use sha2::{Digest, Sha256};

/// Generate attestation document for a resolution result
/// In production, this would use AWS Nitro Enclaves NSM to generate a signed attestation
pub fn generate_attestation(
    claim_spec: &ClaimSpec,
    result: &ResolutionResult,
) -> Result<Vec<u8>> {
    // In production:
    // 1. Get PCR0 (enclave measurement) from NSM
    // 2. Create attestation document with claim_id, result, timestamp
    // 3. Sign with enclave private key
    // 4. Include NSM attestation document
    
    // For MVP, create a simple mock attestation
    let measurement = get_mock_measurement();
    let timestamp = chrono::Utc::now().timestamp_millis() as u64;
    
    // Create payload to sign: claim_id || result || timestamp
    let mut payload = Vec::new();
    payload.extend_from_slice(claim_spec.claim_id.as_bytes());
    payload.push(if result.verdict { 1 } else { 0 });
    payload.extend_from_slice(&timestamp.to_le_bytes());
    
    // Hash the payload
    let hash = Sha256::digest(&payload);
    
    // Mock signature (in production, use ed25519 with enclave key)
    let signature = mock_sign(&hash);
    
    // Serialize attestation: measurement (32 bytes) || timestamp (8 bytes) || signature (64 bytes)
    let mut attestation = Vec::new();
    attestation.extend_from_slice(&measurement);
    attestation.extend_from_slice(&timestamp.to_le_bytes());
    attestation.extend_from_slice(&signature);
    
    println!("Generated attestation:");
    println!("  Measurement: {}", hex::encode(&measurement));
    println!("  Timestamp: {}", timestamp);
    println!("  Signature: {}", hex::encode(&signature));
    println!("  Total size: {} bytes", attestation.len());
    
    Ok(attestation)
}

fn get_mock_measurement() -> [u8; 32] {
    // In production, get from NSM:
    // let nsm_fd = nsm_driver::nsm_init();
    // let nsm_response = nsm_driver::nsm_get_attestation_doc(nsm_fd, ...);
    // extract PCR0 from response
    
    // For MVP, return a fixed mock measurement
    // This should match what's whitelisted in the attestation registry
    [0u8; 32]
}

fn mock_sign(hash: &[u8]) -> [u8; 64] {
    // In production, use ed25519-dalek to sign with enclave private key
    // let keypair = Keypair::from_bytes(&enclave_private_key)?;
    // let signature = keypair.sign(hash);
    
    // For MVP, return a mock signature
    let mut sig = [0u8; 64];
    sig[..32].copy_from_slice(hash);
    sig
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ClaimParams, WeatherThresholdParams, SourceResponse};

    #[test]
    fn test_generate_attestation() {
        let spec = ClaimSpec {
            claim_id: "test_claim_123".to_string(),
            claim_type: "weather_threshold".to_string(),
            description: "Test claim".to_string(),
            params: ClaimParams::WeatherThreshold(WeatherThresholdParams {
                latitude: 51.5074,
                longitude: -0.1278,
                location: "London".to_string(),
                metric: "temperature_2m".to_string(),
                operator: ">".to_string(),
                threshold: 10.0,
                time_window_minutes: 10,
            }),
            sources: vec![],
            aggregator: "median".to_string(),
            deadline: "2025-11-15T12:00:00Z".to_string(),
            policy_version: "v1".to_string(),
        };

        let result = ResolutionResult {
            claim_id: "test_claim_123".to_string(),
            verdict: true,
            source_responses: vec![],
            aggregated_value: 15.0,
            threshold: 10.0,
            operator: ">".to_string(),
            resolved_at: "2025-11-15T12:00:00Z".to_string(),
            enclave_measurement: "0".repeat(64),
        };

        let attestation = generate_attestation(&spec, &result).unwrap();
        
        // Should be 32 (measurement) + 8 (timestamp) + 64 (signature) = 104 bytes
        assert_eq!(attestation.len(), 104);
    }
}
