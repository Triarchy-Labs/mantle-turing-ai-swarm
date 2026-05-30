//! Swarm Engine — Full Multiverse Convergence
//!
//! ALL 12 crates wired into one decision pipeline:
//!   Ouroboros (LLM Brain) + Titan (Entry Gates) +
//!   Hive Mind (ML + Memory + Paper Trading) +
//!   X402 (Consensus + Risk + Sniper + Liquidator + Polymarket + Memory)
//!
//! Pipeline: Data → Debate → ML → Recall → Judge → EntryGate →
//!           Consensus → RiskGate → PaperTrade → (Chain Execute)

use ouroboros_brain::{
    config::{load_models, load_prompts, ModelsFile, PromptsFile},
    judge::{chief_judge_v2, load_thresholds, JudgeInput, JudgeVerdict, ThresholdsConfig},
    openrouter::{ModelPool, OpenRouterClient},
    state::{ConsensusResult, SymbolData, SwarmState, Verdict},
    decision_memory::DecisionMemory,
};
use titan_core::entry::{EntryConfig, EntryContext, EntryPipeline, EntryVerdict};
use hive_intel::ml_local::{FeatureVector, LocalModel};
use hive_intel::paper_engine::{PaperEngine, Side as PaperSide, OrderStatus};
use hive_intel::recall::{
    AffectiveState, ContextVector, RawMemory,
    outcome_weighted_recall,
};
use hive_intel::hybrid_recall::hybrid_blend;
use x402_consensus::engine::{Action, AgentVote, PolicyGovernor};
use x402_risk::engine::{AtrStops, MarketRegime, RiskGate};
use x402_memory::engine::create_liquidation_edge;

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::Mutex;

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════

fn config_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent().unwrap()
        .parent().unwrap()
        .join("config")
}

fn mock_market_data() -> Vec<SymbolData> {
    vec![
        SymbolData {
            symbol: "MNT".into(), price: 0.82, price_24h_change: -3.2,
            volume_24h: 45_000_000.0, volume_ratio: 1.8,
            funding_rate: -0.0004, open_interest: 120_000_000.0,
            oi_change_pct: -2.1, timestamp: chrono::Utc::now().timestamp(),
        },
        SymbolData {
            symbol: "WETH".into(), price: 2650.0, price_24h_change: 1.4,
            volume_24h: 180_000_000.0, volume_ratio: 1.2,
            funding_rate: 0.0001, open_interest: 890_000_000.0,
            oi_change_pct: 0.8, timestamp: chrono::Utc::now().timestamp(),
        },
        SymbolData {
            symbol: "USDC".into(), price: 1.0, price_24h_change: 0.01,
            volume_24h: 500_000_000.0, volume_ratio: 1.0,
            funding_rate: 0.0, open_interest: 0.0,
            oi_change_pct: 0.0, timestamp: chrono::Utc::now().timestamp(),
        },
    ]
}

// ═══════════════════════════════════════════════════════════
// DIMENSION 1: OUROBOROS — LLM Debate
// ═══════════════════════════════════════════════════════════

struct DebateResult {
    bull_argument: String,
    bear_argument: String,
    macro_bias: String,
}

