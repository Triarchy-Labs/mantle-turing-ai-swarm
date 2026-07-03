import { useEffect, useState } from 'react';

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
  { crate: 'ouroboros-brain', loc: '3,975', desc: 'LLM consensus: multi-model debate, 15-factor judge, decision memory, circuit breaker, 5 pre-trade filters.' },
  { crate: 'titan-core', loc: '4,532', desc: 'Neural execution brain: 8-gate entry, trailing SL, RiskMatrix, ConfidenceEngine, 5-phase Auto-Ramp.' },
  { crate: 'hive-intel', loc: '12,634', desc: '40+ cognitive modules, local ML <1µs, 4-state HMM regime, hybrid recall, affective memory.' },
  { crate: 'mantle-chain', loc: '851', desc: 'Alloy 2.0 on-chain: ERC-8004 registry, wallet signer + live tx broadcast, DexScreener, Merchant Moe / Agni.' },
  { crate: 'swarm-engine', loc: '1,499', desc: 'Main orchestrator: 24-stage pipeline + telemetry HTTP server + live chain broadcast.' },
  { crate: 'turing-consensus', loc: '397', desc: 'PolicyGovernor: multi-voter consensus engine for trade decisions.' },
  { crate: 'turing-risk', loc: '560', desc: 'Regime-aware Kelly sizing, KillSwitch, ATR stops, bucket-cap risk management.' },
  { crate: 'turing-memory', loc: '124', desc: 'HyperEdge graph + sled DB persistent on-chain memory.' },
];

const ROADMAP = [
  { t: 'Connect any wallet', d: 'Plug in any crypto wallet, non-custodial. The agent signs, you stay in control.' },
  { t: 'Connect exchanges', d: 'Route through your CEX / DEX accounts, not just Merchant Moe.' },
  { t: 'Auto portfolio', d: 'Auto-build and rebalance a portfolio, sized by the same risk engine.' },
  { t: 'Live risk tracking', d: 'Your positions watched live by our modules and agents, 24/7.' },
  { t: 'Human jurors', d: 'Plug a human approver or analyst into the consensus loop when a use-case needs it.' },
  { t: 'Local-only mode', d: 'Run the full consensus on local models, zero external API, fully private.' },
];

/* ── orb with glowing eyes (brand mark) ─────────────── */
function Orb({ x, y, r, tone = 'cyan', dim = false }: { x: number; y: number; r: number; tone?: 'cyan' | 'bull' | 'bear' | 'judge'; dim?: boolean }) {
  const col = tone === 'bear' ? '#ff9a52' : tone === 'judge' ? '#b98bff' : '#00e5ff';
  const eyeW = r * 0.42, eyeH = r * 0.16, gap = r * 0.14;
  return (
    <g opacity={dim ? 0.5 : 1}>
      <circle cx={x} cy={y} r={r} fill={`url(#orbGrad-${tone})`} stroke={col} strokeOpacity={0.5} strokeWidth={1} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={col} strokeOpacity={0.12} strokeWidth={r * 0.5} filter="url(#soft)" />
      <rect x={x - gap - eyeW} y={y - eyeH / 2} width={eyeW} height={eyeH} rx={eyeH / 2} fill={col} filter="url(#soft)" />
      <rect x={x + gap} y={y - eyeH / 2} width={eyeW} height={eyeH} rx={eyeH / 2} fill={col} filter="url(#soft)" />
    </g>
  );
}

export default function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [hover, setHover] = useState<string | null>(null);
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
            <g fill="none" stroke="url(#wire)" strokeWidth="1.4">
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
            <Orb x={500} y={150} r={26} />
            <Orb x={410} y={230} r={22} />
            <Orb x={590} y={230} r={22} />
            <Orb x={410} y={390} r={22} />
            <Orb x={590} y={390} r={22} />
            <Orb x={500} y={470} r={26} />
            {/* bull / bear */}
            <Orb x={200} y={310} r={40} tone="bull" />
            <Orb x={800} y={310} r={40} tone="bear" />
            {/* judges */}
            <Orb x={500} y={64} r={30} tone="judge" />
            <Orb x={500} y={556} r={30} tone="judge" />

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
          <div className="hiw-cards">
            {MODULES.map(m => (
              <article key={m.crate} className={`hiw-card ${hover === m.crate ? 'hot' : ''}`} onMouseEnter={() => setHover(m.crate)} onMouseLeave={() => setHover(null)}>
                <div className="hiw-card-top"><span className="hiw-crate">{m.crate}</span><span className="hiw-loc">{m.loc} LOC</span></div>
                <p className="hiw-card-desc">{m.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── ROADMAP ── */}
        <section className="hiw-block">
          <h2 className="hiw-h2">On the roadmap</h2>
          <div className="hiw-cards">
            {ROADMAP.map(r => (
              <article key={r.t} className="hiw-card hiw-card-plan">
                <div className="hiw-card-top"><span className="hiw-crate">{r.t}</span><span className="hiw-soon">planned</span></div>
                <p className="hiw-card-desc">{r.d}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="hiw-foot">◢◤ MANTLE AI SWARM ◥◣ &middot; built by Triarchy Labs &middot; every decision verifiable on-chain</footer>
      </div>
    </div>
  );
}
