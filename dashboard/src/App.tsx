import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { Activity, Zap, Globe, Terminal, Network, Layers, Cpu, Eye, TrendingUp } from 'lucide-react';
import './index.css';
import LiquidGlassShader from './components/LiquidGlassShader';
import { AnimatedArchitecture } from './components/AnimatedArchitecture';
import CustomCursor from './components/CustomCursor';
import { WebGLErrorBoundary } from './components/WebGLErrorBoundary';

/* ── Market data ── */
const marketData = [
	{ sym: 'MNT', price: '$0.7833', vol: '$1,248,092', change: '+4.58%', up: true, conf: 82.5, verdict: 'BUY' },
	{ sym: 'WMNT', price: '$0.7841', vol: '$842,104', change: '+4.64%', up: true, conf: 78.4, verdict: 'BUY' },
	{ sym: 'ETH', price: '$3,224.03', vol: '$41,209,500', change: '-1.75%', up: false, conf: 55.6, verdict: 'HOLD' },
];

/* ── Pipeline stages ── */
const pipelineStages = [
	{ n: '01', label: 'MARKET DATA INGESTION' },
	{ n: '02', label: 'TREND REGIME DETECTION' },
	{ n: '03', label: 'SYNAPTIC AI DEBATE' },
	{ n: '04', label: 'LOCAL ML PREDICTION' },
	{ n: '05', label: 'VECTOR ARCHIVE SEARCH' },
	{ n: '06', label: 'WEIGHTED FACTOR JUDGE' },
	{ n: '07', label: 'PRE-EXECUTION AUDIT' },
	{ n: '08', label: 'ENTRY POINT DETECTION' },
	{ n: '09', label: 'SWARM ORDER CONSENSUS' },
	{ n: '10', label: 'RISK MATRIX ANALYSIS' },
	{ n: '11', label: 'SYNTHETIC SIMULATION' },
	{ n: '12', label: 'SYNAPTIC LOGGING' },
	{ n: '13', label: 'ON-CHAIN TX COMMIT' },
];

/* ── Synaptic debate ── */
const debates = [
	{ agent: 'Veldora (Synthesis)', color: '#a855f7', msg: 'Trade volume surged 14% in 4h. Movement vector confirms BUY signal.', time: new Date().toLocaleTimeString('en-US', { hour12: false }) },
	{ agent: 'Zegion (Executor)', color: '#00f5ff', msg: 'Must verify liquidity depth on Agni pools before order entry.', time: new Date().toLocaleTimeString('en-US', { hour12: false }) },
	{ agent: 'Diablo (Architect)', color: '#00d4ff', msg: 'SMA(20) crossed above SMA(50). Strong bullish impulse for MNT.', time: new Date().toLocaleTimeString('en-US', { hour12: false }) },
];

/* ── Log entries (staggered timestamps) ── */
const LOG_OFFSETS = [47, 42, 38, 33, 27, 22, 17, 12, 6, 1];
const logEntries = [
	{ off: 0, tag: '[SYNAPSE]', msg: 'Veldora (Synthesis): Trade volume surged 14% in 4h. Vector confirms...', type: '' },
	{ off: 1, tag: '[ANALYSIS]', msg: 'MNT trend strength index at 72.3%. Market regime: Bullish.', type: '' },
	{ off: 2, tag: '[SYNAPSE]', msg: 'Launching arbiter contest between Diablo and Zegion...', type: '' },
	{ off: 3, tag: '[ML]', msg: 'Local ML prediction complete. Asset growth probability: 81.2%', type: '' },
	{ off: 4, tag: '[VECTOR]', msg: 'Similar pattern found from 2026-05-27 in vector archive. Success: 89%', type: 'success' },
	{ off: 5, tag: '[JUDGE]', msg: 'Seven factors analyzed. Final verdict: BUY with weight 1.75.', type: '' },
	{ off: 6, tag: '[AUDIT]', msg: 'Slippage and front-running risk checks: all passed.', type: 'success' },
	{ off: 7, tag: '[ENTRY]', msg: 'Optimal entry point detected: $0.7852. Launching swarm orders.', type: '' },
	{ off: 8, tag: '[CONSENSUS]', msg: 'Swarm Consensus reached: BUY with 82.5% probability.', type: 'success' },
	{ off: 9, tag: '[RISK]', msg: 'Risk limit checks passed: margin deviation < 2%. No risks.', type: '' },
];