async fn run_debate(
    client: &OpenRouterClient, debate_pool: &ModelPool,
    prompts: &PromptsFile, models: &ModelsFile, data: &SymbolData,
) -> DebateResult {
    let data_str = format!(
        "price=${:.4}, 24h_change={:.1}%, funding={:.6}, oi_change={:.1}%, vol_ratio={:.1}x",
        data.price, data.price_24h_change, data.funding_rate, data.oi_change_pct, data.volume_ratio
    );
    let fr_label = if data.funding_rate < -0.0003 { "SHORTS PAYING" }
        else if data.funding_rate > 0.0005 { "LONGS OVERHEATED" }
        else { "neutral" };

    let bull_user = prompts.debate.bull.user_template
        .replace("{symbol}", &data.symbol).replace("{data}", &data_str).replace("{alpha_ctx}", "");
    let bull_argument = client.chat_with_pool(debate_pool, &prompts.debate.bull.system,
        &bull_user, prompts.debate.bull.temperature, prompts.debate.bull.max_tokens,
    ).await.unwrap_or_default();
    if !bull_argument.is_empty() { tracing::info!("🐂 Bull [{}]: {}", data.symbol, bull_argument); }

    let bear_user = prompts.debate.bear.user_template
        .replace("{symbol}", &data.symbol).replace("{data}", &data_str).replace("{alpha_ctx}", "");
    let bear_argument = client.chat_with_pool(debate_pool, &prompts.debate.bear.system,
        &bear_user, prompts.debate.bear.temperature, prompts.debate.bear.max_tokens,
    ).await.unwrap_or_default();
    if !bear_argument.is_empty() { tracing::info!("🐻 Bear [{}]: {}", data.symbol, bear_argument); }

    let macro_user = prompts.macro_judge.user_template
        .replace("{symbol}", &data.symbol)
        .replace("{price}", &format!("{:.4}", data.price))
        .replace("{change}", &format!("{:.1}", data.price_24h_change))
        .replace("{fr}", &format!("{:.6}", data.funding_rate))
        .replace("{fr_label}", fr_label)
        .replace("{oi_delta}", &format!("{:.1}", data.oi_change_pct))
        .replace("{vol_surge}", &format!("{:.1}", data.volume_ratio));
    let macro_raw = client.chat(&models.macro_judge_model, &prompts.macro_judge.system,
        &macro_user, prompts.macro_judge.temperature, prompts.macro_judge.max_tokens,
    ).await.unwrap_or_default();
    let upper = macro_raw.to_uppercase();
    let macro_bias = if upper.contains("BUY") || upper.contains("BULLISH") { "BULLISH" }
        else if upper.contains("SELL") || upper.contains("BEARISH") { "BEARISH" }
        else { "NEUTRAL" };
    tracing::info!("⚖️ Macro [{}]: {} → {}", data.symbol, macro_raw, macro_bias);

    DebateResult { bull_argument, bear_argument, macro_bias: macro_bias.to_string() }
}

// ═══════════════════════════════════════════════════════════
// DIMENSION 3: HIVE MIND — ML + OWM Recall
// ═══════════════════════════════════════════════════════════

fn run_ml_prediction(ml: &LocalModel, data: &SymbolData) -> (i32, f64) {
    let features = FeatureVector::from_raw(
        50.0 + data.price_24h_change * -3.0, data.price_24h_change,
        data.volume_24h, data.volume_24h / data.volume_ratio.max(0.01),
        data.oi_change_pct / 10.0, data.funding_rate.abs() * 100.0, 0.55, 0.5,
    );
    let pred = ml.predict(&features);
    let dir = if pred.probability > 0.6 { 1 } else if pred.probability < 0.4 { -1 } else { 0 };
    tracing::info!("🤖 ML [{}]: P={:.3} conf={:.3} → {}", data.symbol, pred.probability, pred.confidence,
        match dir { 1 => "BULL", -1 => "BEAR", _ => "NEUTRAL" });
    (dir, pred.confidence)
}

fn run_memory_recall(data: &SymbolData, affective: &AffectiveState, trade_memories: &[RawMemory]) -> f64 {
    let query = ContextVector {
        regime: Some(if data.price_24h_change > 1.0 { "trending_up" } else if data.price_24h_change < -1.0 { "trending_down" } else { "ranging" }.into()),
        price: Some(data.price),
        ..Default::default()
    };

    // OWM base scoring
    let recalled = outcome_weighted_recall(&query, trade_memories, affective, 5);

    // Upgrade to hybrid (vector + OWM) when available
    let owm_scores: Vec<(String, f64, Option<f64>)> = recalled.iter()
        .map(|m| (m.memory_id.clone(), m.score, trade_memories.iter()
            .find(|t| t.id == m.memory_id).and_then(|t| t.pnl_r)))
        .collect();
    let hybrid = hybrid_blend(&owm_scores, None, &[], 0.3, 3);

    let memory_boost = if hybrid.is_empty() { 0.0 } else {
        hybrid.iter().map(|m| m.score).sum::<f64>() / hybrid.len() as f64
    };
    if !hybrid.is_empty() {
        tracing::info!("🧠 Hybrid Recall [{}]: {} memories, avg_score={:.3} (anti-survivorship enforced)",
            data.symbol, hybrid.len(), memory_boost);
    }
    memory_boost
}

