mod weather;
mod attestation;
mod types;

use anyhow::Result;
use std::env;
use types::{ClaimSpec, ResolutionResult};

#[tokio::main]
async fn main() -> Result<()> {
    println!("Truth Markets Oracle - Nautilus TEE");
    
    // Get claim spec blob ID from environment or args
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: {} <claim_spec_blob_id>", args[0]);
        std::process::exit(1);
    }
    
    let spec_blob_id = &args[1];
    
    // 1. Fetch claim spec from Walrus
    println!("Fetching claim spec from Walrus: {}", spec_blob_id);
    let claim_spec = fetch_claim_spec(spec_blob_id).await?;
    
    // 2. Verify claim type and execute resolution
    println!("Resolving claim: {}", claim_spec.description);
    let result = match claim_spec.claim_type.as_str() {
        "weather_threshold" => weather::resolve_weather_claim(&claim_spec).await?,
        _ => {
            anyhow::bail!("Unsupported claim type: {}", claim_spec.claim_type);
        }
    };
    
    // 3. Generate attestation
    println!("Generating attestation...");
    let attestation = attestation::generate_attestation(&claim_spec, &result)?;
    
    // 4. Upload result to Walrus
    println!("Uploading result to Walrus...");
    let result_blob_id = upload_result_to_walrus(&result).await?;
    
    // 5. Submit to Sui blockchain
    println!("Submitting attested resolution to Sui...");
    submit_to_sui(&claim_spec, &result, &result_blob_id, &attestation).await?;
    
    println!("✓ Claim resolved successfully!");
    println!("  Result: {}", if result.verdict { "YES" } else { "NO" });
    println!("  Result Blob ID: {}", result_blob_id);
    
    Ok(())
}

async fn fetch_claim_spec(blob_id: &str) -> Result<ClaimSpec> {
    // In production, fetch from Walrus using walrus CLI or HTTP API
    // For MVP, we'll read from a local file or environment
    
    let walrus_url = env::var("WALRUS_AGGREGATOR_URL")
        .unwrap_or_else(|_| "https://aggregator.walrus-testnet.walrus.space".to_string());
    
    let url = format!("{}/v1/{}", walrus_url, blob_id);
    let response = reqwest::get(&url).await?;
    
    if !response.status().is_success() {
        anyhow::bail!("Failed to fetch claim spec: {}", response.status());
    }
    
    let spec: ClaimSpec = response.json().await?;
    Ok(spec)
}

async fn upload_result_to_walrus(result: &ResolutionResult) -> Result<String> {
    let json = serde_json::to_string_pretty(result)?;
    
    // Write result to temporary file
    let temp_file = "/tmp/resolution_result.json";
    std::fs::write(temp_file, &json)?;
    
    println!("Uploading result to Walrus...");
    
    // Use Walrus CLI to upload
    let output = std::process::Command::new("walrus")
        .args(&["store", temp_file])
        .output()?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Walrus upload failed: {}", error);
    }
    
    // Parse blob ID from output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let blob_id = stdout
        .lines()
        .find(|line| line.contains("Blob ID:"))
        .and_then(|line| line.split("Blob ID:").nth(1))
        .map(|s| s.trim().to_string())
        .ok_or_else(|| anyhow::anyhow!("Failed to parse blob ID from Walrus output"))?;
    
    println!("✓ Uploaded to Walrus: {}", blob_id);
    
    // Clean up temp file
    let _ = std::fs::remove_file(temp_file);
    
    Ok(blob_id)
}

async fn submit_to_sui(
    claim_spec: &ClaimSpec,
    result: &ResolutionResult,
    result_blob_id: &str,
    attestation: &[u8],
) -> Result<()> {
    println!("Submitting to Sui:");
    println!("  Claim ID: {}", claim_spec.claim_id);
    println!("  Result: {}", result.verdict);
    println!("  Result Blob ID: {}", result_blob_id);
    println!("  Attestation length: {} bytes", attestation.len());
    
    // Use Sui CLI to submit transaction
    let package_id = env::var("PACKAGE_ID")?;
    let measurement_registry_id = env::var("MEASUREMENT_REGISTRY_ID")?;
    let attestation_hex = hex::encode(attestation);
    
    let output = std::process::Command::new("sui")
        .args(&[
            "client",
            "call",
            "--package", &package_id,
            "--module", "attestation",
            "--function", "submit_attested_resolution",
            "--args",
            &measurement_registry_id,
            &claim_spec.claim_id,
            &result.verdict.to_string(),
            result_blob_id,
            &format!("0x{}", attestation_hex),
            "0x6", // Clock object ID
            "--gas-budget", "10000000",
        ])
        .output()?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Sui transaction failed: {}", error);
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    println!("✓ Transaction submitted successfully");
    println!("{}", stdout);
    
    Ok(())
}
