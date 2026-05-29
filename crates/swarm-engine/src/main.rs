//! Swarm Engine — The Convergence Point
//!
//! This is where four dimensions collide into one universe:
//!   Ouroboros (LLM Brain) + Titan (Trading Core) +
//!   Hive Mind (Intelligence) + Mantle (On-Chain)
//!
//! Pipeline: Data → Brain → Judge → Consensus → Execute → Learn

use ouroboros_brain::{
    config::{load_models, load_prompts, ModelsFile, PromptsFile},
    judge::{chief_judge_v2, load_thresholds, JudgeInput, JudgeVerdict, ThresholdsConfig},
    openrouter::{ModelPool, OpenRouterClient},
    state::{ConsensusResult, SymbolData, SwarmState, Verdict},
};
use std::path::PathBuf;
use std::sync::Arc;

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

fn config_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent().unwrap()  // crates/
        .parent().unwrap()  // project root
        .join("config")
}

/// Simulated market data for Mantle tokens.
/// In Phase 2 this will be replaced by live DEX oracle feeds.
fn mock_market_data() -> Vec<SymbolData> {
    vec![
        SymbolData {
            symbol: "MNT".into(),
            price: 0.82,
            price_24h_change: -3.2,
            volume_24h: 45_000_000.0,
            volume_ratio: 1.8,
            funding_rate: -0.0004,
            open_interest: 120_000_000.0,
            oi_change_pct: -2.1,
            timestamp: chrono::Utc::now().timestamp(),
        },
        SymbolData {
            symbol: "WETH".into(),
            price: 2650.0,
            price_24h_change: 1.4,
            volume_24h: 180_000_000.0,
            volume_ratio: 1.2,
            funding_rate: 0.0001,
            open_interest: 890_000_000.0,
            oi_change_pct: 0.8,
            timestamp: chrono::Utc::now().timestamp(),
        },
        SymbolData {
            symbol: "USDC".into(),
            price: 1.0,
            price_24h_change: 0.01,
            volume_24h: 500_000_000.0,
            volume_ratio: 1.0,
            funding_rate: 0.0,
            open_interest: 0.0,
            oi_change_pct: 0.0,
            timestamp: chrono::Utc::now().timestamp(),
        },
    ]
}

// ═══════════════════════════════════════════════════════════
// LLM DEBATE — Bull vs Bear via OpenRouter
// ═══════════════════════════════════════════════════════════

struct DebateResult {
    bull_argument: String,
    bear_argument: String,
    macro_bias: String,
}