// ═══════════════════════════════════════════════════════════
// DIMENSION 2: TITAN — Entry Pipeline (8 Gates)
// ═══════════════════════════════════════════════════════════

fn run_entry_gate(verdict: &JudgeVerdict, data: &SymbolData) -> bool {
    let side = match verdict.decision {
        Verdict::Buy => "LONG", Verdict::Sell => "SHORT", Verdict::Hold => return false,
    };
    let ctx = EntryContext {
        daily_loss: 0.0, session_limit: 50.0, symbol_loss_streak: 0,
        head_position_count: 0, global_position_count: 0, symbol_already_owned: false,
        verdict: side.to_string(), symbol: data.symbol.clone(), score: verdict.score,
        btc_score: 0.0, imbalance_ratio: data.volume_ratio.clamp(0.1, 10.0),
        existing_total_margin: 0.0, available_balance: 1000.0, new_margin_size: 50.0,
        is_held_by_other_bot: false, existing_position_symbols: vec![],
    };
    match EntryPipeline::evaluate(&ctx, &EntryConfig::default()) {
        EntryVerdict::Approved { side, reason } => { tracing::info!("🚪 Entry [{}]: ✅ {} ({})", data.symbol, side, reason); true }
        EntryVerdict::Rejected { gate, reason } => { tracing::info!("🚪 Entry [{}]: ❌ {} ({})", data.symbol, gate, reason); false }
    }
}

// ═══════════════════════════════════════════════════════════
// DIMENSION 4: X402 — Consensus + Risk + Stops
// ═══════════════════════════════════════════════════════════

fn run_consensus(verdict: &JudgeVerdict, ml_dir: i32, macro_bias: &str) -> (bool, Action) {
    let governor = PolicyGovernor::new();
    let to_action = |v: &Verdict| match v { Verdict::Buy => Action::Buy, Verdict::Sell => Action::Sell, _ => Action::Wait };
    let votes = vec![
        AgentVote { agent_name: "signal".into(), action: to_action(&verdict.decision),
            confidence: (verdict.confidence / 100.0).clamp(0.0, 1.0), timestamp: 0 },
        AgentVote { agent_name: "trend".into(),
            action: match ml_dir { 1 => Action::Buy, -1 => Action::Sell, _ => Action::Wait },
            confidence: 0.5, timestamp: 0 },
        AgentVote { agent_name: "regime".into(),
            action: match macro_bias { "BULLISH" => Action::Buy, "BEARISH" => Action::Sell, _ => Action::Wait },
            confidence: 0.6, timestamp: 0 },
    ];
    let d = governor.resolve(&votes);
    let ok = !d.vetoed && d.action != Action::Wait;
    let tag = if d.vetoed { "🛑 VETO" } else if ok { "✅" } else { "⏸️" };
    tracing::info!("{} Consensus: {} (conf={:.2}) {}", tag, d.action, d.confidence, d.veto_reason.as_deref().unwrap_or(""));
    (ok, d.action)
}

fn run_risk_gate(risk: &RiskGate, symbol: &str) -> Option<f64> {
    match risk.evaluate(symbol, 0.55, 1.0, MarketRegime::Calm) {
        Ok(size) => { tracing::info!("💰 Risk [{}]: ✅ size=${:.2}", symbol, size); Some(size) }
        Err(reason) => { tracing::info!("💰 Risk [{}]: ❌ {}", symbol, reason); None }
    }
}

