import SectionPage, { type SectionItem } from './SectionPage';
import TimelineWave from './TimelineWave';

const ITEMS: SectionItem[] = [
  { num: 'R1', tag: 'NON-CUSTODIAL', size: 'hs-wide', title: 'Connect any wallet',
    body: 'The on-chain signer already runs on Alloy 2.0. We open it up so you bring your own wallet: the agent gets only a scoped signing key with spend and session limits you set and can revoke at any time. Custody never leaves you.' },
  { num: 'R2', tag: 'BYBIT · CEX · DEX', size: 'hs-med', title: 'Connect exchanges',
    body: 'Today the swarm routes through Merchant Moe and Agni on-chain. Bybit becomes the first centralised exchange we plug in, end of 2026, and from there the router opens to your own CEX / DEX accounts. Mantle stays the core; the exchanges extend the reach.' },
  { num: 'R3', tag: 'REBALANCE', size: 'hs-med', title: 'Auto portfolio',
    body: 'The Kelly engine and BucketCap already size and cap every position. We lift them from single trades to a whole book, building and rebalancing a portfolio under the exact same risk gates.' },
  { num: 'R4', tag: '24/7 AGENTS', size: 'hs-wide', title: 'Live risk tracking',
    body: 'Regime detection, the three-stage unstuck ladder and the kill-switch already guard open trades. We turn them into a live guardian over your entire portfolio, catching regime shifts and limit breaches the moment they happen.' },
  { num: 'R5', tag: 'HYBRID', size: 'hs-half', title: 'Human jurors',
    body: 'PolicyGovernor is already a multi-voter consensus. We add a seat for a human analyst or risk officer, so the swarm argues and scores the case and a person casts the final vote before capital moves.' },
  { num: 'R6', tag: 'PRIVATE', size: 'hs-half', title: 'Local-only mode',
    body: 'Much of the intelligence already runs on local models in microseconds. We complete the loop so the entire debate and judging stack can run on-device, with zero external API, for privacy-first or self-hosted deployments.' },
];

const FRONTIERS = [
  { num: 'F1', tag: 'ACCOUNTABILITY TOKEN', size: 'hs-wide', title: '$OUROBOROS',
    body: 'A token that puts real skin in the game behind the agent: stake a bond that gets slashed if it breaks its own risk limits, tied to the ERC-8004 reputation it already mints from realized PnL. Meme on the outside, accountability underneath, with staking, governance over risk parameters, and a paid seat as a human juror.' },
  { num: 'F2', tag: 'CHAT INTERFACE', size: 'hs-med', title: 'Telegram agent',
    body: 'Trade and ask straight from Telegram. Unlike a black-box bot it sends not just the trade but the reasoning: the bull vs bear case and the judge score, in plain chat.' },
  { num: 'F3', tag: 'KYA · TRUST LAYER', size: 'hs-med', title: 'Agent marketplace',
    body: 'Publish a verifiable agent others can follow, with its on-chain ERC-8004 reputation as the trust layer. Know-Your-Agent for a market where anyone can spin up a bot.' },
  { num: 'F4', tag: 'SMART-MONEY · DATA', size: 'hs-wide', title: 'Alpha & data feed',
    body: 'Open up the swarm’s own smart-money tracking and on-chain anomaly detection as a standalone feed: the same signals the judge already reads, surfaced for people who just want the intel.' },
];

export default function RoadmapPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SectionPage
      open={open}
      onClose={onClose}
      kicker="ROADMAP"
      title="From an autonomous engine to your whole portfolio."
      sub={<>Nothing here is a fresh promise. Every step turns something already running under the hood outward, toward you. <b>Honest and phased, not everything at once.</b></>}
      heading="What’s next"
      items={ITEMS}
      note={<><b>One principle holds across every step:</b> the swarm may act, but custody, limits and the final say stay with you.</>}
      extra={
        <>
          <TimelineWave />

          <section className="hiw-block">
            <div className="hiw-kicker">NEW FRONTIERS · EXPLORING</div>
            <h2 className="hiw-h2">Bigger bets, beyond the core path</h2>
            <div className="hiw-grid">
              {FRONTIERS.map(f => (
                <div key={f.num} className={`hiw-cell ${f.size}`}>
                  <article className="bento-card hiw-mod">
                    <div className="lusion-dot"></div>
                    <div className="lusion-top-meta"><div>{f.num}</div><div>{f.tag}</div></div>
                    <span className="hiw-soon hiw-soon-tag">New frontier</span>
                    <div className="hiw-mod-body"><p className="hiw-mod-desc">{f.body}</p></div>
                  </article>
                  <div className="lusion-external-info">
                    <h2 className="lusion-card-title">{f.title}</h2>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      }
      footer="◢◤ MANTLE AI SWARM ◥◣ · built by Triarchy Labs · phased, honest, non-custodial"
    />
  );
}
