mod config;
mod engine;
mod network;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("[Sentiment Oracle] GIGANTOMANIA Vector 4 Online.");
    println!("[Sentiment Oracle] Establishing connection to Gamma API (gamma-api.polymarket.com)...");

    network::run_oracle_loop().await;

    Ok(())
}