async fn run_debate(
    client: &OpenRouterClient,
    debate_pool: &ModelPool,
    prompts: &PromptsFile,
    models: &ModelsFile,
    data: &SymbolData,
) -> DebateResult {
    let data_str = format!(
        "price=${:.4}, 24h_change={:.1}%, funding={:.6}, oi_change={:.1}%, vol_ratio={:.1}x",
        data.price, data.price_24h_change, data.funding_rate, data.oi_change_pct, data.volume_ratio
    );

    let fr_label = if data.funding_rate < -0.0003 {
        "SHORTS PAYING (squeeze brewing)"
    } else if data.funding_rate > 0.0005 {
        "LONGS OVERHEATED"
    } else {
        "neutral"
    };

    // Bull debate
    let bull_user = prompts.debate.bull.user_template
        .replace("{symbol}", &data.symbol)
        .replace("{data}", &data_str)
        .replace("{alpha_ctx}", "");

    let bull_argument = match client.chat_with_pool(
        debate_pool,
        &prompts.debate.bull.system,
        &bull_user,
        prompts.debate.bull.temperature,
        prompts.debate.bull.max_tokens,
    ).await {
        Ok(response) => {
            tracing::info!("🐂 Bull [{}]: {}", data.symbol, response);
            response
        }
        Err(e) => {
            tracing::warn!("🐂 Bull debate failed: {e}");
            String::new()
        }
    };

    // Bear debate
    let bear_user = prompts.debate.bear.user_template
        .replace("{symbol}", &data.symbol)
        .replace("{data}", &data_str)
        .replace("{alpha_ctx}", "");

    let bear_argument = match client.chat_with_pool(
        debate_pool,
        &prompts.debate.bear.system,
        &bear_user,
        prompts.debate.bear.temperature,
        prompts.debate.bear.max_tokens,
    ).await {
        Ok(response) => {
            tracing::info!("🐻 Bear [{}]: {}", data.symbol, response);
            response
        }
        Err(e) => {
            tracing::warn!("🐻 Bear debate failed: {e}");
            String::new()
        }
    };

    // Macro Judge — independent assessment
    let macro_user = prompts.macro_judge.user_template
        .replace("{symbol}", &data.symbol)
        .replace("{price}", &format!("{:.4}", data.price))
        .replace("{change}", &format!("{:.1}", data.price_24h_change))
        .replace("{fr}", &format!("{:.6}", data.funding_rate))
        .replace("{fr_label}", fr_label)
        .replace("{oi_delta}", &format!("{:.1}", data.oi_change_pct))
        .replace("{vol_surge}", &format!("{:.1}", data.volume_ratio));

    let macro_bias = match client.chat(
        &models.macro_judge_model,
        &prompts.macro_judge.system,
        &macro_user,
        prompts.macro_judge.temperature,
        prompts.macro_judge.max_tokens,
    ).await {
        Ok(response) => {
            let upper = response.to_uppercase();
            let bias = if upper.contains("BUY") || upper.contains("LONG") || upper.contains("BULLISH") {
                "BULLISH"
            } else if upper.contains("SELL") || upper.contains("SHORT") || upper.contains("BEARISH") {
                "BEARISH"
            } else {
                "NEUTRAL"
            };
            tracing::info!("⚖️ Macro Judge [{}]: {} → {}", data.symbol, response, bias);
            bias.to_string()
        }
        Err(e) => {
            tracing::warn!("⚖️ Macro Judge failed: {e}");
            "NEUTRAL".to_string()
        }
    };

    DebateResult { bull_argument, bear_argument, macro_bias }
}

// ═══════════════════════════════════════════════════════════
// MAIN DECISION CYCLE
// ═══════════════════════════════════════════════════════════

