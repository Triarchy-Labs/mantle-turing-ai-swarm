import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/* ── data (from README) ─────────────────────────────── */
const POOL = [
  { name: 'Gemma-4-31B', vendor: 'Google' },
  { name: 'Nex-N2-Pro', vendor: 'NexAGI' },
  { name: 'Qwen3-80B', vendor: 'Alibaba' },
  { name: 'Laguna-M.1', vendor: 'Poolside' },
  { name: 'Llama-3.3-70B', vendor: 'Meta' },
  { name: 'GPT-OSS-20B', vendor: 'OpenAI' },
];
const JUDGES = [
  { name: 'GPT-OSS-120B', vendor: 'OpenAI', role: 'Macro Judge' },
  { name: 'Nemotron-Ultra-550B', vendor: 'NVIDIA', role: 'Meta Judge' },
];

/* factors the judge reads on each side (numbers = judge.rs factor #) */
const BULL_CAPS = [
  { n: '01', t: 'Oversold +2.0' },
  { n: '02', t: 'Funding squeeze' },
  { n: '06', t: 'Alpha squeeze' },
  { n: '08', t: 'Macro bullish' },
  { n: '09', t: '4H uptrend' },
];
const BEAR_CAPS = [
  { n: '01', t: 'Overbought −2.0' },
  { n: '02', t: 'Funding overheat' },
  { n: '08', t: 'Macro bearish' },
  { n: '15', t: 'Event lock −2.0' },
  { n: '07', t: 'ML down' },
];

const MODULES = [
  { num: '001', crate: 'ouroboros-brain', title: 'LLM Consensus', tags: 'DEBATE • JUDGE • RISK', loc: '3,975', size: 'hs-wide', desc: 'Multi-model debate, 15-factor judge, decision memory, circuit breaker, 5 pre-trade filters.',
    full: 'The swarm’s decision core. A bull model and a bear model argue opposite cases — but that debate is only one input. A separate judge folds 15 signals into a single score: price trend (contrarian, it fades the crowd at extremes), funding rate, open interest, volume surges, an ML prediction, macro bias, the 4-hour trend, liquidations and whale activity, memory of past decisions, and a penalty for high-impact events like FOMC / CPI. A trade is allowed only if that combined score clears a threshold — otherwise it holds. Decision memory, a circuit breaker and five pre-trade filters can still veto it. Nothing reaches your capital on a single model’s opinion.' },
  { num: '002', crate: 'titan-core', title: 'Neural Execution', tags: 'GATES • STOPS • RAMP', loc: '4,532', size: 'hs-med', desc: '8-gate entry, trailing SL, RiskMatrix, ConfidenceEngine, 5-phase Auto-Ramp.',
    full: 'This is how an approved trade is actually placed, and defended. Entry runs a gauntlet of eight independent gates (daily-loss limit, per-symbol loss streak, position and duplicate caps, correlation buckets, order-book imbalance, BTC alignment and total exposure); a single failure rejects the trade. Once open, a server-side trailing stop follows price on ATR, snaps to breakeven the moment you are green and never widens, while a three-stage unstuck routine trims or evacuates anything that drifts too far underwater. Capital itself only scales through the five-phase Auto-Ramp (SEED to APEX), and it grows solely on real, sustained profit, never on a hunch.' },
  { num: '003', crate: 'hive-intel', title: 'Collective Intel', tags: 'ML • MEMORY • REGIME', loc: '12,634', size: 'hs-med', desc: '40+ cognitive modules, local ML under 1µs, 4-state HMM regime, hybrid recall, affective memory.',
    full: 'The swarm’s market awareness. More than 40 lightweight models read the market in real time and classify whether it is trending, ranging or volatile, so the agents adapt their behaviour to conditions instead of trading the same way in every market. Most of this runs locally in microseconds, with no dependence on an external API.' },
  { num: '004', crate: 'mantle-chain', title: 'On-Chain Adapter', tags: 'ALLOY • ERC-8004 • DEX', loc: '851', size: 'hs-wide', desc: 'Alloy 2.0: ERC-8004 registry, wallet signer + live tx broadcast, DexScreener, Merchant Moe / Agni.',
    full: 'The bridge to the blockchain. It signs and broadcasts every trade on Mantle, reads live prices from the on-chain DEXs (Merchant Moe / Agni), and — crucially — writes every AI verdict into a public ERC-8004 registry. Anyone can open Mantlescan and independently verify what the agent decided and did. Nothing is hidden off-chain.' },
  { num: '005', crate: 'swarm-engine', title: 'Orchestrator', tags: 'PIPELINE • TELEMETRY', loc: '1,499', size: 'hs-tri', desc: '24-stage decision pipeline + telemetry HTTP server + live chain broadcast.',
    full: 'The conductor. It runs each decision through a fixed 24-stage pipeline — from reading the market to logging on-chain — in exactly the same order every time, and streams the whole process live so you can watch it happen on the dashboard second by second. The full process, fully observable.' },
  { num: '006', crate: 'turing-consensus', title: 'PolicyGovernor', tags: 'VOTING • CONSENSUS', loc: '397', size: 'hs-tri', desc: 'Multi-voter consensus engine for trade decisions.',
    full: 'The final vote. Before any trade is committed, several independent voters have to agree under one explicit policy. A single loud model cannot force a trade through — it takes real consensus, which is why the large majority of signals are rejected rather than traded.' },
  { num: '007', crate: 'turing-risk', title: 'Risk Engine', tags: 'KELLY • KILL-SWITCH • ATR', loc: '560', size: 'hs-tri', desc: 'Regime-aware Kelly sizing, KillSwitch, ATR stops, bucket-cap risk management.',
    full: 'The safety layer. It decides how much to risk on each trade using a proven sizing method, tightens or loosens stops based on current volatility, caps total exposure per bucket, and carries a KillSwitch that can halt everything instantly if conditions turn dangerous. It is built to protect capital first.' },
  { num: '008', crate: 'turing-memory', title: 'Persistent Memory', tags: 'GRAPH • SLED • ON-CHAIN', loc: '124', size: 'hs-full', desc: 'HyperEdge graph + sled DB persistent on-chain memory — every decision the swarm makes is remembered and provable.',
    full: 'The swarm’s long-term memory. Every decision, outcome and lesson is stored in a persistent graph and anchored on-chain, so the system can learn from its own history and nothing can be quietly rewritten after the fact. What the agent did last month is still provable today.' },
];

