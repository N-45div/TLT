use crate::types::{ClaimParams, ClaimSpec, ResolutionResult, SourceResponse, WeatherThresholdParams};
use anyhow::Result;
use chrono::{DateTime, Utc};
use serde_json::Value;

pub async fn resolve_weather_claim(spec: &ClaimSpec) -> Result<ResolutionResult> {
    let params = match &spec.params {
        ClaimParams::WeatherThreshold(p) => p,
        _ => anyhow::bail!("Invalid params for weather claim"),
    };

    println!("Resolving weather claim:");
    println!("  Location: {} ({}, {})", params.location, params.latitude, params.longitude);
    println!("  Metric: {}", params.metric);
    println!("  Condition: {} {} {}", params.metric, params.operator, params.threshold);

    // Fetch data from all sources
    let mut responses = Vec::new();
    
    for source in &spec.sources {
        println!("Querying source: {}", source.name);
        match fetch_weather_data(params, source).await {
            Ok(response) => responses.push(response),
            Err(e) => {
                eprintln!("Failed to fetch from {}: {}", source.name, e);
                responses.push(SourceResponse {
                    source: source.name.clone(),
                    value: 0.0,
                    timestamp: Utc::now().to_rfc3339(),
                    raw_response: None,
                    success: false,
                    error: Some(e.to_string()),
                });
            }
        }
    }

    // Aggregate successful responses
    let successful: Vec<&SourceResponse> = responses.iter()
        .filter(|r| r.success)
        .collect();

    if successful.is_empty() {
        anyhow::bail!("No successful responses from any source");
    }

    let aggregated_value = match spec.aggregator.as_str() {
        "median" => calculate_median(&successful),
        "mean" => calculate_mean(&successful),
        "majority" => calculate_majority(&successful, params),
        _ => anyhow::bail!("Unsupported aggregator: {}", spec.aggregator),
    };

    println!("Aggregated value: {}", aggregated_value);

    // Evaluate condition
    let verdict = evaluate_condition(
        aggregated_value,
        &params.operator,
        params.threshold,
    )?;

    println!("Verdict: {}", if verdict { "YES" } else { "NO" });

    Ok(ResolutionResult {
        claim_id: spec.claim_id.clone(),
        verdict,
        source_responses: responses,
        aggregated_value,
        threshold: params.threshold,
        operator: params.operator.clone(),
        resolved_at: Utc::now().to_rfc3339(),
        enclave_measurement: get_enclave_measurement(),
    })
}

async fn fetch_weather_data(
    params: &WeatherThresholdParams,
    source: &crate::types::DataSource,
) -> Result<SourceResponse> {
    let url = build_url(&source.url_template, params)?;
    
    println!("  Fetching: {}", url);
    
    let response = reqwest::get(&url).await?;
    
    if !response.status().is_success() {
        anyhow::bail!("HTTP error: {}", response.status());
    }
    
    let body = response.text().await?;
    let json: Value = serde_json::from_str(&body)?;
    
    // Extract value using JSONPath (simplified)
    let value = extract_value(&json, &source.extraction_path)?;
    
    Ok(SourceResponse {
        source: source.name.clone(),
        value,
        timestamp: Utc::now().to_rfc3339(),
        raw_response: Some(truncate_response(&body, 500)),
        success: true,
        error: None,
    })
}

fn build_url(template: &str, params: &WeatherThresholdParams) -> Result<String> {
    // Parse deadline to get target time
    let deadline: DateTime<Utc> = chrono::DateTime::parse_from_rfc3339(&get_deadline_iso())?
        .with_timezone(&Utc);
    
    let url = template
        .replace("{latitude}", &params.latitude.to_string())
        .replace("{longitude}", &params.longitude.to_string())
        .replace("{date}", &deadline.format("%Y-%m-%d").to_string())
        .replace("{hour}", &deadline.format("%H").to_string());
    
    Ok(url)
}