/* ── Orbiting tech cards around 3D stone ── */
const techCards = [
	{ label: 'ERC-8004', desc: 'Swarm Identity NFT', angle: 0 },
	{ label: 'Curl-Noise', desc: 'GPGPU Particle Physics', angle: 60 },
	{ label: 'IPC mmap()', desc: 'Zero-Copy L0 Shared Memory', angle: 120 },
	{ label: '6-Layer Brain', desc: 'Multi-Agent Decision Engine', angle: 180 },
	{ label: 'Rust WASM', desc: '12-Container Architecture', angle: 240 },
	{ label: 'Mantle L2', desc: 'Low-Fee On-Chain Settlement', angle: 300 },
];

/* ── AgentOrb ── */
function AgentOrb({ state = 'idle' }: { state?: 'idle' | 'thinking' | 'working' }) {
	const [blink, setBlink] = useState(false);
	useEffect(() => {
		const t = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 200); }, 3500);
		return () => clearInterval(t);
	}, []);
	const orbClass = `agent-orb ${state}`;
	const eyeH = state === 'working' ? 10 : state === 'thinking' ? 30 : 38;
	const eyeR = state === 'working' ? '4px' : '12px';
	const eyeBg = state === 'working' ? 'var(--accent-hover)' : '#fff';
	const eyeShadow = state === 'working' ? '0 0 15px var(--accent-hover)' : '0 0 10px rgba(255,255,255,0.8)';
	return (
		<div className={orbClass}>
			{['left', 'right'].map(side => (
				<div key={side} style={{
					width: 24, height: blink ? 2 : eyeH, background: eyeBg,
					borderRadius: eyeR, position: 'relative', overflow: 'hidden',
					transition: 'all 0.15s ease-out', boxShadow: eyeShadow,
					marginTop: blink ? 18 : 0,
				}}>
					{state !== 'working' && !blink && (
						<div style={{
							width: 10, height: 10, background: '#040406', borderRadius: '50%',
							position: 'absolute', top: 'calc(50% - 5px)', left: 'calc(50% - 5px)',
						}} />
					)}
				</div>
			))}
		</div>
	);
}