const ROADMAP = [
  { num: 'R1', title: 'Connect any wallet', tags: 'NON-CUSTODIAL', size: 'hs-wide', desc: 'Plug in any crypto wallet. The agent signs, you stay in control.',
    full: 'Bring your own wallet and keep full custody of your funds. The agent is granted only a scoped signing key with spend and session limits it cannot exceed — you can revoke it at any moment. The swarm decides, but the keys stay yours.' },
  { num: 'R2', title: 'Connect exchanges', tags: 'CEX • DEX', size: 'hs-med', desc: 'Route through your CEX / DEX accounts, not just Merchant Moe.',
    full: 'Extend the same consensus engine beyond a single DEX. Route approved trades through your own centralised or decentralised exchange accounts, so the swarm can act wherever your liquidity already lives.' },
  { num: 'R3', title: 'Auto portfolio', tags: 'REBALANCE', size: 'hs-med', desc: 'Auto-build and rebalance a portfolio, sized by the same risk engine.',
    full: 'Move from single trades to a managed portfolio. The agent builds and rebalances positions over time, with every allocation sized by the same risk engine and passed through the same consensus gates that guard individual trades.' },
  { num: 'R4', title: 'Live risk tracking', tags: '24/7 AGENTS', size: 'hs-wide', desc: 'Your positions watched live by our modules and agents.',
    full: 'Your open positions are watched around the clock by the same modules that opened them. Regime shifts, volatility spikes and risk-limit breaches are caught live, and the KillSwitch can step in without waiting for you to be at the screen.' },
  { num: 'R5', title: 'Human jurors', tags: 'HYBRID', size: 'hs-half', desc: 'Plug a human approver into the consensus loop when a use-case needs it.',
    full: 'For desks and institutions that need a human in the loop, an analyst or risk officer can be added as an extra juror in the consensus. The AI does the work and presents the case; a person signs off before capital moves.' },
  { num: 'R6', title: 'Local-only mode', tags: 'PRIVATE', size: 'hs-half', desc: 'Run the full consensus on local models, zero external API, fully private.',
    full: 'Run the entire debate and judging stack on local models, with no external API calls at all. For privacy-sensitive or self-hosted deployments, the swarm never has to depend on third-party gateways to reach a decision.' },
];

