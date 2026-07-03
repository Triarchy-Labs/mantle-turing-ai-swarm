import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type SectionItem = { num: string; tag: string; size: string; title: string; body: string; soon?: boolean };

/* Reusable full-screen overlay page — same shell as How it works (portal, scroll, close, shader bg). */
export default function SectionPage({ open, onClose, kicker, title, sub, heading, items, note, footer }: {
  open: boolean;
  onClose: () => void;
  kicker: string;
  title: ReactNode;
  sub: ReactNode;
  heading: string;
  items: SectionItem[];
  note?: ReactNode;
  footer?: string;
}) {
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
          <div className="hiw-kicker">{kicker}</div>
          <h1 className="hiw-title">{title}</h1>
          <p className="hiw-sub">{sub}</p>
        </header>

        <section className="hiw-block">
          <h2 className="hiw-h2">{heading}</h2>
          <div className="hiw-grid">
            {items.map(p => (
              <div key={p.num} className={`hiw-cell ${p.size}`}>
                <article className="bento-card hiw-mod">
                  <div className="lusion-dot"></div>
                  <div className="lusion-top-meta"><div>{p.num}</div><div>{p.tag}</div></div>
                  {p.soon && <span className="hiw-soon hiw-soon-tag">On the roadmap</span>}
                  <div className="hiw-mod-body"><p className="hiw-mod-desc">{p.body}</p></div>
                </article>
                <div className="lusion-external-info">
                  <h2 className="lusion-card-title">{p.title}</h2>
                </div>
              </div>
            ))}
          </div>
        </section>

        {note && <div className="hiw-note">{note}</div>}
        {footer && <footer className="hiw-foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
