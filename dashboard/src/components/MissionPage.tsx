import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/* ── principles — every claim grounded in the actual engine ─────────── */
const MISSION = [
  { num: '01', tag: 'FINANCIAL INCLUSION', size: 'hs-wide', title: 'Institutional tools, democratized',
    body: 'Risk discipline, multi-model consensus and a hard kill-switch are usually reserved for institutions, behind large minimums. The swarm keeps that same institutional-grade control and puts it in an ordinary person’s hands too, for free.' },
  { num: '02', tag: 'CONSUMER PROTECTION', size: 'hs-med', title: 'Protection from scams',
    body: 'Every decision is written on-chain and the agent’s reputation is earned from real, verified PnL, so it cannot be faked. In a space full of black-box bots that quietly rug retail, a fully auditable agent protects the small user from fraud.' },
  { num: '03', tag: 'HARM REDUCTION', size: 'hs-med', title: 'Engineered not to gamble',
    body: 'Eight entry gates, five pre-trade filters, a circuit breaker, and an Auto-Ramp that only scales capital when it is actually working: it requires a positive 7-day PnL and a win rate above 45% to grow, and steps back down on losses. Most retail loses to casino-style trading; this agent is built to refuse.' },
  { num: '04', tag: 'ACCESSIBILITY', size: 'hs-wide', title: 'Open and accessible',
    body: 'Much of the intelligence runs on local, open models in microseconds, so it stays reachable for people without capital or expensive API access, never gated behind a paywall.' },
  { num: '05', tag: 'PUBLIC GOOD · ERC-8004', size: 'hs-full', title: 'Verifiable AI as a public good',
    body: 'On-chain reputation and reproducible reasoning contribute to a shared, open standard for trustworthy autonomous agents, a benefit to the whole ecosystem, not just our own returns.' },
];

export default function MissionPage({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          <div className="hiw-kicker">&#9670; MISSION &middot; WHY IT MATTERS</div>
          <h1 className="hiw-title">Institutional discipline, in everyone&rsquo;s hands.</h1>
          <p className="hiw-sub">The discipline and verifiability that usually live inside institutions should not stay locked there. We keep them institutional-grade and open them up, so the same standard is <b>accessible, auditable and safe for everyone.</b></p>
        </header>

        <section className="hiw-block">
          <h2 className="hiw-h2">What &ldquo;good&rdquo; actually means here</h2>
          <div className="hiw-grid">
            {MISSION.map(p => (
              <div key={p.num} className={`hiw-cell ${p.size}`}>
                <article className="bento-card hiw-mod">
                  <div className="lusion-dot"></div>
                  <div className="lusion-top-meta"><div>{p.num}</div><div>{p.tag}</div></div>
                  <div className="hiw-mod-body"><p className="hiw-mod-desc">{p.body}</p></div>
                </article>
                <div className="lusion-external-info">
                  <h2 className="lusion-card-title">{p.title}</h2>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="hiw-note">
          <b>Transparency, protection and access.</b> The three things that make autonomous finance genuinely good for the people who use it, whoever they are.
        </div>

        <footer className="hiw-foot">◢◤ MANTLE AI SWARM ◥◣ &middot; built by Triarchy Labs &middot; institutional-grade protection, made accessible</footer>
      </div>
    </div>,
    document.body
  );
}
