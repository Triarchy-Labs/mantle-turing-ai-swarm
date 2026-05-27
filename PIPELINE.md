# PIPELINE — Mantle Turing Test Hackathon

> From multiverse collision to submission-ready AI Swarm.

---

## Phase 0: Multiverse Collision ✅ DONE

**Goal:** Merge 3 trading engines + X402 agents into unified workspace.

- [x] Clone roxy-hyperstack (Ouroboros, Titan, Hive Mind)
- [x] Clone X402 crate inventory (consensus, risk, sniper, liquidator, polymarket, memory)
- [x] Unify into single Cargo workspace with 12 crates
- [x] Alloy 0.14 → 2.0 migration (`on_http` → `connect_http`, Provider generics)
- [x] Windows path decontamination (E:\ → env vars / data/ relative)
- [x] DataProvider trait abstraction (Bybit → exchange-agnostic)
- [x] Zero-trust audit: 22,461 LOC, 113 .rs files, 0 errors, 389 tests pass
- [x] .cargo/config.toml with SIMD native CPU flags
- [x] Dashboard React app baseline copied
- [x] Contract deploy script + tests copied

**Result:** Clean-compiling workspace. All code absorbed.

---

## Phase 1: Swarm Orchestrator Wiring 🔄 NEXT

**Goal:** Wire swarm-engine main loop connecting all dimensions.

- [ ] **swarm-engine/main.rs**: Implement the main async loop
  - Load .env (dotenvy)
  - Initialize OpenRouter client (ouroboros-brain)
  - Initialize Mantle provider (mantle-chain)
  - Start Hive Mind API server (hive-intel api.rs, port 8889)
  - Boot consensus engine (x402-consensus)
  - Boot risk agent (x402-risk)

- [ ] **Signal pipeline**: Wire the decision flow
  - Market data ingestion (initially mock, then DEX oracle)
  - Ouroboros debate → Judge scoring → Verdict
  - Titan entry pipeline validation
  - Hive Mind memory recall + ML prediction
  - X402 consensus vote
  - Risk gate (Kelly sizing)

- [ ] **IPC bridge**: Connect core-ipc mmap to all agents

**Deliverable:** `cargo run -p swarm-engine` boots all agents and runs one decision cycle.

---

## Phase 2: Mantle Chain Integration

**Goal:** Live on-chain execution on Mantle (Chain 5000).

- [ ] **mantle-chain adapter**: Implement provider.rs with wallet
  - Connect to Mantle RPC (public or Alchemy)
  - Load private key from .env
  - Alloy ProviderBuilder with wallet signer

- [ ] **ERC-8004 binding**: Wire x402-sniper to live contracts
  - Read deployed Registry at 0xFA0b...8383
  - Register agent if not already registered
  - Execute AI liquidation with sentiment score

- [ ] **DEX price feed**: Replace mock data with live Mantle DEX
  - Agni Finance Router ABI integration
  - Real-time token price via getAmountsOut
  - Feed into Judge factor inputs

- [ ] **Reputation loop**: Post-trade reputation increment
  - Success → addReputation(agentId, 100)
  - Read reputation for dashboard display

**Deliverable:** One live on-chain AI inference tx with reputation update.

---

## Phase 3: Intelligence Layer Polish

**Goal:** Make the AI genuinely smarter than random.

- [ ] **Fix 36 remaining Windows paths** in titan-core (replace with env vars)

- [ ] **Ouroboros tuning**:
  - Test all 6 LLM models via OpenRouter
  - Calibrate thresholds.toml against Mantle token behavior
  - Enable hyper.rs factors (Alpha Station data format for DEX)

- [ ] **Hive Mind activation**:
  - Initialize paper_engine for demo trades
  - Run backtester with Mantle token historical data
  - Enable portfolio_guard safety layer
  - Wire brain.rs diagnostic pipeline

- [ ] **Titan integration**:
  - Feed live prices into NeuralBrain scoring
  - Connect brain_feeds.rs to Ouroboros verdicts (IPC)
  - Enable auto_ramp for progressive position sizing

- [ ] **X402 consensus fine-tuning**:
  - Set VOTE_THRESHOLD appropriate for Mantle volatility
  - Wire polymarket oracle for macro sentiment
  - Enable risk-agent KillSwitch thresholds

**Deliverable:** AI makes consistently non-random trading decisions.

---

## Phase 4: Dashboard & Presentation

**Goal:** Hackathon-ready demo with visual impact.

- [ ] **Dashboard upgrade**:
  - Connect to live swarm-engine WebSocket
  - Real-time decision feed (not mock data)
  - ERC-8004 reputation display
  - Consensus vote visualization
  - PnL curve from paper_engine

- [ ] **Architecture diagram**: High-quality SVG for submission
  - Data flow topology
  - Agent interaction map
  - On-chain integration points

- [ ] **Demo script**: 
  - Boot swarm → show consensus debate
  - Execute one live trade → show on-chain tx
  - Show reputation increment → display on dashboard
  - Show backtester results: AI vs random baseline

**Deliverable:** 3-minute video demo or live presentation.

---

## Phase 5: Submission Package

**Goal:** DoraHacks submission with maximum impact.

- [ ] **README polish**: Technical depth + accessible pitch
- [ ] **Architecture doc**: For judges who want deep dive
- [ ] **Deployment guide**: One-command setup
- [ ] **Performance benchmarks**: Latency, test coverage, LOC stats
- [ ] **On-chain proof**: Verifiable txs on Mantle Explorer
- [ ] **Video demo**: Screen recording of live swarm execution
- [ ] **DoraHacks BUIDL page**: Project description, team, links

**Deliverable:** Complete hackathon submission on DoraHacks.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenRouter rate limits | High | 6-model rotation pool + fallback |
| Mantle RPC downtime | Medium | Multiple RPC endpoints |
| DEX liquidity too thin | Medium | Paper engine demo mode |
| Build breaks on CI | Low | Local-first, 389 tests |
| Time pressure | High | Phase 1-2 = minimum viable, Phase 3-5 = polish |

## Timeline

| Phase | Est. Duration | Priority |
|-------|--------------|----------|
| Phase 1 | 1-2 sessions | P0 — blocker |
| Phase 2 | 1-2 sessions | P0 — blocker |
| Phase 3 | 2-3 sessions | P1 — quality |
| Phase 4 | 1 session | P1 — presentation |
| Phase 5 | 1 session | P0 — submission |
