import SectionPage, { type SectionItem } from './SectionPage';

const ITEMS: SectionItem[] = [
  { num: 'R1', tag: 'NON-CUSTODIAL', size: 'hs-wide', title: 'Connect any wallet',
    body: 'Bring your own wallet and keep full custody. The agent gets only a scoped signing key with spend and session limits it cannot exceed, and you can revoke it at any time.' },
  { num: 'R2', tag: 'CEX · DEX', size: 'hs-med', title: 'Connect exchanges',
    body: 'Route approved trades through your own centralised or decentralised exchange accounts, so the swarm can act wherever your liquidity already lives.' },
  { num: 'R3', tag: 'REBALANCE', size: 'hs-med', title: 'Auto portfolio',
    body: 'Move from single trades to a managed portfolio — built and rebalanced over time, every allocation sized by the same risk engine and the same consensus gates.' },
  { num: 'R4', tag: '24/7 AGENTS', size: 'hs-wide', title: 'Live risk tracking',
    body: 'Open positions watched around the clock by the same modules that opened them. Regime shifts and risk-limit breaches are caught live, with the kill-switch ready to step in.' },
  { num: 'R5', tag: 'HYBRID', size: 'hs-half', title: 'Human jurors',
    body: 'An analyst or risk officer can join the consensus as an extra juror — the AI presents the case, a person signs off before capital moves.' },
  { num: 'R6', tag: 'PRIVATE', size: 'hs-half', title: 'Local-only mode',
    body: 'Run the entire debate and judging stack on local models, with zero external API, for privacy-sensitive or self-hosted deployments.' },
];

export default function RoadmapPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SectionPage
      open={open}
      onClose={onClose}
      kicker="◆ ROADMAP"
      title="From an autonomous engine to your whole portfolio."
      sub={<>Today the swarm proves one thing well: disciplined, verifiable trading. Next, the same engine opens up — your wallet, your exchanges, your portfolio, all under the agents’ live risk control. <b>Honest and phased, not everything at once.</b></>}
      heading="What’s next"
      items={ITEMS}
      note={<><b>One principle holds across every step:</b> the swarm may act, but custody, limits and the final say stay with you.</>}
      footer="◢◤ MANTLE AI SWARM ◥◣ · built by Triarchy Labs · phased, honest, non-custodial"
    />
  );
}