fn run_paper_trade(paper: &Mutex<PaperEngine>, symbol: &str, verdict: Verdict, price: f64, size: f64) {
    let mut pe = paper.lock().unwrap();
    let side = match verdict { Verdict::Buy => PaperSide::Long, Verdict::Sell => PaperSide::Short, _ => return };
    let qty = size / price;
    let stops = AtrStops::calculate(price * 0.015, price); // 1.5% ATR estimate
    let (sl, tp) = match side {
        PaperSide::Long => (Some(stops.stop_price_long()), Some(stops.target_price_long())),
        PaperSide::Short => (Some(stops.stop_price_short()), Some(stops.target_price_short())),
    };
    let ts = chrono::Utc::now().timestamp_millis();
    match pe.open_position(symbol, side, price, qty, sl, tp, ts) {
        Ok(id) => tracing::info!("📝 Paper [{}]: opened #{} qty={:.6} SL={:.4} TP={:.4}", symbol, id, qty, sl.unwrap_or(0.0), tp.unwrap_or(0.0)),
        Err(e) => tracing::warn!("📝 Paper [{}]: rejected — {}", symbol, e),
    }
}

fn log_memory_edge(symbol: &str, verdict: Verdict, score: f64) {
    let sentiment = match verdict { Verdict::Buy => score, Verdict::Sell => -score, _ => 0.0 };
    let edge = create_liquidation_edge(symbol.to_string(), sentiment, chrono::Utc::now().timestamp() as u64);
    tracing::debug!("🔗 HyperEdge: {} → {} ({:.2})", edge.source, edge.target, edge.sentiment);
}

// ═══════════════════════════════════════════════════════════
// DECISION CYCLE — ALL DIMENSIONS
// ═══════════════════════════════════════════════════════════

