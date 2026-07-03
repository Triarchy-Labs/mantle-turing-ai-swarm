import { useState } from 'react';

/* Each milestone is framed as an EXTENSION of something already running under the hood. */
const MILES = [
  { x: 70, when: 'LIVE · NOW', tag: 'MANTLE MAINNET', title: 'Autonomous engine, live', now: true,
    desc: 'Multi-model consensus, a 15-factor judge and every verdict written on-chain to ERC-8004 — running today. Everything ahead builds on this, it does not replace it.' },
  { x: 255, when: 'Q4 2026', tag: 'NON-CUSTODIAL', title: 'Connect any wallet',
    desc: 'The on-chain signer already runs on Alloy 2.0. We open it up: a scoped signing key with spend and session caps you set and can revoke. Custody never leaves you.' },
  { x: 445, when: 'Q1 2027', tag: 'CEX · DEX', title: 'Connect exchanges',
    desc: 'Today execution routes through Merchant Moe / Agni. We make the router pluggable, so the same consensus settles trades through your own exchange accounts.' },
  { x: 625, when: 'Q2 2027', tag: 'PORTFOLIO', title: 'Auto portfolio',
    desc: 'The Kelly engine and BucketCap already size and cap every position. We lift them from single trades to a whole book, rebalanced under the same risk gates.' },
  { x: 805, when: 'Q2–Q3 2027', tag: '24/7 GUARDIAN', title: 'Live risk tracking',
    desc: 'Regime detection, the unstuck recovery ladder and the kill-switch already guard open trades. We turn them into a live guardian over your entire portfolio.' },
  { x: 985, when: 'Q3 2027', tag: 'HUMAN-IN-THE-LOOP', title: 'Human jurors',
    desc: 'PolicyGovernor is already a multi-voter consensus. We add a seat for a human analyst — the swarm argues and scores the case, a person casts the final vote.' },
  { x: 1140, when: 'Q4 2027', tag: 'FULLY PRIVATE', title: 'Local-only mode',
    desc: 'Much of the intelligence already runs on local models in microseconds. We close the loop: the whole stack on-device, zero external API, for private desks.' },
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
