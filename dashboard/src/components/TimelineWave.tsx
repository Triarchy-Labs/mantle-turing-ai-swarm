import { useState } from 'react';

/* Each milestone is framed as an EXTENSION of something already running under the hood. */
const MILES = [
  { x: 60, when: 'LIVE · NOW', tag: 'MANTLE MAINNET', title: 'Autonomous engine, live', now: true,
    desc: 'Multi-model consensus, a 15-factor judge and every verdict written on-chain to ERC-8004, running today. Everything ahead builds on this, it does not replace it.' },
  { x: 225, when: 'Q4 2026', tag: 'NON-CUSTODIAL', title: 'Connect any wallet',
    desc: 'The on-chain signer already runs on Alloy 2.0. We open it up: a scoped signing key with spend and session caps you set and can revoke. Custody never leaves you.' },
  { x: 405, when: 'Q4 2026 – Q1 2027', tag: 'BYBIT · FIRST CEX', title: 'Bybit integration',
    desc: 'Bybit becomes the first centralised exchange the swarm can act through, alongside the on-chain Merchant Moe / Agni routing it already uses. Mantle stays the core; Bybit extends the reach.' },
  { x: 585, when: 'Q1 2027', tag: 'CEX · DEX', title: 'Connect your exchanges',
    desc: 'We make the router fully pluggable, so the same consensus can settle approved trades through your own exchange accounts, wherever your liquidity already lives.' },
  { x: 760, when: 'Q2 2027', tag: 'PORTFOLIO', title: 'Auto portfolio',
    desc: 'The Kelly engine and BucketCap already size and cap every position. We lift them from single trades to a whole book, rebalanced under the same risk gates.' },
  { x: 935, when: 'Q2–Q3 2027', tag: '24/7 GUARDIAN', title: 'Live risk tracking',
    desc: 'Regime detection, the unstuck ladder and the kill-switch already guard open trades. We turn them into a live guardian over your entire portfolio.' },
  { x: 1080, when: 'Q3–Q4 2027', tag: 'HYBRID · PRIVATE', title: 'Human jurors & local-only',
    desc: 'PolicyGovernor already runs a multi-voter consensus, and we add a seat for a human analyst. And since much of the intelligence is already local, the whole stack can run on-device, zero external API.' },
];

const W = 1200, H = 320, MID = 210, AMP = 22;
const wave = (x: number) => MID + AMP * Math.sin((x / W) * Math.PI * 5 + 0.6);

const PATH = (() => {
  let d = `M 20 ${wave(20).toFixed(1)}`;
  for (let x = 26; x <= 1180; x += 6) d += ` L ${x} ${wave(x).toFixed(1)}`;
  return d;
})();

export default function TimelineWave() {
  const [hi, setHi] = useState<number | null>(null);
  const TW = 300;

  return (
    <div className="tl-wrap">
      <div className="tl-head">
        <span className="tl-year">2026</span>
        <span className="tl-title">THE BUILD PATH</span>
        <span className="tl-year">2027</span>
      </div>

      <svg className="tl-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="tlGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#00e5ff" stopOpacity="0.28" />
            <stop offset="0.5" stopColor="#00e5ff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#3a7bff" stopOpacity="0.32" />
          </linearGradient>
          <filter id="tlGlow" x="-10%" y="-60%" width="120%" height="220%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* soft neon underglow */}
        <path d={PATH} fill="none" stroke="#00e5ff" strokeOpacity="0.4" strokeWidth="7" filter="url(#tlGlow)" />
        {/* the one molten line */}
        <path className="tl-line" d={PATH} fill="none" stroke="url(#tlGrad)" strokeWidth="2.2" strokeLinecap="round" />
        {/* a single bright pulse gliding along it */}
        <path className="tl-flow" d={PATH} fill="none" stroke="#c8f9ff" strokeWidth="2.6" strokeLinecap="round" pathLength={1200} />

        {MILES.map((m, i) => {
          const y = wave(m.x);
          const active = hi === i;
          const tx = Math.min(Math.max(m.x - TW / 2, 8), W - TW - 8);
          return (
            <g key={i} className={`tl-node ${active ? 'on' : ''} ${m.now ? 'now' : ''}`}
               onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
              <circle cx={m.x} cy={y} r={30} fill="transparent" />
              <line className="tl-tick" x1={m.x} y1={y} x2={m.x} y2={H - 52} />
              {m.now && <circle className="tl-pulse" cx={m.x} cy={y} />}
              <circle className="tl-dot" cx={m.x} cy={y} r={active ? 9 : 6} />
              <text className="tl-when" x={m.x} y={H - 30} textAnchor="middle">{m.when}</text>

              {active && (
                <foreignObject x={tx} y={Math.max(y - 156, 2)} width={TW} height="150">
                  <div className="tl-card">
                    <div className="tl-card-tag">{m.tag}</div>
                    <div className="tl-card-title">{m.title}</div>
                    <div className="tl-card-desc">{m.desc}</div>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
