import SectionPage, { type SectionItem } from './SectionPage';

const ITEMS: SectionItem[] = [
  { num: '01', tag: 'MULTI-MODEL CONSENSUS', size: 'hs-wide', title: 'No single-model bias',
    body: 'Eight models across seven vendors debate every signal, and two independent judges score the result. No consensus means no trade. There is no single model, prompt or vendor that can move capital on its own.' },
  { num: '02', tag: '15-FACTOR JUDGE', size: 'hs-med', title: 'Quantitative, not a black box',
    body: 'Each verdict is a transparent 15-factor score: price trend, funding, open interest, volume, an ML prediction, macro bias, the 4-hour trend, liquidations, memory and event-risk. Reproducible and inspectable, not vibes.' },
  { num: '03', tag: 'ERC-8004', size: 'hs-med', title: 'A compliance-grade audit trail',
    body: 'Every AI verdict and executed trade is written to a public on-chain registry with reproducible reasoning, independently verifiable on Mantlescan. Full provenance, verifiable rather than taken on trust.' },
  { num: '04', tag: 'RISK · KILL-SWITCH', size: 'hs-wide', title: 'Control and safety rails',
    body: 'Regime-aware position sizing, per-bucket exposure caps, a circuit breaker and a kill-switch that halts everything instantly. The risk discipline a desk expects, enforced in code rather than by policy.' },
  { num: '05', tag: 'HYBRID · PRIVATE', size: 'hs-full', soon: true, title: 'Human-in-the-loop or fully private',
    body: 'Add a human approver as an extra juror in the consensus when a mandate requires it, or run the entire stack on local models with zero external API for privacy-sensitive deployments.' },
];

export default function InstitutionsPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SectionPage
      open={open}
      onClose={onClose}
      kicker="◆ FOR INSTITUTIONS"
      title="Autonomous execution you can actually audit."
      sub={<>Consensus that removes single-model risk, a quantitative judge instead of a black box, and an on-chain trail for every decision. <b>Verifiable, controllable, and built for compliance.</b></>}
      heading="Why a desk can trust it"
      items={ITEMS}
      note={<><b>Every decision is provable.</b> Reproducible reasoning, an ERC-8004 audit trail, and hard risk limits enforced in code. Not a promise, a receipt.</>}
      footer="◢◤ MANTLE AI SWARM ◥◣ · built by Triarchy Labs · every decision verifiable on-chain"
    />
  );
}
