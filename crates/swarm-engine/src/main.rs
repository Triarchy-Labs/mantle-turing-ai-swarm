//! Swarm Engine — The Convergence Point
//!
//! This is where four dimensions collide into one universe:
//!   Ouroboros (LLM Brain) + Titan (Trading Core) +
//!   Hive Mind (Intelligence) + X402 Agents
//!
//! Pipeline: Data → Debate → Judge → ML → EntryGate → Consensus → RiskGate → Execute

use ouroboros_brain::{
    config::{load_models, load_prompts, ModelsFile, PromptsFile},
    judge::{chief_judge_v2, load_thresholds, JudgeInput, JudgeVerdict, ThresholdsConfig},
    openrouter::{ModelPool, OpenRouterClient},
    state::{ConsensusResult, SymbolData, SwarmState, Verdict},
};
use titan_core::entry::{EntryConfig, EntryContext, EntryPipeline, EntryVerdict};
use hive_intel::ml_local::{FeatureVector, LocalModel};
use x402_consensus::engine::{Action, AgentVote, PolicyGovernor};
use x402_risk::engine::{KillSwitch, MarketRegime, RiskGate};

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
/// Phase 2: replaced by live DEX oracle feeds.
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
// LLM DEBATE — Bull vs Bear via OpenRouter (Ouroboros)
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
// HIVE MIND: ML Local Prediction (Factor 7)
// ═══════════════════════════════════════════════════════════

fn run_ml_prediction(ml_model: &LocalModel, data: &SymbolData) -> (i32, f64) {
    let features = FeatureVector::from_raw(
        // RSI approximation from price change (real RSI needs candle history)
        50.0 + data.price_24h_change * -3.0, // Inverse: drop → low RSI (oversold)
        data.price_24h_change,
        data.volume_24h,
        data.volume_24h / data.volume_ratio.max(0.01), // Reconstruct avg volume
        data.oi_change_pct / 10.0,  // OBI proxy from OI change
        data.funding_rate.abs() * 100.0, // ATR proxy from funding volatility
        0.55, // Default win_rate (will improve with training)
        0.5,  // Default regime confidence
    );

    let prediction = ml_model.predict(&features);
    let direction = if prediction.probability > 0.6 {
        1 // Bullish
    } else if prediction.probability < 0.4 {
        -1 // Bearish
    } else {
        0 // Neutral
    };

    tracing::info!(
        "🤖 ML [{}]: P(profit)={:.3} confidence={:.3} → {}",
        data.symbol,
        prediction.probability,
        prediction.confidence,
        match direction { 1 => "BULLISH", -1 => "BEARISH", _ => "NEUTRAL" }
    );

    (direction, prediction.confidence)
}

// ═══════════════════════════════════════════════════════════
// TITAN: Entry Pipeline (8-Gate Validation)
// ═══════════════════════════════════════════════════════════

fn run_entry_gate(verdict: &JudgeVerdict, data: &SymbolData) -> bool {
    let side = match verdict.decision {
        Verdict::Buy => "LONG",
        Verdict::Sell => "SHORT",
        Verdict::Hold => return false, // No entry needed
    };

    let ctx = EntryContext {
        daily_loss: 0.0,
        session_limit: 50.0,
        symbol_loss_streak: 0,
        head_position_count: 0,
        global_position_count: 0,
        symbol_already_owned: false,
        verdict: side.to_string(),
        symbol: data.symbol.clone(),
        score: verdict.score,
        btc_score: 0.0, // Phase 2: wire BTC cross-reference
        imbalance_ratio: data.volume_ratio.clamp(0.1, 10.0),
        existing_total_margin: 0.0,
        available_balance: 1000.0,
        new_margin_size: 50.0,
        is_held_by_other_bot: false,
        existing_position_symbols: vec![],
    };

    let entry_verdict = EntryPipeline::evaluate(&ctx, &EntryConfig::default());

    match &entry_verdict {
        EntryVerdict::Approved { side, reason } => {
            tracing::info!("🚪 Entry Gate [{}]: ✅ APPROVED {} ({})", data.symbol, side, reason);
            true
        }
        EntryVerdict::Rejected { gate, reason } => {
            tracing::info!("🚪 Entry Gate [{}]: ❌ REJECTED at {} ({})", data.symbol, gate, reason);
            false
        }
    }
}

// ═══════════════════════════════════════════════════════════
// X402: Consensus Vote (PolicyGovernor)
// ═══════════════════════════════════════════════════════════

