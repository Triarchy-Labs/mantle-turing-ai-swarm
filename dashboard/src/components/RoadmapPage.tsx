import SectionPage, { type SectionItem } from './SectionPage';
import TimelineWave from './TimelineWave';

const ITEMS: SectionItem[] = [
  { num: 'R1', tag: 'NON-CUSTODIAL', size: 'hs-wide', title: 'Connect any wallet',
    body: 'The on-chain signer already runs on Alloy 2.0. We open it up so you bring your own wallet: the agent gets only a scoped signing key with spend and session limits you set and can revoke at any time. Custody never leaves you.' },
  { num: 'R2', tag: 'CEX · DEX', size: 'hs-med', title: 'Connect exchanges',
    body: 'Today the swarm routes through Merchant Moe and Agni. We make the router pluggable, so the same consensus can settle approved trades through your own CEX or DEX accounts, wherever your liquidity already lives.' },
  { num: 'R3', tag: 'REBALANCE', size: 'hs-med', title: 'Auto portfolio',
    body: 'The Kelly engine and BucketCap already size and cap every position. We lift them from single trades to a whole book — building and rebalancing a portfolio under the exact same risk gates.' },
  { num: 'R4', tag: '24/7 AGENTS', size: 'hs-wide', title: 'Live risk tracking',
    body: 'Regime detection, the three-stage unstuck ladder and the kill-switch already guard open trades. We turn them into a live guardian over your entire portfolio, catching regime shifts and limit breaches the moment they happen.' },
  { num: 'R5', tag: 'HYBRID', size: 'hs-half', title: 'Human jurors',
    body: 'PolicyGovernor is already a multi-voter consensus. We add a seat for a human analyst or risk officer, so the swarm argues and scores the case and a person casts the final vote before capital moves.' },
  { num: 'R6', tag: 'PRIVATE', size: 'hs-half', title: 'Local-only mode',
    body: 'Much of the intelligence already runs on local models in microseconds. We complete the loop so the entire debate and judging stack can run on-device, with zero external API, for privacy-first or self-hosted deployments.' },
];

export default function RoadmapPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SectionPage
      open={open}
      onClose={onClose}
      kicker="◆ ROADMAP"
      title="From an autonomous engine to your whole portfolio."
      sub={<>Nothing here is a fresh promise — every step turns something already running under the hood outward, toward you. <b>Honest and phased, not everything at once.</b></>}
      heading="What’s next"
      items={ITEMS}
      note={<><b>One principle holds across every step:</b> the swarm may act, but custody, limits and the final say stay with you.</>}
      extra={<TimelineWave />}
      footer="◢◤ MANTLE AI SWARM ◥◣ · built by Triarchy Labs · phased, honest, non-custodial"
    />
  );
}