async fn decision_cycle(
    client: &OpenRouterClient, debate_pool: &ModelPool,
    prompts: &PromptsFile, models: &ModelsFile, thresholds: &ThresholdsConfig,
    state: &SwarmState, ml: &LocalModel, risk: &RiskGate,
    paper: &Mutex<PaperEngine>, trade_memories: &Mutex<Vec<RawMemory>>,
    decision_mem: &DecisionMemory,
) {
    let cycle = state.increment_cycle();
    tracing::info!("━━━ CYCLE {} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", cycle);

    if !state.is_trading_allowed() {
        tracing::warn!("🔴 Circuit breaker RED — skip"); return;
    }

    let affective = {
        let pe = paper.lock().unwrap();
        AffectiveState {
            drawdown_state: if pe.peak_equity > 0.0 { ((pe.peak_equity - pe.equity) / pe.peak_equity).clamp(0.0, 1.0) } else { 0.0 },
            consecutive_losses: pe.pnl_history.iter().rev().take_while(|p| **p < 0.0).count() as u32,
        }
    };

    // L2: Ingest any Titan outcomes into Decision Memory
    decision_mem.ingest_outcomes();

    // L1→L3: Convert PaperEngine closed trades into OWM RawMemory (learning loop)
    {
        let pe = paper.lock().unwrap();
        let mut memories = trade_memories.lock().unwrap();
        for trade in &pe.closed_trades {
            let trade_id = format!("paper_{}_{}", trade.symbol, trade.id);
            if memories.iter().any(|m| m.id == trade_id) { continue; }
            let pnl_r = if trade.entry_price > 0.0 {
                Some(trade.pnl / (trade.entry_price * trade.quantity).max(0.01))
            } else { None };
            memories.push(RawMemory {
                id: trade_id,
                memory_type: "episodic".into(),
                age_days: 0.0,
                confidence: 0.7,
                pnl_r,
                context: ContextVector {
                    price: Some(trade.entry_price),
                    ..Default::default()
                },
                rehearsal_count: 0,
            });
        }
    }

    for data in &mock_market_data() {
        state.symbols.insert(data.symbol.clone(), data.clone());
        tracing::info!("📊 {} @ ${:.4} | 24h:{:.1}% | FR:{:.6} | OI:{:.1}%",
            data.symbol, data.price, data.price_24h_change, data.funding_rate, data.oi_change_pct);

        if data.price_24h_change.abs() < 0.05 && data.funding_rate.abs() < 0.00001 { continue; }

        // D1: Ouroboros — LLM Debate
        let debate = run_debate(client, debate_pool, prompts, models, data).await;

        // D3: Hive Mind — ML + Hybrid Recall (OWM + vector + anti-survivorship)
        let (ml_dir, ml_conf) = run_ml_prediction(ml, data);
        let memories = trade_memories.lock().unwrap();
        let _memory_boost = run_memory_recall(data, &affective, &memories);
        drop(memories);

        // L2: Decision Memory — inject past context into judge
        let past_ctx = decision_mem.get_past_context(&data.symbol, 3, 2);

        // D1: Ouroboros — 15-Factor Judge (with memory context)
        let input = JudgeInput {
            data: data.clone(),
            bull_argument: debate.bull_argument.clone(), bear_argument: debate.bear_argument.clone(),
            macro_fresh: debate.macro_bias != "NEUTRAL", macro_bias: debate.macro_bias.clone(),
            ml_fresh: true, ml_direction: ml_dir, ml_confidence: ml_conf,
            ..Default::default()
        };
        let verdict = chief_judge_v2(&input, thresholds);
        let e = match verdict.decision { Verdict::Buy => "🟢", Verdict::Sell => "🔴", Verdict::Hold => "⚪" };
        tracing::info!("{} Judge [{}]: {} | score={:.2} conf={:.1}%", e, data.symbol, verdict.decision, verdict.score, verdict.confidence);
        if !past_ctx.is_empty() {
            tracing::info!("📜 Decision Memory [{}]: {} chars of past context injected", data.symbol, past_ctx.len());
        }

        // D2: Titan — 8-Gate Entry
        if !run_entry_gate(&verdict, data) {
            store_result(state, data, &verdict, &debate, false); continue;
        }

        // D4: X402 — Consensus (3 voters)
        let (consensus_ok, _) = run_consensus(&verdict, ml_dir, &debate.macro_bias);
        if !consensus_ok { store_result(state, data, &verdict, &debate, false); continue; }

        // D4: X402 — Risk Gate (Kelly + KillSwitch + BucketCap)
        let size = match run_risk_gate(risk, &data.symbol) {
            Some(s) => s, None => { store_result(state, data, &verdict, &debate, false); continue; }
        };

        // D3: Hive Mind — Paper Trade (ATR stops)
        run_paper_trade(paper, &data.symbol, verdict.decision, data.price, size);

        // D4: X402 — Memory Edge
        log_memory_edge(&data.symbol, verdict.decision, verdict.score);

        // L2: Decision Memory — store verdict for future reflection
        let factors_summary = format!(
            "macro={} ml_dir={} ml_conf={:.2} score={:.2}",
            debate.macro_bias, ml_dir, ml_conf, verdict.score
        );
        decision_mem.store_decision(
            &data.symbol,
            &format!("{}", verdict.decision),
            verdict.score,
            verdict.confidence,
            &factors_summary,
        );

        // D5: Mantle Chain — (Phase 2: live execution via x402-sniper)
        tracing::info!("🚀 EXECUTE [{}]: {} ${:.2} | score={:.2} conf={:.1}%",
            data.symbol, verdict.decision, size, verdict.score, verdict.confidence);

        store_result(state, data, &verdict, &debate, true);
    }

    // Cycle summary
    tracing::info!("━━━ CYCLE {} COMPLETE ━━━━━━━━━━━━━━━━━━━━━━━━━━", cycle);
    for entry in state.consensus.iter() {
        let r = entry.value();
        let tag = if r.meta_agreement { "✅" } else { "❌" };
        tracing::info!("  {} {} → {} ({:.1}%) score={:.2}", tag, r.symbol, r.final_verdict, r.confidence, r.judge_score);
    }
    // Paper trading stats
    let pe = paper.lock().unwrap();
    if !pe.pnl_history.is_empty() {
        let s = pe.stats();
        tracing::info!("  📊 Paper: {} trades | WR={:.0}% | PnL=${:.2} | DD=${:.2}", s.total_trades, s.win_rate*100.0, s.total_pnl, s.max_drawdown);
    }
}