export default function App() {
	const [theme, setTheme] = useState<'dark' | 'light'>('dark');
	const [mounted, setMounted] = useState(false);
	const [cycle, setCycle] = useState(42);
	const [uptime, setUptime] = useState(0);
	const [orbState, setOrbState] = useState<'idle' | 'thinking' | 'working'>('idle');
	const [activeStage, setActiveStage] = useState(10);
	const [analysisRunning, setAnalysisRunning] = useState(false);
	const [footerTime, setFooterTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
	const logRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setMounted(true);
		document.documentElement.setAttribute('data-theme', theme);
		document.body.style.backgroundColor = theme === 'dark' ? '#010204' : '#fafafa';
	}, [theme]);

	// Cycle counter & uptime
	useEffect(() => {
		const t = setInterval(() => setCycle(c => c + 1), 30000);
		const u = setInterval(() => setUptime(s => s + 1), 1000);
		return () => { clearInterval(t); clearInterval(u); };
	}, []);

	// Orb state cycling
	useEffect(() => {
		const states: Array<'idle' | 'thinking' | 'working'> = ['idle', 'thinking', 'working'];
		let i = 0;
		const t = setInterval(() => { i = (i + 1) % 3; setOrbState(states[i]); }, 5000);
		return () => clearInterval(t);
	}, []);

	// Footer clock — updates every second independently
	useEffect(() => {
		const t = setInterval(() => setFooterTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
		return () => clearInterval(t);
	}, []);

	const fmtUptime = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
	const nowDate = new Date();
	const now = nowDate.toLocaleTimeString('en-US', { hour12: false });
	const logTime = (off: number) => {
		const d = new Date(nowDate.getTime() - LOG_OFFSETS[off] * 1000);
		return d.toLocaleTimeString('en-US', { hour12: false });
	};

	// CTA: Launch Synaptic Analysis mock
	const handleLaunch = useCallback(() => {
		if (analysisRunning) return;
		setAnalysisRunning(true);
		setActiveStage(0);
		const t = setInterval(() => {
			setActiveStage(prev => {
				if (prev >= 12) { clearInterval(t); setAnalysisRunning(false); return 10; }
				return prev + 1;
			});
		}, 800);
	}, [analysisRunning]);

	if (!mounted) return (
		<div style={{ position: 'fixed', inset: 0, background: '#010204', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
			<div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', opacity: 0.6, textAlign: 'center' }}>
				<div style={{ fontSize: '2rem', marginBottom: '12px', animation: 'pulse 2s infinite' }}>⬡</div>
				INITIALIZING SWARM...
			</div>
		</div>
	);

	return (
		<>
			{/* GPGPU Particle Background */}
			<WebGLErrorBoundary fallback={null}>
				<LiquidGlassShader theme={theme} />
			</WebGLErrorBoundary>
			<CustomCursor />

			{/* Vignette overlay */}
			<div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(4,4,6,0.8) 100%)', zIndex: -98, pointerEvents: 'none' }} />

			{/* ═══ HEADER ═══ */}
			<header className="header glass snake-border" role="banner" aria-label="Mantle AI Swarm Dashboard">
				<div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
						<Layers size={22} className="green-sweep-text" />
						<h1>MANTLE AI SWARM ACTIVITY MATRIX <span className="lusion-btn connect-state-true" style={{ fontSize: '11px', padding: '3px 8px', verticalAlign: 'middle', marginLeft: '10px' }}>V4.2 LIVE</span></h1>
					</div>
					<p style={{ marginTop: '6px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
						12 containers · 23,809 lines of Rust · 6 decision layers · Mantle Blockchain
					</p>
				</div>
				<div className="toggle-group" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
					<div className="lusion-btn connect-state-true" style={{ cursor: 'default' }}>
						<span style={{ marginRight: '8px' }}>●</span>AUTONOMOUS MODE · CYCLE {cycle}
					</div>
				</div>
			</header>

			<main>
			{/* ═══ STATS GRID ═══ */}
			<section className="metrics" aria-label="Key Performance Metrics">
				<div className="glass metric"><h3><Cpu size={14} style={{ color: 'var(--accent)' }} /> Current Cycle</h3><div className="val cyan">{cycle}</div></div>
				<div className="glass metric"><h3><Activity size={14} style={{ color: 'var(--accent-hover)' }} /> Uptime</h3><div className="val green">{fmtUptime}</div></div>
				<div className="glass metric"><h3><Zap size={14} style={{ color: 'var(--accent-hover)' }} /> Synthetic PNL</h3><div className="val green">$1,444.91</div></div>
				<div className="glass metric"><h3><Globe size={14} style={{ color: 'var(--accent-hover)' }} /> Win Rate</h3><div className="val green">75.7%</div></div>
			</section>

			{/* ═══ MAIN GRID: Market + Synaptic Core ═══ */}
			<div className="grid-main">

				{/* LEFT: Market Monitoring */}
				<div className="glass events-section" role="region" aria-label="Live Market Data">
					<div className="card-title"><TrendingUp size={16} style={{ color: 'var(--accent-hover)' }} /> LIVE MARKET MONITORING</div>
					{marketData.map(m => (
						<div key={m.sym} className="event-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', marginBottom: '14px', transition: 'all 0.3s ease', cursor: 'pointer' }}>
							<div>
								<div style={{ fontSize: '19px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{m.sym}</div>
								<div style={{ fontSize: '11px', color: 'var(--foreground)', opacity: 0.5 }}>Vol 24h: {m.vol}</div>
							</div>
							<div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{m.price}</div>
							<div className={`badge ${m.up ? 'ok' : 'fail'}`}>{m.change}</div>
							<div className={`lusion-btn ${m.up ? 'connect-state-true' : ''}`} style={{ fontSize: '11px', padding: '4px 12px' }}>
								{m.verdict}<br /><span style={{ fontSize: '10px', opacity: 0.7 }}>{m.conf}%</span>
							</div>
						</div>
					))}
				</div>

				{/* RIGHT: Synaptic Core — 3D Stone with orbiting tech cards */}
				<div className="glass" style={{ padding: '20px', position: 'relative', overflow: 'visible' }}>
					<div className="card-title"><Eye size={16} style={{ color: 'var(--accent)' }} /> SYNAPTIC CORE — SWARM BRAIN</div>

					{/* 3D Architecture — compact */}
					<div style={{ width: '100%', height: '420px', position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
						<Suspense fallback={
							<div style={{
								width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
								background: 'rgba(5,5,12,0.8)', borderRadius: '12px',
								border: '1px solid rgba(0,212,255,0.15)'
							}}>
								<div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', opacity: 0.6, textAlign: 'center' }}>
									<div style={{ marginBottom: '8px', animation: 'pulse 2s infinite' }}>◈</div>
									LOADING 3D MODEL...
								</div>
							</div>
						}>
							<WebGLErrorBoundary>
							<AnimatedArchitecture theme={theme} />
						</WebGLErrorBoundary>
						</Suspense>
					</div>

					{/* Orbiting tech cards */}
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
						{techCards.map(tc => (
							<div key={tc.label} className="snake-border" style={{
								padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px',
								border: '1px solid var(--border)', backdropFilter: 'blur(8px)',
								fontSize: '10px', fontFamily: 'var(--font-mono)', transition: 'all 0.3s ease',
							}}>
								<div style={{ color: 'var(--accent-hover)', fontWeight: 700, marginBottom: '2px' }}>{tc.label}</div>
								<div style={{ color: 'var(--foreground)', opacity: 0.6 }}>{tc.desc}</div>
							</div>
						))}
					</div>

					{/* Agent Orb */}
					<div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', borderTop: '1px solid var(--border)', marginTop: '12px' }}>
						<AgentOrb state={orbState} />
					</div>
				</div>
			</div>

			{/* ═══ PIPELINE + DEBATE ═══ */}
			<section className="grid-main" style={{ marginTop: '24px' }} aria-label="Decision Pipeline">
				{/* Pipeline */}
				<div className="glass events-section">
					<div className="card-title"><Zap size={16} style={{ color: 'var(--accent-hover)' }} /> SYNAPTIC DECISION PIPELINE</div>
					<div role="list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
						{pipelineStages.map((s, idx) => {
							const st = idx < activeStage ? 'done' : idx === activeStage ? 'active' : 'pending';
							return (
							<div key={s.n} role="listitem" style={{
								display: 'flex', justifyContent: 'space-between', alignItems: 'center',
								padding: '8px 14px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px',
								background: st === 'active' ? 'rgba(0,212,255,0.05)' : 'rgba(15,15,25,0.3)',
								border: `1px solid ${st === 'active' ? 'var(--accent-hover)' : 'rgba(255,255,255,0.03)'}`,
								boxShadow: st === 'active' ? '0 0 15px rgba(0,212,255,0.08)' : 'none',
								transform: st === 'active' ? 'scale(1.01)' : 'none',
								transition: 'all 0.3s ease',
							}}>
								<div style={{ display: 'flex', gap: '10px' }}>
									<span style={{ color: st === 'active' ? 'var(--accent-hover)' : 'var(--foreground)', opacity: st === 'pending' ? 0.3 : 0.5 }}>[{s.n}]</span>
									<span style={{ color: st === 'done' ? 'var(--accent-hover)' : st === 'active' ? '#fff' : 'var(--foreground)', opacity: st === 'pending' ? 0.4 : 1, fontWeight: st === 'active' ? 700 : 400 }}>{s.label}</span>
								</div>
								<span style={{
									fontSize: '11px', textTransform: 'uppercase', fontWeight: 700,
									color: st === 'done' ? 'var(--accent-hover)' : st === 'active' ? 'var(--accent)' : 'var(--foreground)',
									opacity: st === 'pending' ? 0.3 : 1,
								}}>
									{st === 'done' ? 'DONE' : st === 'active' ? 'PROCESSING' : 'PENDING'}
								</span>
							</div>
						);
						})}
					</div>
				</div>

				{/* Synaptic Debate + Network Registry */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
					<div className="glass" style={{ padding: '20px' }}>
						<div className="card-title"><Network size={16} style={{ color: 'var(--accent)' }} /> SYNAPTIC DECISION ARBITRAGE</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
							{debates.map((d, i) => (
								<div key={i} style={{
									background: 'rgba(10,10,18,0.4)', border: '1px solid rgba(255,255,255,0.03)',
									borderLeft: `3px solid ${d.color}`, borderRadius: '8px', padding: '12px', fontSize: '12px', lineHeight: 1.5,
								}}>
									<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700 }}>
										<span style={{ color: d.color }}>{d.agent}</span>
										<span style={{ color: 'var(--foreground)', opacity: 0.3 }}>{d.time}</span>
									</div>
									<div style={{ color: 'var(--foreground)', opacity: 0.8 }}>{d.msg}</div>
								</div>
							))}
						</div>
					</div>

					{/* Network Registry */}
					<div className="glass" style={{ padding: '20px' }}>
						<div className="card-title"><Globe size={16} style={{ color: 'var(--accent-hover)' }} /> NETWORK REGISTRY (ON-CHAIN)</div>
						<div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
							<div>Contract Registry: <span style={{ color: 'var(--accent)' }}>0xFA0b…8383</span></div>
							<div>NFT Identifier: <span style={{ color: 'var(--accent-hover)' }}>#1 Identity NFT</span></div>
							<div>Network Provider: <span style={{ color: 'var(--accent-hover)' }}>5000 (Mantle Mainnet)</span></div>
						</div>
					</div>
				</div>
			</section>

			{/* ═══ LOG STREAM ═══ */}
			<div className="glass" style={{ padding: '20px', marginTop: '24px' }} role="log" aria-live="polite" aria-label="Synaptic Activity Log">
				<div className="card-title"><Terminal size={16} /> SYNAPTIC ACTIVITY LOG</div>
				<div ref={logRef} style={{
					height: '250px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.8,
					padding: '16px', background: 'rgba(4,4,6,0.9)', border: '1px solid var(--border)', borderRadius: '12px',
					boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)',
				}}>
					{logEntries.map((l, i) => (
						<div key={i} style={{ display: 'flex', gap: '12px', color: 'var(--foreground)', opacity: 0.7, borderBottom: '1px solid rgba(255,255,255,0.01)', padding: '2px 0' }}>
							<span style={{ color: 'var(--foreground)', opacity: 0.3, minWidth: '90px' }}>{logTime(l.off)}</span>
							<span style={{ color: l.type === 'success' ? 'var(--accent-hover)' : 'var(--accent)', fontWeight: 700, minWidth: '100px' }}>{l.tag}</span>
							<span>{l.msg}</span>
						</div>
					))}
				</div>
			</div>

			{/* ═══ CONTROL BAR ═══ */}
			<div className="control-bar">
				<button className="lusion-btn-primary" onClick={handleLaunch} aria-label="Launch Synaptic Analysis">
					{analysisRunning ? '[ ◎ ANALYSIS RUNNING... ]' : '[ LAUNCH SYNAPTIC ANALYSIS ]'}
				</button>
				<button className="lusion-btn connect-btn-hover-fx" onClick={() => alert('On-chain mint emulation coming in v4.3')} aria-label="Emulate On-Chain Mint"><span>[ EMULATE ON-CHAIN MINT ]</span></button>
			</div>

			{/* ═══ FOOTER ═══ */}
			<div className="glass footer-bar">
				<span>Build: v4.2-triarchy · Reactor →</span>
				<span style={{ color: 'var(--accent-hover)' }}>⬡ SYSTEM ACTIVE · MANTLE DOMAIN</span>
				<span>Last Update: {footerTime}</span>
			</div>

			{/* Theme switcher */}
			<button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="lusion-btn connect-btn-hover-fx" style={{ position: 'fixed', bottom: '25px', right: '25px', zIndex: 100 }} aria-label="Toggle dark/light mode">
				<span>{theme === 'dark' ? '◉ DARK' : '◌ LIGHT'}</span>
			</button>
			</main>
		</>
	);
}
