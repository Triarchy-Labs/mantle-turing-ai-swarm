import SectionPage, { type SectionItem } from './SectionPage';

const ITEMS: SectionItem[] = [
  { num: '01', tag: 'SIMPLE MODE', size: 'hs-wide', title: 'Just ask, no dashboard required',
    body: 'You don’t need to read a single chart. A built-in AI assistant sits inside the dashboard and explains, in plain language, what the swarm is doing and why. Ask it anything. You never trade blind.' },
  { num: '02', tag: 'AUTO-RAMP', size: 'hs-med', title: 'Starts small, grows only when it works',
    body: 'Capital begins at the smallest “SEED” phase, risking a tiny slice. It scales up only after a positive 7-day PnL and a win rate above 45%, and steps straight back down on losses, so a bad run can’t drain your savings.' },
  { num: '03', tag: 'RISK CONTROL', size: 'hs-med', title: 'Institutional protection for your wallet',
    body: 'The same eight entry gates, pre-trade filters, circuit breaker and kill-switch a fund relies on are working here for an ordinary person’s capital, not locked behind a big minimum.' },
  { num: '04', tag: 'TRANSPARENCY', size: 'hs-wide', title: 'See everything, verify anything',
    body: 'Every decision is logged on-chain in a public ERC-8004 registry. You can open Mantlescan and check exactly what the agent decided and did. Nothing is hidden off-chain.' },
  { num: '05', tag: 'NON-CUSTODIAL', size: 'hs-full', soon: true, title: 'Your keys stay yours',
    body: 'Soon you’ll connect your own wallet and the agent will get only a scoped signing key with spend and session limits you set and can revoke at any time. The swarm decides; you stay in control.' },
];

export default function RetailPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SectionPage
      open={open}
      onClose={onClose}
      kicker="◆ FOR RETAIL"
      title="Institutional-grade trading, without the institution."
      sub={<>Most people lose money to casino-style trading. This is the opposite: a disciplined agent that protects your savings, explains itself in plain language, and <b>can’t be scammed by a black box.</b></>}
      heading="What you actually get"
      items={ITEMS}
      note={<><b>You don’t need to be an expert.</b> The swarm brings the discipline; the assistant makes it understandable; the chain makes it verifiable.</>}
      footer="◢◤ MANTLE AI SWARM ◥◣ · built by Triarchy Labs · protection first, for everyone"
    />
  );
}
