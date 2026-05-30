//! Telemetry Server — Real-time HTTP API for swarm state monitoring.
//!
//! Serves live JSON state at http://0.0.0.0:3402/ for the dashboard frontend.
//! This is the "live-stream/transparency execution" requirement for the hackathon.
//!
//! Endpoints:
//!   GET /           → Full swarm state (all symbols, latest verdicts, pipeline metrics)
//!   GET /health     → Health check + uptime
//!   GET /verdicts   → Latest trade verdicts only
//!   GET /regime     → Current market regime per symbol
//!   GET /paper      → Paper trading PnL + stats

use axum::{routing::get, Json, Router, middleware::{self, Next}, response::Response, http::Request};
use axum::body::Body;
use serde::Serialize;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Telemetry port — 3402 (x402 reference).
pub const TELEMETRY_PORT: u16 = 3402;

/// Live swarm telemetry state — updated after each decision cycle.
#[derive(Debug, Clone, Serialize, Default)]
pub struct TelemetryState {
    pub version: &'static str,
    pub uptime_secs: u64,
    pub cycle: u64,
    pub symbols: Vec<SymbolTelemetry>,
    pub paper_stats: Option<PaperStats>,
    pub benchmark: Option<BenchmarkTelemetry>,
    pub pipeline: &'static str,
    pub agent_id: u64,
    pub chain_id: u64,
    pub registry_address: &'static str,
}

/// Per-symbol telemetry snapshot.
#[derive(Debug, Clone, Serialize, Default)]
pub struct SymbolTelemetry {
    pub symbol: String,
    pub price: f64,
    pub price_change_24h: f64,
    pub regime: String,
    pub regime_confidence: f64,
    pub verdict: String,
    pub score: f64,
    pub confidence: f64,
    pub volume_24h: f64,
    pub buy_sell_ratio: f64,
    pub liquidity_usd: f64,
    pub on_chain_logged: bool,
}

/// Paper trading stats for telemetry.
#[derive(Debug, Clone, Serialize, Default)]
pub struct PaperStats {
    pub total_trades: u64,
    pub win_rate: f64,
    pub total_pnl: f64,
    pub max_drawdown: f64,
    pub balance: f64,
}

/// AI vs Human benchmark telemetry.
#[derive(Debug, Clone, Serialize, Default)]
pub struct BenchmarkTelemetry {
    pub total_cycles: u64,
    pub agreements: u64,
    pub agreement_rate: f64,
    pub ai_avg_confidence: f64,
}

/// Shared telemetry state handle.
pub type TelemetryHandle = Arc<RwLock<TelemetryState>>;

/// Create a new telemetry handle with default state.
pub fn new_handle() -> TelemetryHandle {
    Arc::new(RwLock::new(TelemetryState {
        version: "v4.1-onchain",
        pipeline: "Data→Regime→Debate→ML→Recall→Judge→PreTrade→Entry→Consensus→Risk→Paper→Journal→Chain",
        agent_id: 1,
        chain_id: 5000,
        registry_address: "0xFA0b5036aF9770B370B33CeBBb42d1E626338383",
        ..Default::default()
    }))
}

/// Spawn the telemetry HTTP server on a background task.
pub fn spawn_server(handle: TelemetryHandle) {
    tokio::spawn(async move {
        let h1 = handle.clone();
        let h2 = handle.clone();
        let h3 = handle.clone();
        let h4 = handle.clone();
        let h5 = handle.clone();

        // CORS middleware for cross-origin dashboard access
        async fn cors_middleware(req: Request<Body>, next: Next) -> Response {
            let mut resp = next.run(req).await;
            resp.headers_mut().insert("access-control-allow-origin", "*".parse().unwrap());
            resp.headers_mut().insert("access-control-allow-methods", "GET".parse().unwrap());
            resp
        }

        let app = Router::new()
            .layer(middleware::from_fn(cors_middleware))
            .route("/", get(move || {
                let h = h1.clone();
                async move {
                    let state = h.read().await;
                    Json(state.clone())
                }
            }))
            .route("/health", get(move || {
                let h = h2.clone();
                async move {
                    let state = h.read().await;
                    Json(serde_json::json!({
                        "status": "ok",
                        "version": state.version,
                        "uptime_secs": state.uptime_secs,
                        "cycle": state.cycle,
                        "symbols_tracked": state.symbols.len(),
                    }))
                }
            }))
            .route("/verdicts", get(move || {
                let h = h3.clone();
                async move {
                    let state = h.read().await;
                    let verdicts: Vec<_> = state.symbols.iter().map(|s| {
                        serde_json::json!({
                            "symbol": s.symbol,
                            "verdict": s.verdict,
                            "score": s.score,
                            "confidence": s.confidence,
                            "regime": s.regime,
                        })
                    }).collect();
                    Json(verdicts)
                }
            }))
            .route("/regime", get(move || {
                let h = h4.clone();
                async move {
                    let state = h.read().await;
                    let regimes: Vec<_> = state.symbols.iter().map(|s| {
                        serde_json::json!({
                            "symbol": s.symbol,
                            "regime": s.regime,
                            "confidence": s.regime_confidence,
                            "price": s.price,
                        })
                    }).collect();
                    Json(regimes)
                }
            }))
            .route("/benchmark", get(move || {
                let h = h5.clone();
                async move {
                    let state = h.read().await;
                    Json(state.benchmark.clone().unwrap_or_default())
                }
            }));

        let addr = format!("0.0.0.0:{}", TELEMETRY_PORT);
        tracing::info!("📡 Telemetry server: http://{}", addr);

        let listener = tokio::net::TcpListener::bind(&addr).await
            .expect("Failed to bind telemetry port");
        axum::serve(listener, app).await
            .expect("Telemetry server crashed");
    });
}
