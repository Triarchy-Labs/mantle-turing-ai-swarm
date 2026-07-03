import { useEffect } from 'react';

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

const MODULES = [
  { num: '001', crate: 'ouroboros-brain', title: 'LLM Consensus', tags: 'DEBATE • JUDGE • RISK', loc: '3,975', desc: 'Multi-model debate, 15-factor judge, decision memory, circuit breaker, 5 pre-trade filters.' },
  { num: '002', crate: 'titan-core', title: 'Neural Execution', tags: 'GATES • STOPS • RAMP', loc: '4,532', desc: '8-gate entry, trailing SL, RiskMatrix, ConfidenceEngine, 5-phase Auto-Ramp.' },
  { num: '003', crate: 'hive-intel', title: 'Collective Intel', tags: 'ML • MEMORY • REGIME', loc: '12,634', desc: '40+ cognitive modules, local ML under 1µs, 4-state HMM regime, hybrid recall, affective memory.' },
  { num: '004', crate: 'mantle-chain', title: 'On-Chain Adapter', tags: 'ALLOY • ERC-8004 • DEX', loc: '851', desc: 'Alloy 2.0: ERC-8004 registry, wallet signer + live tx broadcast, DexScreener, Merchant Moe / Agni.' },
  { num: '005', crate: 'swarm-engine', title: 'Orchestrator', tags: 'PIPELINE • TELEMETRY', loc: '1,499', desc: '24-stage decision pipeline + telemetry HTTP server + live chain broadcast.' },
  { num: '006', crate: 'turing-consensus', title: 'PolicyGovernor', tags: 'VOTING • CONSENSUS', loc: '397', desc: 'Multi-voter consensus engine for trade decisions.' },
  { num: '007', crate: 'turing-risk', title: 'Risk Engine', tags: 'KELLY • KILL-SWITCH • ATR', loc: '560', desc: 'Regime-aware Kelly sizing, KillSwitch, ATR stops, bucket-cap risk management.' },
  { num: '008', crate: 'turing-memory', title: 'Persistent Memory', tags: 'GRAPH • SLED • ON-CHAIN', loc: '124', desc: 'HyperEdge graph + sled DB persistent on-chain memory.' },
];