/* ── orb with glowing eyes (brand mark) ─────────────── */
function Orb({ x, y, r, tone = 'cyan', delay = 0, variant = 1 }: { x: number; y: number; r: number; tone?: 'cyan' | 'bull' | 'bear' | 'judge'; delay?: number; variant?: 1 | 2 | 3 }) {
  const col = tone === 'bear' ? '#ff9a52' : tone === 'judge' ? '#b98bff' : '#00e5ff';
  const eyeW = r * 0.42, eyeH = r * 0.16, gap = r * 0.14;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={`url(#orbGrad-${tone})`} stroke={col} strokeOpacity={0.5} strokeWidth={1} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={col} strokeOpacity={0.12} strokeWidth={r * 0.5} filter="url(#soft)" />
      <g className={`orb-eyes ov${variant}`} style={{ animationDelay: `${delay}s` }}>
        <rect x={x - gap - eyeW} y={y - eyeH / 2} width={eyeW} height={eyeH} rx={eyeH / 2} fill={col} filter="url(#soft)" />
        <rect x={x + gap} y={y - eyeH / 2} width={eyeW} height={eyeH} rx={eyeH / 2} fill={col} filter="url(#soft)" />
      </g>
    </g>
  );
}

export default function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOpenCards(o => ({ ...o, [k]: !o[k] }));
  const [side, setSide] = useState<'bull' | 'bear' | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('hiw-open');
    return () => { document.removeEventListener('keydown', onKey); document.documentElement.classList.remove('hiw-open'); };
  }, [open, onClose]);

  return createPortal(
    <div className={`hiw ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button className="hiw-close" onClick={onClose} aria-label="Close">&times;</button>

      <div className="hiw-scroll" data-lenis-prevent>
        <header className="hiw-head">
          <div className="hiw-kicker">&#9670; UNDER THE HOOD</div>
          <h1 className="hiw-title">How the swarm actually decides</h1>
          <p className="hiw-sub">A bull and a bear debate every signal across a rotating pool of models. Two independent judges score it. No consensus means no trade &mdash; so out of thousands of verdicts, only a rare few ever become trades. <b>The swarm is built to refuse, not to gamble.</b></p>
        </header>

        {/* ── DEBATE DIAGRAM ── */}
        <section className="hiw-stage">
          <svg viewBox="0 0 1000 620" className="hiw-svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="orbGrad-cyan"><stop offset="0" stopColor="#0a2a34" /><stop offset="1" stopColor="#03141a" /></radialGradient>
              <radialGradient id="orbGrad-bull"><stop offset="0" stopColor="#0a2a34" /><stop offset="1" stopColor="#03141a" /></radialGradient>
              <radialGradient id="orbGrad-bear"><stop offset="0" stopColor="#2a1a0a" /><stop offset="1" stopColor="#1a0f03" /></radialGradient>
              <radialGradient id="orbGrad-judge"><stop offset="0" stopColor="#1a1030" /><stop offset="1" stopColor="#0d0820" /></radialGradient>
              <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" /></filter>
              <linearGradient id="wire" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#00e5ff" stopOpacity="0.1" /><stop offset="0.5" stopColor="#00e5ff" stopOpacity="0.7" /><stop offset="1" stopColor="#00e5ff" stopOpacity="0.1" /></linearGradient>
            </defs>

            {/* ── closed outer contour: macro → bear → meta → bull → macro ── */}
            <g className="hiw-frame" fill="none" stroke="url(#wire)" strokeWidth="1.5">
              <path d="M500,64 Q707.9,161.8 850,305" />
              <path d="M850,305 Q707.9,448.2 500,546" />
              <path d="M500,546 Q292.1,448.2 150,305" />
              <path d="M150,305 Q292.1,161.8 500,64" />
            </g>
            {/* rotating 6-model pool — one clean ring, equal-radius arcs */}
            <g className="hiw-ring" fill="none" stroke="#00e5ff" strokeWidth="1.3">
              <path d="M500,170 A135,135 0 0,1 617,237" />
              <path d="M617,237 A135,135 0 0,1 617,373" />
              <path d="M617,373 A135,135 0 0,1 500,440" />
              <path d="M500,440 A135,135 0 0,1 383,373" />
              <path d="M383,373 A135,135 0 0,1 383,237" />
              <path d="M383,237 A135,135 0 0,1 500,170" />
            </g>
            {/* judges tie into the ring */}
            <g fill="none" stroke="#b98bff" strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="3 4">
              <path d="M500,94 L500,144" />
              <path d="M500,516 L500,466" />
            </g>

            {/* pool orbs — even ring */}
            <Orb x={500} y={170} r={26} delay={0} variant={1} />
            <Orb x={617} y={237} r={26} delay={28} variant={3} />
            <Orb x={617} y={373} r={26} delay={7} variant={2} />
            <Orb x={500} y={440} r={26} delay={35} variant={1} />
            <Orb x={383} y={373} r={26} delay={42} variant={2} />
            <Orb x={383} y={237} r={26} delay={14} variant={3} />
            {/* bull / bear — hover reveals the factors each side brings */}
            <g className="hiw-node" onMouseEnter={() => setSide('bull')} onMouseLeave={() => setSide(null)}>
              <circle cx={150} cy={305} r={66} fill="transparent" />
              <Orb x={150} y={305} r={44} tone="bull" delay={21} variant={1} />
            </g>
            <g className="hiw-node" onMouseEnter={() => setSide('bear')} onMouseLeave={() => setSide(null)}>
              <circle cx={850} cy={305} r={66} fill="transparent" />
              <Orb x={850} y={305} r={44} tone="bear" delay={49} variant={2} />
            </g>
            {/* judges */}
            <Orb x={500} y={64} r={30} tone="judge" delay={30} variant={3} />
            <Orb x={500} y={546} r={30} tone="judge" delay={12} variant={1} />

            {/* labels */}
            <text x={150} y={370} className="hiw-l hiw-l-big" textAnchor="middle">BULL</text>
            <text x={150} y={388} className="hiw-l hiw-l-sm" textAnchor="middle">argues BUY &middot; own prompt</text>
            <text x={850} y={370} className="hiw-l hiw-l-big" textAnchor="middle">BEAR</text>
            <text x={850} y={388} className="hiw-l hiw-l-sm" textAnchor="middle">argues SELL &middot; own prompt</text>
            <text x={500} y={20} className="hiw-l hiw-l-mid" textAnchor="middle" fill="#b98bff">MACRO JUDGE &middot; outside the pool</text>
            <text x={500} y={606} className="hiw-l hiw-l-mid" textAnchor="middle" fill="#b98bff">META JUDGE &middot; outside the pool</text>

            {/* hover capsules — the judge factors each side brings (numbers = judge.rs factor #) */}
            <g className={`hiw-caps bull ${side === 'bull' ? 'on' : ''}`}>
              {BULL_CAPS.map((c, i) => (
                <g key={c.n} transform={`translate(272,${172 + i * 72})`}>
                  <rect x={-84} y={-17} width={168} height={34} rx={17} className="hiw-cap-box" />
                  <circle cx={-63} cy={0} r={11.5} className="hiw-cap-num-bg" />
                  <text x={-63} y={4} textAnchor="middle" className="hiw-cap-num">{c.n}</text>
                  <text x={-45} y={4.5} className="hiw-cap-txt">{c.t}</text>
                </g>
              ))}
            </g>
            <g className={`hiw-caps bear ${side === 'bear' ? 'on' : ''}`}>
              {BEAR_CAPS.map((c, i) => (
                <g key={c.n} transform={`translate(728,${172 + i * 72})`}>
                  <rect x={-84} y={-17} width={168} height={34} rx={17} className="hiw-cap-box" />
                  <circle cx={63} cy={0} r={11.5} className="hiw-cap-num-bg" />
                  <text x={63} y={4} textAnchor="middle" className="hiw-cap-num">{c.n}</text>
                  <text x={45} y={4.5} textAnchor="end" className="hiw-cap-txt">{c.t}</text>
                </g>
              ))}
            </g>
          </svg>

          <div className="hiw-legend">
            <span><i className="dot c" /> 6-model debate pool &mdash; 7 vendors, rotates on failure</span>
            <span><i className="dot j" /> 2 judges &mdash; separate models, score the verdict (no weight-bias)</span>
            <span className="hiw-reject">no mathematical consensus &rarr; <b>instant reject</b></span>
          </div>

          <div className="hiw-roster">
            <div className="hiw-roster-col">
              <span className="hiw-roster-h">Debate pool &mdash; 6 models</span>
              {POOL.map(m => (<span key={m.name} className="hiw-chip"><i className="dot c" />{m.name} <em>{m.vendor}</em></span>))}
            </div>
            <div className="hiw-roster-col">
              <span className="hiw-roster-h">Judges &mdash; separate models</span>
              {JUDGES.map(m => (<span key={m.name} className="hiw-chip"><i className="dot j" />{m.name} <em>{m.vendor} &middot; {m.role}</em></span>))}
            </div>
          </div>

          <div className="hiw-note">
            <b>Full transparency, and independence.</b> Every model is swappable. Soon you will be able to plug in your own local agents, so the swarm never fully depends on third-party gateways like OpenRouter.
          </div>
        </section>

        {/* ── FLOW STRIP ── */}
        <section className="hiw-flow">
          {['Market data', 'Regime (4-state HMM)', 'Bull vs Bear debate', '15-factor judge', '5 pre-trade filters', '8 entry gates', 'Consensus or reject', 'Kelly sizing + kill-switch', 'Execute on Merchant Moe', 'Log on-chain (ERC-8004)'].map((s, i, a) => (
            <span key={s} className="hiw-step">{s}{i < a.length - 1 && <b className="hiw-arrow">&#8594;</b>}</span>
          ))}
        </section>

        {/* ── MODULES ── */}
        <section className="hiw-block">
          <h2 className="hiw-h2">The engine &mdash; 12 Rust crates, 25,365 lines</h2>
          <div className="hiw-grid">
            {MODULES.map(m => (
              <div key={m.crate} className={`hiw-cell ${m.size}`}>
                <article className={`bento-card hiw-mod ${openCards[m.crate] ? 'is-open' : ''}`}>
                  <div className="lusion-dot"></div>
                  <div className="lusion-top-meta"><div>{m.num}</div><div>{m.crate}</div></div>
                  <div className="hiw-mod-body"><p className="hiw-mod-desc">{m.desc}</p></div>
                  <button className={`hiw-expand ${openCards[m.crate] ? 'on' : ''}`} onClick={() => toggle(m.crate)} aria-expanded={!!openCards[m.crate]}>
                    <span className="hiw-expand-ico" />
                    <span>{openCards[m.crate] ? 'Show less' : 'How it works'}</span>
                  </button>
                  <div className="hiw-more"><p>{m.full}</p></div>
                </article>
                <div className="lusion-external-info">
                  <div className="lusion-card-tags">{m.tags} &nbsp;&middot;&nbsp; {m.loc} LOC</div>
                  <h2 className="lusion-card-title">{m.title}</h2>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── ROADMAP ── */}
        <section className="hiw-block">
          <h2 className="hiw-h2">On the roadmap</h2>
          <div className="hiw-grid">
            {ROADMAP.map(r => (
              <div key={r.num} className={`hiw-cell ${r.size}`}>
                <article className={`bento-card hiw-mod hiw-plan ${openCards[r.num] ? 'is-open' : ''}`}>
                  <div className="lusion-dot"></div>
                  <div className="lusion-top-meta"><div>{r.num}</div><div>PLANNED</div></div>
                  <div className="hiw-mod-body"><p className="hiw-mod-desc">{r.desc}</p></div>
                  <button className={`hiw-expand ${openCards[r.num] ? 'on' : ''}`} onClick={() => toggle(r.num)} aria-expanded={!!openCards[r.num]}>
                    <span className="hiw-expand-ico" />
                    <span>{openCards[r.num] ? 'Show less' : 'What this means'}</span>
                  </button>
                  <div className="hiw-more"><p>{r.full}</p></div>
                </article>
                <div className="lusion-external-info">
                  <div className="lusion-card-tags">{r.tags}</div>
                  <h2 className="lusion-card-title">{r.title}</h2>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="hiw-foot">◢◤ MANTLE AI SWARM ◥◣ &middot; built by Triarchy Labs &middot; every decision verifiable on-chain</footer>
      </div>
    </div>,
    document.body
  );
}
