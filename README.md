# Mantle AI Swarm — Autonomous Trading Intelligence

![License](https://img.shields.io/badge/license-MIT-blue)
![Tests](https://img.shields.io/badge/tests-553%20pass-brightgreen)
![Rust](https://img.shields.io/badge/rust-1.95-orange)
![Mantle](https://img.shields.io/badge/chain-Mantle%20Mainnet-purple)
![LOC](https://img.shields.io/badge/LOC-26%2C873-informational)

> 12-crate Rust workspace. 26,873 LOC. Zero external databases.
> 6 Intelligence Layers. 4-state regime detection. 5-filter pre-trade risk engine.
> LLM consensus + neural brain + collective intelligence + **live on-chain execution**.
> Live DexScreener data feeds. ERC-8004 reputation on Mantle Mainnet.
> Built for the [Mantle Turing Test Hackathon 2026](https://dorahacks.io/hackathon/2130/detail).

**[🔴 Live Dashboard](https://mantle-ai-swarm.vercel.app)** · **[📜 ERC-8004 Registry](https://repo.sourcify.dev/5000/0xFA0b5036aF9770B370B33CeBBb42d1E626338383)** · **[⚡ Flash Liquidator](https://repo.sourcify.dev/5000/0x41c51a03FFE750F5df1F6ffc972DBA8265B5a4F4)**

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SWARM ORCHESTRATOR                           │
│              (swarm-engine — main loop)                         │
├────────────┬────────────┬─────────────┬────────────────────────┤
│            │            │             │                        │
│  OUROBOROS │   TITAN    │  HIVE MIND  │     X402 AGENTS        │
│   BRAIN    │   CORE     │   INTEL     │  (6 autonomous nodes)  │
│            │            │             │                        │
│ LLM Debate │ Neural     │ 40-Module   │ Consensus · Risk       │
│ 15-Factor  │ Brain      │ Memory      │ Polymarket · Memory    │
│ Judge      │ 8-Gate     │ Castle      │ Sniper · Liquidator    │
│ Memory     │ Entry      │ ML Local    │                        │
│ Breaker    │ Pipeline   │ SIMD 4x     │ PolicyGovernor         │
│            │ Kelly Risk │ Backtester  │ Voting Engine          │
├────────────┴────────────┴─────────────┴────────────────────────┤
│                     MANTLE CHAIN ADAPTER                       │
│        Alloy 2.0 · Chain 5000 · ERC-8004 Identity NFT         │
│        X402FlashLiquidator · Agni Finance Router               │
├─────────────────────────────────────────────────────────────────┤
│                     CORE IPC (L0)                              │
│          mmap zero-copy · inter-agent state sync               │
└─────────────────────────────────────────────────────────────────┘
```

## Crate Map

| Crate | LOC | Role |
|-------|-----|------|
| **ouroboros-brain** | 3,987 | LLM consensus: multi-model debate, 15-factor judge, decision memory, circuit breaker, pre-trade risk engine (5 institutional filters) |
| **titan-core** | 4,465 | Neural brain: 8-gate entry, trailing SL (ATR+BE+adverse), 3-stage unstuck, RiskMatrix, ConfidenceEngine (DNA scoring), AutoRamp (5-phase capital), Deallow (ban scanner), PatienceTracker (15m lock) |
| **hive-intel** | 12,212 | Collective intelligence: 40+ cognitive modules, SIMD turbo, ML local (<1μs), regime detection (4-state HMM), affective memory (EWMA), hybrid recall (OWM+SIMD+anti-survivorship), paper engine, AI vs Human benchmark |
| **mantle-chain** | 705 | Alloy 2.0 on-chain: ERC-8004 ABI (sol!), wallet signer + live tx broadcast, DexScreener 13-field live data, Merchant Moe/Agni router |
| **swarm-engine** | 1,090 | Main orchestrator — v5.0 24-stage pipeline + telemetry HTTP server (:3402/7 endpoints) + live chain broadcast |
| **x402-consensus** | 398 | PolicyGovernor — 4-voter consensus engine for trade decisions |
| **x402-risk** | 555 | Regime-aware Kelly sizing, KillSwitch, ATR stops, BucketCap risk management |
| **x402-polymarket** | 83 | Gamma API — live prediction market sentiment oracle |
| **x402-memory** | 124 | HyperEdge graph + sled DB persistent memory |
| **x402-sniper** | 524 | DEX execution + x402 bounty protocol client |
| **x402-liquidator** | 111 | On-chain flash liquidation via ILendingPool |
| **core-ipc** | 75 | mmap-based zero-copy inter-agent communication |

## The v5 Decision Pipeline (24 Stages, 6 Intelligence Layers)

```
Market Data
    ↓
╔═ REGIME DETECTION (4-state HMM: TrendingUp/Down/Ranging/Volatile) ═╗
    ↓
╔═ OUROBOROS LLM DEBATE (Bull vs Bear, 3 models, 5 vendors) ═╗
    ↓
╔═ HIVE MIND ML (7-feature LogReg <1μs + Hybrid Recall + EWMA Affective) ═╗
    ↓
╔═ 15-FACTOR JUDGE (TOML-configurable scoring engine) ═╗
    ↓
╔═ PRE-TRADE RISK (5 institutional filters: drawdown/streak/correlation/cap/confidence) ═╗
    ↓
╔═ TITAN ENTRY (8-gate pipeline: daily loss, symbol streak, imbalance, margin) ═╗
    ↓
╔═ X402 CONSENSUS (PolicyGovernor: signal + trend + macro = 3-voter majority) ═╗
    ↓
╔═ RISK GATE (Regime-aware Kelly × PreTrade factor × Risk Appetite dampening) ═╗
    ↓
╔═ PAPER TRADE (ATR 1.5× stops, 2:1 R:R, circuit breaker) ═╗
    ↓
╔═ TITAN RISK MATRIX (dynamic leverage: ATR volatility + macro penalty) ═╗
    ↓
╔═ TITAN TRAILING SL (ATR trailing + BE-lock + adverse selection guard) ═╗
    ↓
╔═ TITAN UNSTUCK (3-stage recovery: monitor → partial trim → full evacuation) ═╗
    ↓
╔═ TITAN CONFIDENCE (DNA-based scoring + adaptive ATR + directional bias) ═╗
    ↓
╔═ TITAN AUTO-RAMP (5-phase capital scaling: SEED→SPROUT→GROWTH→MATURE→APEX) ═╗
    ↓
╔═ TITAN DEALLOW (underperformer ban/recovery scanner) ═╗
    ↓
╔═ ANOMALY DETECTION (Z-score + IQR on PnL history) ═╗
    ↓
╔═ DECISION JOURNAL (self-learning memory → future prompt injection) ═╗
    ↓
╔═ MANTLE CHAIN (ERC-8004 reputation update + on-chain tx logging) ═╗
    ↓
╔═ IPC BRIDGE (mmap zero-copy → inter-agent state sync) ═╗
```

## 15-Factor Judge (Ouroboros)

| # | Factor | Source | Weight |
|---|--------|--------|--------|
| 1 | Price Trend | Market data | ±2.0 |
| 2 | Funding Rate | On-chain | ±1.5 |
| 3 | OI Change | Market data | ±0.5 |
| 4 | Volume Surge | Market data | 1.3x multiplier |
| 5 | LLM Sentiment | Debate result | ±0.5 |
| 6 | Alpha Intel | Whale tracking | ±1.5 |
| 7 | ML Prediction | Local ML | ±1.5 |
| 8 | Macro Bias | LLM judge | ±1.0 |
| 9 | MTF 4H Trend | EMA20/50 + RSI | ±1.5 |
| 10 | Funding Extremes | Alpha Station | ±1.5 |
| 11 | OI Divergence | Alpha Station | ±0.8 |
| 12 | Liquidation Magnets | Heatmap | ±1.0 |
| 13 | Whale Footprints | Whale alerts | ±2.0 |
| 14 | HiveMind Memory | Pattern recall | ±3.0 |
| 15 | Meta Judge | Independent LLM | ±1.0 |

## Memory Stack (5 Layers)

| Layer | Technology | Purpose |
|-------|-----------|--------|
| **L0** | `DashMap` + `Arc` | Real-time state (lock-free, in-memory) |
| **L1** | Hybrid Recall (OWM + SIMD cosine + anti-survivorship) | Episodic trade memory with forced negative inclusion |
| **L2** | Decision Memory (LLM journal) | Self-learning trade journal → prompt injection |
| **L3** | IPC Bridge (mmap) + HyperEdge Graph (sled DB) | Inter-agent state sync + persistent on-chain memory |
| **L4** | Paper Engine (SL/TP/circuit breaker) | Simulation with ATR-based risk |

## Performance

| Feature | Metric |
|---------|--------|
| ML local inference | < 1μs (logistic regression) |
| SIMD cosine similarity | 4x speedup (AVX2) |
| Regime detection | 4-state HMM classifier |
| Memory recall | Hybrid OWM+Vector blend |
| Position sizing | 3-factor damped Kelly (regime × pretrade × appetite) |
| Binary size (release) | LTO fat + strip + panic=abort |

## On-Chain (Mantle Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| ERC8004Registry | `0xFA0b...8383` | Agent identity NFT + dynamic reputation |
| X402FlashLiquidator | `0x41c5...4F4` | AI-scored flash liquidation |
| Agent #1 NFT | Token ID 1 | Already minted — sovereign AI identity |
| Deployment Wallet | `0xF023...c79` | Signed tx broadcast via Alloy |

## Live Data Feeds

| Source | Data | Update |
|--------|------|--------|
| DexScreener API | MNT/WETH price, 24h change, volume, buy/sell txns, liquidity | Every cycle |
| Mantle RPC | Wallet balance, ERC-20 balances, contract state | On-demand |
| Derived Signals | Buy/sell ratio, volume acceleration, synthetic funding rate | Computed per cycle |

## Telemetry API

Live transparency endpoint on `http://localhost:3402`:

| Endpoint | Response |
|----------|----------|
| `GET /` | Full swarm state (symbols, verdicts, pipeline, chain info) |
| `GET /health` | Version, uptime, cycle count |
| `GET /verdicts` | Latest AI trade verdicts per symbol |
| `GET /regime` | Current market regime + confidence |

## LLM Models (Zero Cost)

| Role | Model | Vendor |
|------|-------|--------|
| Primary Debate | Gemma-4-31B | Google |
| Secondary Debate | Qwen3-80B | Alibaba |
| Fallback Debate | Hermes-405B | NousResearch |
| Macro Judge | GPT-OSS-120B | OpenAI |
| Meta Judge | Nemotron-120B | NVIDIA |

All models are free-tier via OpenRouter. Zero inference cost.

## Quick Start

```bash
# Build the swarm
cargo build --release --workspace --quiet

# Configure
cp .env.example .env
# Set: OPENROUTER_API_KEY, MANTLE_RPC_URL, PRIVATE_KEY

# Run
cargo run --release -p swarm-engine
```

## Project Structure

```
mantle-ai-swarm/
├── .cargo/config.toml        # SIMD AVX2 native CPU flags
├── .env                      # API keys (gitignored)
├── Cargo.toml                # Workspace root (12 members)
├── config/
│   ├── models.toml            # LLM model pool configuration
│   ├── prompts.toml           # Debate + judge prompt templates
│   └── thresholds.toml        # 15-factor scoring calibration
├── contracts/
│   ├── src/                   # ERC8004Registry + X402FlashLiquidator
│   ├── script/Deploy.s.sol    # Foundry deployment
│   └── test/X402.t.sol        # 5 contract tests
├── crates/
│   ├── ouroboros-brain/       # LLM consensus engine
│   ├── titan-core/            # Neural trading brain
│   ├── hive-intel/            # Collective intelligence (40 modules)
│   ├── mantle-chain/          # Alloy 2.0 on-chain adapter
│   ├── swarm-engine/          # Main orchestrator
│   ├── x402-consensus/        # PolicyGovernor voting
│   ├── x402-risk/             # Kelly + KillSwitch
│   ├── x402-polymarket/       # Prediction market oracle
│   ├── x402-memory/           # HyperEdge persistent memory
│   ├── x402-sniper/           # DEX execution
│   ├── x402-liquidator/       # Flash liquidation
│   └── core-ipc/              # mmap IPC bridge
├── dashboard/                 # React monitoring UI
└── tools/                     # Test utilities
```

## Origin

Converged from three battle-tested trading engines — Ouroboros (LLM brain), Titan (execution), Hive Mind (intelligence) — and unified with X402 on-chain infrastructure for the Mantle Turing Test Hackathon 2026.

26,873 lines of Rust. 12 crates. 6 intelligence layers. 18 pipeline stages. Live Mantle data. Zero compromises.

Built by [Triarchy Labs](https://github.com/Triarchy-Labs).