fn extract_value(json: &Value, path: &str) -> Result<f64> {
    // Simplified JSONPath extraction
    // In production, use a proper JSONPath library
    
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = json;
    
    for part in parts {
        if part.starts_with('[') && part.ends_with(']') {
            // Array index
            let index: usize = part[1..part.len()-1].parse()?;
            current = current.get(index)
                .ok_or_else(|| anyhow::anyhow!("Index out of bounds: {}", index))?;
        } else {
            // Object key
            current = current.get(part)
                .ok_or_else(|| anyhow::anyhow!("Key not found: {}", part))?;
        }
    }
    
    match current {
        Value::Number(n) => Ok(n.as_f64().unwrap_or(0.0)),
        Value::String(s) => s.parse::<f64>()
            .map_err(|e| anyhow::anyhow!("Failed to parse number: {}", e)),
        _ => anyhow::bail!("Value is not a number"),
    }
}

fn calculate_median(responses: &[&SourceResponse]) -> f64 {
    let mut values: Vec<f64> = responses.iter().map(|r| r.value).collect();
    values.sort_by(|a, b| a.partial_cmp(b).unwrap());
    
    let len = values.len();
    if len % 2 == 0 {
        (values[len / 2 - 1] + values[len / 2]) / 2.0
    } else {
        values[len / 2]
    }
}

fn calculate_mean(responses: &[&SourceResponse]) -> f64 {
    let sum: f64 = responses.iter().map(|r| r.value).sum();
    sum / responses.len() as f64
}

fn calculate_majority(responses: &[&SourceResponse], params: &WeatherThresholdParams) -> f64 {
    // For boolean conditions, return 1.0 if majority pass, 0.0 otherwise
    let passing = responses.iter()
        .filter(|r| {
            evaluate_condition(r.value, &params.operator, params.threshold).unwrap_or(false)
        })
        .count();
    
    if passing > responses.len() / 2 {
        params.threshold + 1.0 // Ensure it passes
    } else {
        params.threshold - 1.0 // Ensure it fails
    }
}

fn evaluate_condition(value: f64, operator: &str, threshold: f64) -> Result<bool> {
    let result = match operator {
        ">" => value > threshold,
        "<" => value < threshold,
        ">=" => value >= threshold,
        "<=" => value <= threshold,
        "==" => (value - threshold).abs() < 0.001,
        _ => anyhow::bail!("Unsupported operator: {}", operator),
    };
    Ok(result)
}

fn get_enclave_measurement() -> String {
    // In production, get actual PCR0 from AWS Nitro Enclaves NSM
    // For MVP, return a mock measurement
    "0".repeat(64) // 32 bytes in hex
}

fn get_deadline_iso() -> String {
    // In production, parse from claim spec
    // For MVP, use current time
    Utc::now().to_rfc3339()
}

fn truncate_response(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}... (truncated)", &s[..max_len])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_evaluate_condition() {
        assert!(evaluate_condition(15.0, ">", 10.0).unwrap());
        assert!(!evaluate_condition(5.0, ">", 10.0).unwrap());
        assert!(evaluate_condition(10.0, ">=", 10.0).unwrap());
        assert!(evaluate_condition(5.0, "<", 10.0).unwrap());
    }

    #[test]
    fn test_median() {
        let responses = vec![
            SourceResponse {
                source: "a".to_string(),
                value: 10.0,
                timestamp: "".to_string(),
                raw_response: None,
                success: true,
                error: None,
            },
            SourceResponse {
                source: "b".to_string(),
                value: 20.0,
                timestamp: "".to_string(),
                raw_response: None,
                success: true,
                error: None,
            },
            SourceResponse {
                source: "c".to_string(),
                value: 15.0,
                timestamp: "".to_string(),
                raw_response: None,
                success: true,
                error: None,
            },
        ];
        let refs: Vec<&SourceResponse> = responses.iter().collect();
        assert_eq!(calculate_median(&refs), 15.0);
    }
}