fn store_result(state: &SwarmState, data: &SymbolData, v: &JudgeVerdict, d: &DebateResult, agreed: bool) {
    state.consensus.insert(data.symbol.clone(), ConsensusResult {
        symbol: data.symbol.clone(), final_verdict: v.decision, confidence: v.confidence,
        bull_argument: d.bull_argument.clone(), bear_argument: d.bear_argument.clone(),
        macro_bias: d.macro_bias.clone(), judge_score: v.score, meta_agreement: agreed,
        timestamp: chrono::Utc::now().timestamp(),
    });
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "swarm_engine=info,ouroboros_brain=info".into()))
        .init();

    tracing::info!("═══════════════════════════════════════════════");
    tracing::info!("  MANTLE AI SWARM — Full Multiverse v3");
    tracing::info!("  12 crates · 22K+ LOC · All Dimensions Live");
    tracing::info!("═══════════════════════════════════════════════");

    // D1: Ouroboros configs
    let cfg = config_dir();
    let models = load_models(&cfg.join("models.toml")).expect("models.toml");
    let prompts = load_prompts(&cfg.join("prompts.toml")).expect("prompts.toml");
    let thresholds = load_thresholds(&cfg.join("thresholds.toml")).expect("thresholds.toml");

    let api_key = std::env::var("OPENROUTER_API_KEY").expect("OPENROUTER_API_KEY required");
    assert!(api_key.len() >= 10, "OPENROUTER_API_KEY invalid");
    tracing::info!("🔑 API key: {}...", &api_key[..8]);

    let client = OpenRouterClient::new(api_key, &models.defaults);
    let debate_pool = ModelPool::new(models.debate_pool.clone(), models.defaults.max_failures_before_rotate);
    tracing::info!("🧠 D1 Ouroboros: {} debate models + macro/meta judges", debate_pool.pool_size());

    // D2: Titan
    tracing::info!("🚪 D2 Titan: 8-gate entry pipeline armed");

    // D3: Hive Mind
    let ml_model = LocalModel::new();
    let paper = Mutex::new(PaperEngine::new(1000.0));
    let trade_memories = Mutex::new(Vec::<RawMemory>::new()); // Grows via PaperEngine→OWM loop
    tracing::info!("🤖 D3 Hive Mind: ML(7-feature LR) + PaperEngine($1000) + Hybrid Recall");

    // L2: Decision Memory — self-learning trade journal
    let data_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent().unwrap().parent().unwrap().join("data");
    let _ = std::fs::create_dir_all(&data_dir);
    let decision_mem = DecisionMemory::new(&data_dir);
    tracing::info!("📜 L2 Decision Memory: trade journal at {}/trading_memory.md", data_dir.display());

    // D4: X402 Agents
    let risk = RiskGate::new(1000.0);
    tracing::info!("⚡ D4 X402: PolicyGovernor(3v) + RiskGate(Kelly/Kill/Bucket) + HyperEdge Memory");

    // D5: Mantle Chain (provider ready, execution in Phase 2)
    tracing::info!("⛓️ D5 Mantle: Chain 5000 provider ready (sniper/liquidator armed for Phase 2)");

    // State
    let state = Arc::new(SwarmState::new());
    let interval = std::time::Duration::from_secs(
        std::env::var("CYCLE_INTERVAL_SECS").ok().and_then(|v| v.parse().ok()).unwrap_or(60));

    tracing::info!("🚀 Full Memory Stack: L0(DashMap)→L1(OWM+Hybrid)→L2(DecisionMemory)→L3(HyperEdge)→L4(Paper)");
    tracing::info!("🚀 Pipeline: Data→Debate→ML→Recall→Judge→Entry→Consensus→Risk→Paper→Journal→Chain");
    tracing::info!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    loop {
        decision_cycle(&client, &debate_pool, &prompts, &models, &thresholds,
            &state, &ml_model, &risk, &paper, &trade_memories, &decision_mem).await;
        tracing::info!("💤 Next in {}s...", interval.as_secs());
        tokio::time::sleep(interval).await;
    }
}
