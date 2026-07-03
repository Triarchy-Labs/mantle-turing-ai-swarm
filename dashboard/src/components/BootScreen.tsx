import { useEffect, useState } from 'react';

/* Minimal boot splash — the Ouroboros orb on our dark-cyan field, eyes breathing. */
export default function BootScreen() {
  const [gone, setGone] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setGone(true), 2100);
    const t2 = setTimeout(() => setMounted(false), 2750);
    const dur = 2000, start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setPct(Math.round((1 - Math.pow(1 - t, 1.8)) * 20) * 5); // snap to whole 5s so it doesn't flicker
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { clearTimeout(t1); clearTimeout(t2); cancelAnimationFrame(raf); };
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
      <div className="boot-pct">{pct}</div>
      <div className="boot-progress"><span /></div>
    </div>
  );
}
