import { useEffect, useState } from 'react';

/* Minimal boot splash — the Ouroboros orb on our dark-cyan field, eyes breathing. */
export default function BootScreen() {
  const [gone, setGone] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setGone(true), 2100);
    const t2 = setTimeout(() => setMounted(false), 2750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!mounted) return null;

  return (
    <div className={`boot ${gone ? 'gone' : ''}`} aria-hidden="true">
      <div className="boot-glow" />
      <div className="boot-orb">
        <img src="/assets/images/ouroboros-orb.png" alt="" draggable={false} />
        <span className="boot-eye left" />
        <span className="boot-eye right" />
      </div>
      <div className="boot-word">MANTLE AI SWARM</div>
      <div className="boot-sub">INITIALIZING SWARM</div>
      <div className="boot-progress"><span /></div>
    </div>
  );
}