fn run_consensus(verdict: &JudgeVerdict, ml_direction: i32, macro_bias: &str) -> (bool, String) {
    let governor = PolicyGovernor::new();

    // Create votes from 3 sub-agents
    let signal_action = match verdict.decision {
        Verdict::Buy => Action::Buy,
        Verdict::Sell => Action::Sell,
        Verdict::Hold => Action::Wait,
    };

    let trend_action = match ml_direction {
        1 => Action::Buy,
        -1 => Action::Sell,
        _ => Action::Wait,
    };

    let regime_action = match macro_bias {
        "BULLISH" => Action::Buy,
        "BEARISH" => Action::Sell,
        _ => Action::Wait,
    };

    let votes = vec![
        AgentVote {
            agent_name: "signal".into(),
            action: signal_action,
            confidence: (verdict.confidence / 100.0).clamp(0.0, 1.0),
            timestamp: 0,
        },
        AgentVote {
            agent_name: "trend".into(),
            action: trend_action,
            confidence: 0.5, // ML confidence is moderate
            timestamp: 0,
        },
        AgentVote {
            agent_name: "regime".into(),
            action: regime_action,
            confidence: 0.6,
            timestamp: 0,
        },
    ];

    let decision = governor.resolve(&votes);

    let emoji = if decision.vetoed { "🛑" } else {
        match decision.action {
            Action::Buy => "✅",
            Action::Sell => "✅",
            Action::Wait => "⏸️",
        }
    };

    tracing::info!(
        "{} Consensus [votes={}]: {} (conf={:.2}) {}",
        emoji, decision.votes_received, decision.action, decision.confidence,
        decision.veto_reason.as_deref().unwrap_or("")
    );

    let approved = !decision.vetoed && decision.action != Action::Wait;
    (approved, format!("{}", decision.action))
}

// ═══════════════════════════════════════════════════════════
// X402: Risk Gate (Kelly + KillSwitch + BucketCap)
// ═══════════════════════════════════════════════════════════

