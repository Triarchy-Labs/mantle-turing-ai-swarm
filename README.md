# Mantle AI Swarm — Autonomous Trading Intelligence

> 12-crate Rust workspace. 22,000+ LOC. Zero external databases.
> LLM consensus engine + neural trading brain + collective intelligence + on-chain execution.
> Built for Mantle Network. Designed for the Turing Test.

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
| **ouroboros-brain** | 3,987 | LLM consensus: multi-model debate, 15-factor judge, decision memory, circuit breaker |
| **titan-core** | 4,465 | Neural trading brain: 8-gate entry pipeline, Kelly risk sizing, trailing SL, position recovery |
| **hive-intel** | 11,991 | Collective intelligence: 40 cognitive modules, SIMD turbo, ML local (<1μs), backtester, paper engine |
| **mantle-chain** | 118 | Alloy 2.0 on-chain adapter for Mantle (Chain 5000) |
| **swarm-engine** | 30 | Main orchestrator wiring all dimensions |
| **x402-consensus** | 398 | PolicyGovernor — 4-voter consensus engine for trade decisions |
| **x402-risk** | 555 | Kelly sizing, KillSwitch, ATR stops, BucketCap risk management |
| **x402-polymarket** | 83 | Gamma API — live prediction market sentiment oracle |
| **x402-memory** | 124 | HyperEdge graph + sled DB persistent memory |
| **x402-sniper** | 524 | DEX execution + x402 bounty protocol client |
| **x402-liquidator** | 111 | On-chain flash liquidation via ILendingPool |
| **core-ipc** | 75 | mmap-based zero-copy inter-agent communication |

## The Swarm Decision Flow

```
Market Signal → Ouroboros Debate (Bull vs Bear LLM)
                     ↓
              15-Factor Judge (scoring engine)
                     ↓
              Titan Entry Pipeline (8 gates)
                     ↓
              Hive Mind Validation (ML + memory + DQS)
                     ↓
              X402 Consensus Vote (4 agents agree?)
                     ↓
              Risk Gate (Kelly sizing + KillSwitch)
                     ↓
              Mantle Chain Execution (on-chain tx)
                     ↓
              Reputation Update (ERC-8004 NFT)
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

## Performance

| Feature | Metric |
|---------|--------|
| ML local inference | < 1μs (logistic regression) |
| SIMD cosine similarity | 4x speedup (AVX2) |
| Memory Castle lookups | O(1) DashMap |
| IPC latency | ~150μs (mmap zero-copy) |
| Binary size (release) | LTO fat + strip + panic=abort |
| Test coverage | 389 tests passing |

## On-Chain (Mantle Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| ERC8004Registry | `0xFA0b...8383` | Agent identity NFT + reputation |
| X402FlashLiquidator | `0x41c5...4F4` | AI-scored flash liquidation |

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

Forged from three battle-tested trading engines and unified for the Mantle Turing Test Hackathon.

Built by Triarchy Labs.
