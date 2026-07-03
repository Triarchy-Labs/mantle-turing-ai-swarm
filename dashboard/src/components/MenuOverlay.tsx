import { useEffect } from 'react';

const NAV = [
  { label: 'Home', href: '#top' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Docs / How to use', href: '#docs' },
  { label: 'For Retail', href: '#retail' },
  { label: 'For Institutions', href: '#institutions' },
  { label: 'Mission', href: '#mission' },
  { label: 'Roadmap', href: '#roadmap' },
];

const REGISTRY = 'https://mantlescan.xyz/address/0xEb271ece1aB2f72835556Ee67ad0BCA36a378a66';
const WALLET = 'https://mantlescan.xyz/address/0xF02332A7d92C86631Ea30d49D9778994B9277c79';

const PROOF = [
  { label: 'Live Dashboard', href: '/' },
  { label: 'GitHub', href: 'https://github.com/Triarchy-Labs/mantle-turing-ai-swarm' },
  { label: 'ERC-8004 Registry', href: REGISTRY },
  { label: 'Agent NFT', href: REGISTRY },
  { label: 'Mantlescan', href: WALLET },
];

export default function MenuOverlay({ open, onClose, onOpenHowItWorks }: { open: boolean; onClose: () => void; onOpenHowItWorks?: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const ext = (href: string) => href.startsWith('http');

  return (
    <div className={`menu-overlay ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="menu-backdrop" onClick={onClose} />
      <div className="menu-panel" role="dialog" aria-modal="true" aria-label="Site menu">
        <button className="menu-close" onClick={onClose} aria-label="Close menu">&times;</button>

        <div className="menu-grid">
          <div className="menu-left">
            <div className="menu-accent">&#9670; Explore the system</div>
            <h2 className="menu-headline">Autonomous intelligence<br />you can audit.</h2>
            <div className="menu-rule" />
            <a className="menu-contact" href="https://github.com/Triarchy-Labs" target="_blank" rel="noreferrer">github.com/Triarchy-Labs</a>
            <a className="menu-cta" href="/">Open live dashboard <span>&#8599;</span></a>
          </div>

          <nav className="menu-col" aria-label="Navigation">
            <div className="menu-col-title">NAVIGATION</div>
            {NAV.map((i, idx) => (
              <a key={i.label} className={`menu-link ${idx === 0 ? 'active' : ''}`} href={i.href}
                 onClick={(e) => {
                   if (i.label === 'How it works' && onOpenHowItWorks) { e.preventDefault(); onOpenHowItWorks(); }
                   onClose();
                 }}>{i.label}</a>
            ))}
          </nav>

          <div className="menu-col">
            <div className="menu-col-title">ON-CHAIN / PROOF</div>
            {PROOF.map((i) => (
              <a key={i.label} className="menu-link menu-link-sm" href={i.href}
                 target={ext(i.href) ? '_blank' : undefined} rel="noreferrer" onClick={onClose}>{i.label}</a>
            ))}
            <div className="menu-col-title" style={{ marginTop: '2rem' }}>BUILT ON</div>
            <div className="menu-sub">Mantle L2 &middot; Chain 5000 &middot; ERC-8004</div>
          </div>
        </div>

        <div className="menu-foot">
          <span>&copy; Triarchy Labs. All rights reserved.</span>
          <span className="menu-foot-mid">The Turing Test Hackathon 2026</span>
          <span className="menu-foot-links">
            <a href="https://x.com/mod_minimal" target="_blank" rel="noreferrer">X</a>
            <a href="https://github.com/Triarchy-Labs" target="_blank" rel="noreferrer">GitHub</a>
          </span>
        </div>
      </div>
    </div>
  );
}