fn run_risk_gate(risk: &RiskGate, symbol: &str) -> Option<f64> {
    match risk.evaluate(symbol, 0.55, 1.0, MarketRegime::Calm) {
        Ok(size) => {
            tracing::info!("💰 Risk Gate [{}]: ✅ Position size=${:.2}", symbol, size);
            Some(size)
        }
        Err(reason) => {
            tracing::info!("💰 Risk Gate [{}]: ❌ {}", symbol, reason);
            None
        }
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN DECISION CYCLE — All 4 dimensions wired
// ═══════════════════════════════════════════════════════════

async fn decision_cycle(
    client: &OpenRouterClient,
    debate_pool: &ModelPool,
    prompts: &PromptsFile,
    models: &ModelsFile,
    thresholds: &ThresholdsConfig,
    state: &SwarmState,
    ml_model: &LocalModel,
    risk: &RiskGate,
) {
    let cycle = state.increment_cycle();
    tracing::info!("━━━ CYCLE {} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", cycle);

    if !state.is_trading_allowed() {
        tracing::warn!("🔴 Circuit breaker RED — skipping cycle {}", cycle);
        return;
    }

    let symbols = mock_market_data();

    for data in &symbols {
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

        // ═══ DIMENSION 1: Ouroboros — LLM Debate ═══
        let debate = run_debate(client, debate_pool, prompts, models, data).await;

        // ═══ DIMENSION 3: Hive Mind — ML Prediction (Factor 7) ═══
        let (ml_direction, ml_confidence) = run_ml_prediction(ml_model, data);

        // ═══ DIMENSION 1: Ouroboros — 15-Factor Judge ═══
        let input = JudgeInput {
            data: data.clone(),
            bull_argument: debate.bull_argument.clone(),
            bear_argument: debate.bear_argument.clone(),
            macro_fresh: debate.macro_bias != "NEUTRAL",
            macro_bias: debate.macro_bias.clone(),
            ml_fresh: true,
            ml_direction,
            ml_confidence,
            ..Default::default()
        };

        let verdict: JudgeVerdict = chief_judge_v2(&input, thresholds);

        let emoji = match verdict.decision {
            Verdict::Buy => "🟢",
            Verdict::Sell => "🔴",
            Verdict::Hold => "⚪",
        };

        tracing::info!(
            "{} Judge [{}]: {} | Score: {:.2} | Confidence: {:.1}%",
            emoji, data.symbol, verdict.decision, verdict.score, verdict.confidence
        );

        // ═══ DIMENSION 2: Titan — Entry Gate (8 gates) ═══
        let entry_approved = run_entry_gate(&verdict, data);

        if !entry_approved {
            state.consensus.insert(data.symbol.clone(), ConsensusResult {
                symbol: data.symbol.clone(),
                final_verdict: verdict.decision,
                confidence: verdict.confidence,
                bull_argument: debate.bull_argument,
                bear_argument: debate.bear_argument,
                macro_bias: debate.macro_bias,
                judge_score: verdict.score,
                meta_agreement: false,
                timestamp: chrono::Utc::now().timestamp(),
            });
            continue;
        }

        // ═══ DIMENSION 4: X402 — Consensus Vote ═══
        let (consensus_ok, _consensus_action) = run_consensus(
            &verdict, ml_direction, &debate.macro_bias,
        );

        // ═══ DIMENSION 4: X402 — Risk Gate ═══
        let position_size = if consensus_ok {
            run_risk_gate(risk, &data.symbol)
        } else {
            tracing::info!("⏸️ Consensus rejected — no risk evaluation needed");
            None
        };

        // ═══ FINAL: Execute or Hold ═══
        if let Some(size) = position_size {
            tracing::info!(
                "🚀 EXECUTE [{}]: {} ${:.2} | Judge={:.2} Confidence={:.1}%",
                data.symbol, verdict.decision, size, verdict.score, verdict.confidence
            );
        }

        // Store result
        state.consensus.insert(data.symbol.clone(), ConsensusResult {
            symbol: data.symbol.clone(),
            final_verdict: verdict.decision,
            confidence: verdict.confidence,
            bull_argument: debate.bull_argument,
            bear_argument: debate.bear_argument,
            macro_bias: debate.macro_bias,
            judge_score: verdict.score,
            meta_agreement: consensus_ok,
            timestamp: chrono::Utc::now().timestamp(),
        });
    }

    // Summary
    tracing::info!("━━━ CYCLE {} COMPLETE ━━━━━━━━━━━━━━━━━━━━━━━━━━", cycle);
    for entry in state.consensus.iter() {
        let r = entry.value();
        let consensus_tag = if r.meta_agreement { "✅" } else { "❌" };
        tracing::info!(
            "  {} {} → {} ({:.1}%) score={:.2} consensus={}",
            data_symbol_emoji(&r.final_verdict), r.symbol,
            r.final_verdict, r.confidence, r.judge_score, consensus_tag
        );
    }
}

fn data_symbol_emoji(v: &Verdict) -> &'static str {
    match v {
        Verdict::Buy => "🟢",
        Verdict::Sell => "🔴",
        Verdict::Hold => "⚪",
    }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "swarm_engine=info,ouroboros_brain=info".into()),
        )
        .init();

    tracing::info!("═══════════════════════════════════════════════");
    tracing::info!("  MANTLE AI SWARM — Multiverse Convergence v2");
    tracing::info!("  Ouroboros + Titan + Hive Mind + X402 Agents");
    tracing::info!("═══════════════════════════════════════════════");

    // ═══ Load Ouroboros configs ═══
    let cfg_dir = config_dir();
    let models = load_models(&cfg_dir.join("models.toml"))
        .expect("Failed to load models.toml");
    let prompts = load_prompts(&cfg_dir.join("prompts.toml"))
        .expect("Failed to load prompts.toml");
    let thresholds = load_thresholds(&cfg_dir.join("thresholds.toml"))
        .expect("Failed to load thresholds.toml");

    // ═══ OpenRouter client ═══
    let api_key = std::env::var("OPENROUTER_API_KEY")
        .expect("OPENROUTER_API_KEY must be set in .env");
    if api_key.is_empty() || api_key.len() < 10 {
        tracing::error!("❌ OPENROUTER_API_KEY is invalid");
        std::process::exit(1);
    }
    tracing::info!("🔑 OpenRouter API key loaded ({}...)", &api_key[..8]);

    let client = OpenRouterClient::new(api_key, &models.defaults);
    let debate_pool = ModelPool::new(
        models.debate_pool.clone(),
        models.defaults.max_failures_before_rotate,
    );

    tracing::info!("🧠 Ouroboros: {} debate models + 2 judges", debate_pool.pool_size());

    // ═══ Hive Mind: ML Local Model ═══
    let ml_model = LocalModel::new();
    tracing::info!("🤖 Hive Mind: ML local model initialized (7-feature logistic regression)");

    // ═══ Titan: Entry Pipeline ═══
    tracing::info!("🚪 Titan: 8-gate entry pipeline armed");

    // ═══ X402: Consensus + Risk ═══
    let risk = RiskGate::new(1000.0); // $1000 initial bankroll
    tracing::info!("⚡ X402: PolicyGovernor (3 voters) + RiskGate (Kelly/KillSwitch/BucketCap)");

    // ═══ Swarm State ═══
    let state = Arc::new(SwarmState::new());
    tracing::info!("📊 Swarm state initialized (DashMap lock-free)");

    // ═══ Decision Loop ═══
    let cycle_interval = std::time::Duration::from_secs(
        std::env::var("CYCLE_INTERVAL_SECS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(60)
    );

    tracing::info!("🚀 Starting decision loop (interval: {}s)", cycle_interval.as_secs());
    tracing::info!("Pipeline: Data → Debate → ML → Judge → EntryGate → Consensus → RiskGate → Execute");
    tracing::info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    loop {
        decision_cycle(
            &client, &debate_pool, &prompts, &models, &thresholds,
            &state, &ml_model, &risk,
        ).await;

        tracing::info!("💤 Next cycle in {}s...", cycle_interval.as_secs());
        tokio::time::sleep(cycle_interval).await;
    }
}
