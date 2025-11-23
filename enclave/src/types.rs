use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimSpec {
    /// Sui claim object ID
    pub claim_id: String,
    
    /// Type of claim (e.g., "weather_threshold", "price_threshold")
    pub claim_type: String,
    
    /// Human-readable description
    pub description: String,
    
    /// Claim-specific parameters
    pub params: ClaimParams,
    
    /// Data sources to query
    pub sources: Vec<DataSource>,
    
    /// Aggregation method
    pub aggregator: String,
    
    /// Deadline timestamp (ISO 8601)
    pub deadline: String,
    
    /// Version/hash of the resolution policy
    pub policy_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ClaimParams {
    WeatherThreshold(WeatherThresholdParams),
    PriceThreshold(PriceThresholdParams),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeatherThresholdParams {
    /// Latitude
    pub latitude: f64,
    
    /// Longitude
    pub longitude: f64,
    
    /// Location name (for display)
    pub location: String,
    
    /// Metric to check (e.g., "temperature_2m", "precipitation")
    pub metric: String,
    
    /// Comparison operator (">", "<", ">=", "<=", "==")
    pub operator: String,
    
    /// Threshold value
    pub threshold: f64,
    
    /// Time window in minutes around deadline
    pub time_window_minutes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceThresholdParams {
    pub symbol: String,
    pub operator: String,
    pub threshold: f64,
    pub time_window_minutes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSource {
    /// Source name (e.g., "open-meteo", "meteostat")
    pub name: String,
    
    /// API endpoint template
    pub url_template: String,
    
    /// JSONPath or extraction method
    pub extraction_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolutionResult {
    /// Claim ID
    pub claim_id: String,
    
    /// Final verdict (true = YES, false = NO)
    pub verdict: bool,
    
    /// Individual source responses
    pub source_responses: Vec<SourceResponse>,
    
    /// Aggregated value
    pub aggregated_value: f64,
    
    /// Threshold used
    pub threshold: f64,
    
    /// Operator used
    pub operator: String,
    
    /// Resolution timestamp (ISO 8601)
    pub resolved_at: String,
    
    /// Enclave measurement (PCR0)
    pub enclave_measurement: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceResponse {
    /// Source name
    pub source: String,
    
    /// Extracted value
    pub value: f64,
    
    /// Timestamp of data point
    pub timestamp: String,
    
    /// Raw response (truncated for storage)
    pub raw_response: Option<String>,
    
    /// Success status
    pub success: bool,
    
    /// Error message if failed
    pub error: Option<String>,
}
