import SectionPage, { type SectionItem } from './SectionPage';

const ITEMS: SectionItem[] = [
  { num: '01', tag: 'START HERE · SIMPLE MODE', size: 'hs-wide', title: 'Not sure what you’re looking at? Just ask.',
    body: 'The Swarm Agent panel is your control point. Type a question in plain language, like “what are you doing right now?” or “why did you skip that trade?”, and it explains the whole dashboard for you. If you only use one thing, use this.' },
  { num: '02', tag: 'DECISION JOURNAL', size: 'hs-med', title: 'Follow a single verdict end-to-end',
    body: 'The Decision Journal lists every verdict. Open one to see the bull vs bear arguments, the two judges’ scores and the factors behind it, so you can see exactly why the swarm bought, sold, or refused.' },
  { num: '03', tag: 'EXECUTION PIPELINE', size: 'hs-med', title: 'Watch it think, live',
    body: 'The Execution panel shows each decision moving through its 24 stages, from reading the market to logging on-chain. It is the real-time view of the process, and nothing happens off-screen.' },
  { num: '04', tag: 'RISK · AUTO-RAMP', size: 'hs-wide', title: 'See and steer the risk',
    body: 'The Risk panel shows current exposure, the circuit-breaker state and the Auto-Ramp phase (SEED → APEX). You can see (and in full mode adjust) how aggressively capital scales. It only ramps up when the track record earns it.' },
  { num: '05', tag: 'ON-CHAIN ACTIVITY', size: 'hs-full', title: 'Trust nothing, check everything',
    body: 'The On-chain Activity panel links every trade and verdict straight to Mantlescan and the ERC-8004 registry. Click through and confirm it yourself. The dashboard is a window, the chain is the source of truth.' },
];

export default function DocsPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SectionPage
      open={open}
      onClose={onClose}
      kicker="◆ DOCS · HOW TO USE"
      title="A glass box, not a black box."
      sub={<>Every panel on the dashboard is readable, and if anything is unclear you can simply ask the built-in assistant. <b>Here is how to actually use it.</b></>}
      heading="Using the console"
      items={ITEMS}
      note={<><b>Rule of thumb:</b> if you don’t know what a panel means, ask the assistant. It reads the same data you see and explains it in plain words.</>}
      footer="◢◤ MANTLE AI SWARM ◥◣ · built by Triarchy Labs · readable by design"
    />
  );
}
