import React, { useState, useEffect, useRef } from 'react';
import { Brain } from 'lucide-react';

interface SovereignMascotPanelProps {
  orbState?: 'idle' | 'thinking' | 'working';
}

interface AgentInfo {
  name: string;
  role: string;
  avatar: string;
  color: string;
  directive: string;
  skills: string;
  load: number;
  latency: number;
}

const AGENTS: Record<'ZEGION' | 'DIABLO' | 'VELDORA', AgentInfo> = {
  ZEGION: {
    name: 'ZEGION',
    role: 'Core Implementation / Executor',
    avatar: '/avatars/zegion.webp',
    color: '#00f5ff',
    directive: 'Исполнение торговых операций, оптимизация газа и вызовы смарт-контрактов на Mantle L2.',
    skills: '.agents/skills/zegion-core/SKILL.md',
    load: 34,
    latency: 12,
  },
  DIABLO: {
    name: 'DIABLO',
    role: 'Core Strategy / Architect',
    avatar: '/avatars/diablo.webp',
    color: '#ff0055',
    directive: 'Макро-анализ платежеспособности, моделирование арбитража и предохранительные лимиты риска.',
    skills: '.agents/skills/diablo-core/SKILL.md',
    load: 58,
    latency: 35,
  },
  VELDORA: {
    name: 'VELDORA',
    role: 'Core Synthesis / Research Oracle',
    avatar: '/avatars/veldora.webp',
    color: '#ffaa00',
    directive: 'Синтез настроений DexScreener, классификация рыночных режимов и векторный поиск паттернов.',
    skills: '.agents/skills/veldora-core/SKILL.md',
    load: 82,
    latency: 95,
  },
};

export default function SovereignMascotPanel({ orbState = 'idle' }: SovereignMascotPanelProps) {
  const [selected, setSelected] = useState<'ZEGION' | 'DIABLO' | 'VELDORA'>('ZEGION');
  const [blink, setBlink] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const faceRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS[selected];

  // Blinking effect
  useEffect(() => {
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Eye tracking mouse movement slightly inside container
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!faceRef.current) return;
    const rect = faceRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 10;
    const y = (e.clientY - rect.top - rect.height / 2) / 10;
    // Cap to maximum offset
    setMousePos({
      x: Math.max(-8, Math.min(8, x)),
      y: Math.max(-6, Math.min(6, y)),
    });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Determine eye styles based on state
  const eyeH = orbState === 'working' ? 6 : orbState === 'thinking' ? 24 : 32;
  const eyeW = orbState === 'working' ? 32 : orbState === 'thinking' ? 14 : 16;
  const eyeR = orbState === 'working' ? '2px' : '8px';
  const eyeBg = orbState === 'working' ? agent.color : '#ffffff';
  const eyeShadow = `0 0 20px ${agent.color}, 0 0 10px ${agent.color}`;

  return (
    <div className="glass snake-border" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div className="card-title">
        <Brain size={16} style={{ color: agent.color }} />
        SWARM MASCOT & SOVEREIGN CORE
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['ZEGION', 'DIABLO', 'VELDORA'] as const).map(name => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            className={`lusion-btn ${selected === name ? 'connect-state-true' : ''}`}
            style={{
              flex: 1,
              fontSize: '11px',
              padding: '6px 0',
              textAlign: 'center',
              border: selected === name ? `1px solid ${AGENTS[name].color}` : '1px solid var(--border)',
              background: selected === name ? `rgba(${name === 'ZEGION' ? '0,245,255' : name === 'DIABLO' ? '255,0,85' : '255,170,0'}, 0.08)` : 'rgba(0,0,0,0.2)',
              color: selected === name ? AGENTS[name].color : 'rgba(255,255,255,0.5)',
              transition: 'all 0.3s ease',
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Mascot Render Area */}
      <div
        ref={faceRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '240px',
          background: 'rgba(5, 5, 12, 0.4)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        {/* Scan line effect */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
          opacity: 0.3,
          boxShadow: `0 0 10px ${agent.color}`,
          animation: 'scanline 4s linear infinite',
          pointerEvents: 'none',
        }} />

        {/* Circular Portal with WebP Avatar */}
        <div style={{
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          border: `2px solid ${agent.color}`,
          boxShadow: `0 0 25px rgba(${selected === 'ZEGION' ? '0,245,255' : selected === 'DIABLO' ? '255,0,85' : '255,170,0'}, 0.25)`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.5s ease',
          marginBottom: '16px',
        }}>
          <img
            src={agent.avatar}
            alt={agent.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.8,
              transition: 'transform 0.5s ease',
            }}
          />
          
          {/* Cybernetic overlay on avatar */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.6) 100%)`,
          }} />
        </div>

        {/* Vector Mascot Eyes Overlay ("Человечек с глазами") */}
        <div style={{
          display: 'flex',
          gap: '28px',
          transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
          transition: 'transform 0.1s ease-out',
          zIndex: 10,
        }}>
          {['left', 'right'].map(side => (
            <div
              key={side}
              style={{
                width: `${eyeW}px`,
                height: blink ? '2px' : `${eyeH}px`,
                background: eyeBg,
                borderRadius: eyeR,
                boxShadow: blink ? 'none' : eyeShadow,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.15s ease-out',
                marginTop: blink ? `${eyeH / 2}px` : '0px',
              }}
            >
              {/* Pupils inside eyes (only visible when not working and not blinking) */}
              {orbState !== 'working' && !blink && (
                <div style={{
                  width: '6px',
                  height: '6px',
                  background: '#040406',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 'calc(50% - 3px)',
                  left: 'calc(50% - 3px)',
                  transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)`,
                  transition: 'transform 0.1s ease-out',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Floating state badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          color: agent.color,
          border: `1px solid ${agent.color}`,
          padding: '2px 8px',
          borderRadius: '4px',
          textTransform: 'uppercase',
          background: 'rgba(0,0,0,0.5)',
          letterSpacing: '1px',
        }}>
          {orbState}
        </div>
      </div>

      {/* Profile Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Назначенная Роль</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{agent.role}</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Оперативная Директива</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', lineHeight: 1.4 }}>{agent.directive}</div>
        </div>

        <div style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Навык</span>
            <span style={{ color: agent.color }}>{agent.name.toLowerCase()}-core</span>
          </div>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', marginTop: '2px', wordBreak: 'break-all' }}>
            {agent.skills}
          </div>
        </div>

        {/* Telemetry metrics bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
              <span style={{ opacity: 0.5 }}>Синаптическая загрузка</span>
              <span style={{ color: agent.color }}>{agent.load}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${agent.load}%`, background: agent.color, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <span style={{ opacity: 0.5 }}>Задержка ядра</span>
            <span style={{ color: agent.color }}>{agent.latency} ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