async fn decision_cycle(
    client: &OpenRouterClient,
    debate_pool: &ModelPool,
    prompts: &PromptsFile,
    models: &ModelsFile,
    thresholds: &ThresholdsConfig,
    state: &SwarmState,
) {
    let cycle = state.increment_cycle();
    tracing::info!("━━━ CYCLE {} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", cycle);

    if !state.is_trading_allowed() {
        tracing::warn!("🔴 Circuit breaker RED — skipping cycle {}", cycle);
        return;
    }

    let symbols = mock_market_data();

    for data in &symbols {
        // Update state
        state.symbols.insert(data.symbol.clone(), data.clone());

        tracing::info!(
            "📊 {} @ ${:.4} | 24h: {:.1}% | FR: {:.6} | OI: {:.1}%",
            data.symbol, data.price, data.price_24h_change,
            data.funding_rate, data.oi_change_pct
        );

        // Skip stablecoins
        if data.price_24h_change.abs() < 0.05 && data.funding_rate.abs() < 0.00001 {
            tracing::debug!("Skipping {} (stablecoin)", data.symbol);
            continue;
        }

        // Phase 1: LLM Debate
        let debate = run_debate(client, debate_pool, prompts, models, data).await;

        // Phase 2: Judge scoring (15 factors)
        let input = JudgeInput {
            data: data.clone(),
            bull_argument: debate.bull_argument.clone(),
            bear_argument: debate.bear_argument.clone(),
            macro_fresh: debate.macro_bias != "NEUTRAL",
            macro_bias: debate.macro_bias.clone(),
            ..Default::default()
        };

        let verdict: JudgeVerdict = chief_judge_v2(&input, thresholds);

        // Phase 3: Log result
        let emoji = match verdict.decision {
            Verdict::Buy => "🟢",
            Verdict::Sell => "🔴",
            Verdict::Hold => "⚪",
        };

        tracing::info!(
            "{} [{}] VERDICT: {} | Score: {:.2} | Confidence: {:.1}%",
            emoji, data.symbol, verdict.decision, verdict.score, verdict.confidence
        );

        // Store consensus
        state.consensus.insert(data.symbol.clone(), ConsensusResult {
            symbol: data.symbol.clone(),
            final_verdict: verdict.decision,
            confidence: verdict.confidence,
            bull_argument: debate.bull_argument,
            bear_argument: debate.bear_argument,
            macro_bias: debate.macro_bias,
            judge_score: verdict.score,
            meta_agreement: true, // TODO: wire meta_judge in Phase 3
            timestamp: chrono::Utc::now().timestamp(),
        });
    }

    // Summary
    tracing::info!("━━━ CYCLE {} COMPLETE ━━━━━━━━━━━━━━━━━━━━━━━━━━", cycle);
    for entry in state.consensus.iter() {
        let r = entry.value();
        tracing::info!(
            "  {} → {} ({:.1}%) score={:.2}",
            r.symbol, r.final_verdict, r.confidence, r.judge_score
        );
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

#[tokio::main]
async fn main() {
    // Load .env
    dotenvy::dotenv().ok();

    // Init tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "swarm_engine=info,ouroboros_brain=info".into()),
        )
        .init();

    tracing::info!("═══════════════════════════════════════════════");
    tracing::info!("  MANTLE AI SWARM — Multiverse Convergence");
    tracing::info!("  Ouroboros + Titan + Hive Mind + X402 Agents");
    tracing::info!("═══════════════════════════════════════════════");

    // Load configs
    let cfg_dir = config_dir();
    let models = load_models(&cfg_dir.join("models.toml"))
        .expect("Failed to load models.toml");
    let prompts = load_prompts(&cfg_dir.join("prompts.toml"))
        .expect("Failed to load prompts.toml");
    let thresholds = load_thresholds(&cfg_dir.join("thresholds.toml"))
        .expect("Failed to load thresholds.toml");

    // Verify API key
    let api_key = std::env::var("OPENROUTER_API_KEY")
        .expect("OPENROUTER_API_KEY must be set in .env");

    if api_key.is_empty() || api_key.len() < 10 {
        tracing::error!("❌ OPENROUTER_API_KEY is invalid");
        std::process::exit(1);
    }
    tracing::info!("🔑 OpenRouter API key loaded ({}...)", &api_key[..8]);

    // Build client + pools
    let client = OpenRouterClient::new(api_key, &models.defaults);
    let debate_pool = ModelPool::new(
        models.debate_pool.clone(),
        models.defaults.max_failures_before_rotate,
    );

    tracing::info!("🧠 Debate pool: {} models", debate_pool.pool_size());
    tracing::info!("⚖️ Macro Judge: {}", models.macro_judge_model.title);
    tracing::info!("🔮 Meta Judge: {}", models.meta_judge_model.title);

    // Init swarm state
    let state = Arc::new(SwarmState::new());
    tracing::info!("📊 Swarm state initialized");

    // Decision loop
    let cycle_interval = std::time::Duration::from_secs(
        std::env::var("CYCLE_INTERVAL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(60)
    );

    tracing::info!("🚀 Starting decision loop (interval: {}s)", cycle_interval.as_secs());
    tracing::info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    loop {
        decision_cycle(&client, &debate_pool, &prompts, &models, &thresholds, &state).await;

        tracing::info!("💤 Next cycle in {}s...", cycle_interval.as_secs());
        tokio::time::sleep(cycle_interval).await;
    }
}