const ROADMAP = [
  { num: 'R1', title: 'Connect any wallet', tags: 'NON-CUSTODIAL', desc: 'Plug in any crypto wallet. The agent signs, you stay in control.' },
  { num: 'R2', title: 'Connect exchanges', tags: 'CEX • DEX', desc: 'Route through your CEX / DEX accounts, not just Merchant Moe.' },
  { num: 'R3', title: 'Auto portfolio', tags: 'REBALANCE', desc: 'Auto-build and rebalance a portfolio, sized by the same risk engine.' },
  { num: 'R4', title: 'Live risk tracking', tags: '24/7 AGENTS', desc: 'Your positions watched live by our modules and agents.' },
  { num: 'R5', title: 'Human jurors', tags: 'HYBRID', desc: 'Plug a human approver into the consensus loop when a use-case needs it.' },
  { num: 'R6', title: 'Local-only mode', tags: 'PRIVATE', desc: 'Run the full consensus on local models, zero external API, fully private.' },
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  return (
    <div className={`hiw ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button className="hiw-close" onClick={onClose} aria-label="Close">&times;</button>

      <div className="hiw-scroll">
        <header className="hiw-head">
          <div className="hiw-kicker">&#9670; UNDER THE HOOD</div>
          <h1 className="hiw-title">How the swarm actually decides</h1>
          <p className="hiw-sub">A bull and a bear debate every signal across a rotating pool of models. Two independent judges score it. No consensus means no trade. That is why <b>17,000+ verdicts became only 17 trades.</b></p>
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

            {/* winding connectors */}
            <g className="hiw-wire" fill="none" stroke="url(#wire)" strokeWidth="1.4">
              {/* bull <-> pool */}
              <path d="M 200,310 C 320,180 420,240 500,150" />
              <path d="M 200,310 C 300,340 400,360 480,300" />
              <path d="M 200,310 C 320,470 420,400 500,470" />
              {/* bear <-> pool */}
              <path d="M 800,310 C 680,180 580,240 500,150" />
              <path d="M 800,310 C 700,340 600,360 520,300" />
              <path d="M 800,310 C 680,470 580,400 500,470" />
            </g>
            {/* pool -> judges */}
            <g fill="none" stroke="#b98bff" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="3 4">
              <path d="M 500,150 C 500,100 500,90 500,64" />
              <path d="M 500,470 C 500,520 500,530 500,556" />
            </g>

            {/* pool orbs */}
            <Orb x={500} y={150} r={26} delay={0} variant={1} />
            <Orb x={410} y={230} r={22} delay={31} variant={2} />
            <Orb x={590} y={230} r={22} delay={62} variant={3} />
            <Orb x={410} y={390} r={22} delay={19} variant={2} />
            <Orb x={590} y={390} r={22} delay={88} variant={1} />
            <Orb x={500} y={470} r={26} delay={47} variant={3} />
            {/* bull / bear */}
            <Orb x={200} y={310} r={40} tone="bull" delay={12} variant={1} />
            <Orb x={800} y={310} r={40} tone="bear" delay={73} variant={2} />
            {/* judges */}
            <Orb x={500} y={64} r={30} tone="judge" delay={38} variant={3} />
            <Orb x={500} y={556} r={30} tone="judge" delay={101} variant={1} />

            {/* labels */}
            <text x={200} y={372} className="hiw-l hiw-l-big" textAnchor="middle">BULL</text>
            <text x={200} y={390} className="hiw-l hiw-l-sm" textAnchor="middle">argues BUY &middot; own prompt</text>
            <text x={800} y={372} className="hiw-l hiw-l-big" textAnchor="middle">BEAR</text>
            <text x={800} y={390} className="hiw-l hiw-l-sm" textAnchor="middle">argues SELL &middot; own prompt</text>
            <text x={500} y={22} className="hiw-l hiw-l-mid" textAnchor="middle" fill="#b98bff">MACRO JUDGE &middot; outside the pool</text>
            <text x={500} y={604} className="hiw-l hiw-l-mid" textAnchor="middle" fill="#b98bff">META JUDGE &middot; outside the pool</text>
            <text x={500} y={306} className="hiw-l hiw-l-sm" textAnchor="middle" opacity="0.7">rotating 6-model pool</text>
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
              <article key={m.crate} className="bento-card hiw-mod">
                <div className="lusion-dot"></div>
                <div className="lusion-top-meta"><div>{m.num}</div><div>{m.crate}</div></div>
                <div className="hiw-mod-body"><p className="hiw-mod-desc">{m.desc}</p></div>
                <div className="lusion-card-tags">{m.tags} &nbsp;&middot;&nbsp; {m.loc} LOC</div>
                <h2 className="lusion-card-title">{m.title}</h2>
              </article>
            ))}
          </div>
        </section>

        {/* ── ROADMAP ── */}
        <section className="hiw-block">
          <h2 className="hiw-h2">On the roadmap</h2>
          <div className="hiw-grid">
            {ROADMAP.map(r => (
              <article key={r.num} className="bento-card hiw-mod hiw-plan">
                <div className="lusion-dot"></div>
                <div className="lusion-top-meta"><div>{r.num}</div><div>PLANNED</div></div>
                <div className="hiw-mod-body"><p className="hiw-mod-desc">{r.desc}</p></div>
                <div className="lusion-card-tags">{r.tags}</div>
                <h2 className="lusion-card-title">{r.title}</h2>
              </article>
            ))}
          </div>
        </section>

        <footer className="hiw-foot">◢◤ MANTLE AI SWARM ◥◣ &middot; built by Triarchy Labs &middot; every decision verifiable on-chain</footer>
      </div>
    </div>
  );
}
