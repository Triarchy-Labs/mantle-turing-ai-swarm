import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Zap, Globe, Terminal, Network, Layers, Cpu, Eye, TrendingUp, Shield, AlertTriangle, BarChart3, Target } from 'lucide-react';
import './index.css';
import LiquidGlassShader from './components/LiquidGlassShader';
import CustomCursor from './components/CustomCursor';
import { WebGLErrorBoundary } from './components/WebGLErrorBoundary';
import { useTelemetry } from './hooks/useTelemetry';
import SwarmChat from './components/SwarmChat';
import blurBlack4 from './assets/blur-black-4.webp';
import redBlur from './assets/red-blur.webp';

/* ── Pipeline stages ── */
const pipelineStages = [
	{ n: '01', label: 'MARKET DATA INGESTION' },
	{ n: '02', label: 'CORRELATION MATRIX' },
	{ n: '03', label: 'REGIME DETECTION (HMM)' },
	{ n: '04', label: 'SYNAPTIC AI DEBATE' },
	{ n: '05', label: 'LOCAL ML PREDICTION' },
	{ n: '06', label: 'HYBRID VECTOR RECALL' },
	{ n: '07', label: 'WEIGHTED FACTOR JUDGE' },
	{ n: '08', label: 'DECISION QUALITY (DQS)' },
	{ n: '09', label: 'PRE-TRADE RISK GATE' },
	{ n: '10', label: 'DNA CONFIDENCE ENGINE' },
	{ n: '11', label: 'PATIENCE SIGNAL LOCK' },
	{ n: '12', label: 'TITAN ENTRY PIPELINE' },
	{ n: '13', label: 'SWARM CONSENSUS VOTE' },
	{ n: '14', label: 'KELLY RISK SIZING' },
	{ n: '15', label: 'PAPER TRADE EXEC' },
	{ n: '16', label: 'DYNAMIC LEVERAGE (ATR)' },
	{ n: '17', label: 'TRAILING SL ENGINE' },
	{ n: '18', label: 'UNSTUCK RECOVERY' },
	{ n: '19', label: 'AUTO-RAMP EVALUATION' },
	{ n: '20', label: 'DEALLOW BAN SCANNER' },
	{ n: '21', label: 'ANOMALY DETECTION' },
	{ n: '22', label: 'DECISION JOURNAL' },
	{ n: '23', label: 'ON-CHAIN TX COMMIT' },
	{ n: '24', label: 'IPC STATE SYNC' },
];

/* ── Debates & logs now come from useTelemetry hook ── */


/* ── Orbiting tech cards around 3D stone ── */
const techCards = [
	{ label: 'ERC-8004', desc: 'Swarm Identity NFT', angle: 0 },
	{ label: 'Curl-Noise', desc: 'GPGPU Particle Physics', angle: 60 },
	{ label: 'IPC mmap()', desc: 'Zero-Copy L0 Shared Memory', angle: 120 },
	{ label: '6-Layer Brain', desc: 'Multi-Agent Decision Engine', angle: 180 },
	{ label: 'Rust WASM', desc: '12-Container Architecture', angle: 240 },
	{ label: 'Mantle L2', desc: 'Low-Fee On-Chain Settlement', angle: 300 },
];



export default function App() {
	const telem = useTelemetry();
	const [theme, setTheme] = useState<'dark' | 'light'>('dark');
	const [mounted, setMounted] = useState(false);
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

	// Derive values directly from telemetry (demo mode handles offline)
	const cycle = telem.cycle;
	const uptime = telem.uptimeSecs;
	const effectiveStage = analysisRunning ? activeStage : telem.pipelineStage;
	const [expandedPipeline, setExpandedPipeline] = useState(false);

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
	const logTime = (off: number) => {
		const d = new Date(nowDate.getTime() - (10 - off) * 5000);
		return d.toLocaleTimeString('en-US', { hour12: false });
	};

	// CTA: Launch Synaptic Analysis mock
	const handleLaunch = useCallback(() => {
		if (analysisRunning) return;
		setAnalysisRunning(true);
		setActiveStage(0);
		const t = setInterval(() => {
			setActiveStage(prev => {
				if (prev >= 23) { clearInterval(t); setAnalysisRunning(false); return 10; }
				return prev + 1;
			});
		}, 400);
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
			<div className="vignette-overlay" style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(4,4,6,0.8) 100%)', zIndex: -98, pointerEvents: 'none' }} />

			{/* ═══ HEADER ═══ */}
			<header className="header" role="banner" aria-label="Mantle AI Swarm Dashboard">
				<a href="https://github.com/Triarchy-Labs" target="_blank" rel="noopener noreferrer" className="triarchy-logo-wrapper" title="Triarchy Labs GitHub">
					<span className="triarchy-logo-text">TRIARCHY</span>
					<span className="triarchy-logo-divider">|</span>
					<div className="triarchy-logo-btn">
						<span className="triarchy-logo-glyph">⬡</span>
					</div>
				</a>

				<div className="header-right-container" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
					<div className="header-right-stats">
						<span className="stats-label">{telem.connected ? (telem.liveMode ? 'LIVE TX' : 'CONNECTED') : 'MOCK'}</span>
						<span className="stats-divider">|</span>
						<span className="stats-cycle">CYCLE {cycle}</span>
					</div>
					<div className="header-menu-btn" aria-label="Menu">
						<span className="bar"></span>
						<span className="bar"></span>
					</div>
				</div>
			</header>

			<main>
				{/* ═══ HERO SECTION ═══ */}
				<section className="hero-section">
					<div className="hero-blur-bg">
						<img src={redBlur} className="hero-blur-red" alt="" />
						<img src={blurBlack4} className="hero-blur-glass" alt="" />
					</div>
					<div className="hero-content">
						<div className="hero-title-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', marginBottom: '2.2rem' }}>
							<Layers className="green-sweep-text hero-title-icon" />
							<h1 className="hero-title" style={{ margin: 0 }}>
								MANTLE AI SWARM ACTIVITY MATRIX
							</h1>
						</div>
						<p className="hero-subtitle">
							12 crates · 26,873 LOC · 24-stage pipeline · 8 Titan modules · Mantle Mainnet
						</p>
					</div>
				</section>
				{/* ═══ STATS GRID ═══ */}
				{/* ═══ PRIMARY METRICS ═══ */}
				<section className="metrics" aria-label="Key Performance Metrics">
					<div className="glass metric"><h3><Zap size={14} style={{ color: 'var(--accent-hover)' }} /> PnL</h3><div className="val green">{telem.pnl}</div></div>
					<div className="glass metric"><h3><TrendingUp size={14} style={{ color: 'var(--accent-hover)' }} /> Win Rate</h3><div className="val green">{telem.winRate}</div></div>
					<div className="glass metric"><h3><Cpu size={14} style={{ color: 'var(--accent)' }} /> Cycle</h3><div className="val cyan">{cycle}</div></div>
					<div className="glass metric"><h3><Shield size={14} style={{ color: telem.riskState?.circuit_breaker === 'GREEN' ? '#00ff88' : '#ff6b6b' }} /> Circuit</h3><div className="val" style={{ color: telem.riskState?.circuit_breaker === 'GREEN' ? '#00ff88' : '#ff6b6b' }}>{telem.riskState?.circuit_breaker ?? 'N/A'}</div></div>
				</section>
				{/* ═══ SECONDARY METRICS ═══ */}
				<section className="metrics" aria-label="Secondary Metrics" style={{ marginTop: '-0.8vw' }}>
					<div className="glass metric secondary"><h3><Activity size={12} /> Uptime</h3><div className="val cyan">{fmtUptime}</div></div>
					<div className="glass metric secondary"><h3><BarChart3 size={12} /> Balance</h3><div className="val cyan">{telem.balance}</div></div>
					<div className="glass metric secondary"><h3><AlertTriangle size={12} style={{ color: '#ff6b6b' }} /> Max DD</h3><div className="val" style={{ color: '#ff6b6b' }}>{telem.maxDrawdown}</div></div>
					<div className="glass metric secondary"><h3><Target size={12} /> Trades</h3><div className="val cyan">{telem.totalTrades}</div></div>
				</section>

				{/* ═══ MAIN GRID: Market + Synaptic Core ═══ */}
				<div className="dashboard-grid">

					{/* ── LEFT COLUMN ── */}
					<div className="dashboard-col-left">

						{/* LIVE MARKET MONITORING */}
						<div className="glass events-section" role="region" aria-label="Live Market Data">
							<div className="card-title"><TrendingUp size={16} style={{ color: 'var(--accent-hover)' }} /> LIVE MARKET MONITORING {telem.connected && <span style={{ fontSize: '0.65rem', color: 'var(--accent-success)', marginLeft: '0.5vw' }}>● LIVE</span>}</div>
							{telem.markets.map(m => (
								<div key={m.sym} className="market-row">
									<div>
										<div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{m.sym}</div>
										<div style={{ fontSize: '0.7rem', color: 'var(--foreground)', opacity: 0.5 }}>Vol 24h: {m.vol}</div>
									</div>
									<div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{m.price}</div>
									<div className={`badge ${m.up ? 'ok' : 'fail'}`}>{m.change}</div>
									<div className={`lusion-btn ${m.up ? 'connect-state-true' : ''}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.75rem' }}>
										{m.verdict}<br /><span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{m.conf}%</span>
									</div>
								</div>
							))}
						</div>

						{/* SYNAPTIC DECISION PIPELINE */}
						<div className="glass events-section" role="region" aria-label="Decision Pipeline">
							<div className="card-title collapsible-header" onClick={() => setExpandedPipeline(!expandedPipeline)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Zap size={16} style={{ color: 'var(--accent-hover)' }} /> SYNAPTIC DECISION PIPELINE</div>
								<span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>{expandedPipeline ? '▼ COLLAPSE' : `▶ ${effectiveStage}/24 — EXPAND`}</span>
							</div>
							{/* Compact progress bar always visible */}
							<div style={{ display: 'flex', gap: '2px', marginBottom: expandedPipeline ? '0.8vw' : '0' }}>
								{pipelineStages.map((_, idx) => (
									<div key={idx} style={{ flex: 1, height: '4px', borderRadius: '2px', background: idx < effectiveStage ? 'var(--accent-hover)' : idx === effectiveStage ? 'var(--accent)' : 'rgba(255,255,255,0.06)', transition: 'background 0.3s ease' }} />
								))}
							</div>
							<div className={`collapsible-content ${expandedPipeline ? 'expanded' : 'collapsed'}`} style={{ display: expandedPipeline ? 'block' : 'none' }}>
								<div role="list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
									{pipelineStages.map((s, idx) => {
										const st = idx < effectiveStage ? 'done' : idx === effectiveStage ? 'active' : 'pending';
										return (
											<div key={s.n} role="listitem" className={`pipeline-stage ${st === 'active' ? 'active' : ''}`}>
												<div style={{ display: 'flex', gap: '8px' }}>
													<span style={{ color: st === 'active' ? 'var(--accent-hover)' : 'var(--foreground)', opacity: st === 'pending' ? 0.3 : 0.5 }}>[{s.n}]</span>
													<span style={{ color: st === 'done' ? 'var(--accent-hover)' : st === 'active' ? '#fff' : 'var(--foreground)', opacity: st === 'pending' ? 0.4 : 1, fontWeight: st === 'active' ? 700 : 400 }}>{s.label}</span>
												</div>
												<span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: st === 'done' ? 'var(--accent-hover)' : st === 'active' ? 'var(--accent)' : 'var(--foreground)', opacity: st === 'pending' ? 0.3 : 1 }}>
													{st === 'done' ? '✓' : st === 'active' ? '◎' : '·'}
												</span>
											</div>
										);
									})}
								</div>
							</div>
						</div>

						{/* RISK + RAMP + POSITIONS GROUP */}
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
							{/* Risk Matrix Panel */}
							<div className="glass" style={{ padding: '20px' }}>
								<div className="card-title"><Shield size={16} style={{ color: '#00ff88' }} /> RISK MATRIX ENGINE</div>
								<div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
									<div style={{ display: 'flex', justifyContent: 'space-between' }}>
										<span style={{ opacity: 0.5 }}>Dynamic Leverage</span>
										<span style={{ color: 'var(--accent)', fontWeight: 700 }}>{telem.riskState?.dynamic_leverage.toFixed(1) ?? '—'}×</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between' }}>
										<span style={{ opacity: 0.5 }}>ATR Estimate</span>
										<span style={{ color: 'var(--accent-hover)' }}>{((telem.riskState?.atr_estimate ?? 0) * 100).toFixed(2)}%</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between' }}>
										<span style={{ opacity: 0.5 }}>Macro Penalty</span>
										<span style={{ color: telem.riskState?.macro_penalty ? '#ff6b6b' : '#00ff88' }}>{telem.riskState?.macro_penalty.toFixed(2) ?? '0.00'}</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between' }}>
										<span style={{ opacity: 0.5 }}>Circuit Breaker</span>
										<span style={{ color: telem.riskState?.circuit_breaker === 'GREEN' ? '#00ff88' : '#ff6b6b', fontWeight: 700 }}>● {telem.riskState?.circuit_breaker ?? 'N/A'}</span>
									</div>
									{/* Leverage bar */}
									<div style={{ marginTop: '8px' }}>
										<div style={{ fontSize: '10px', opacity: 0.4, marginBottom: '4px' }}>LEVERAGE UTILIZATION</div>
										<div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
											<div style={{ height: '100%', width: `${((telem.riskState?.dynamic_leverage ?? 5) / 20) * 100}%`, background: 'linear-gradient(90deg, #00ff88, #00d4ff)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
										</div>
									</div>
								</div>
							</div>

							{/* AutoRamp Capital Phase */}
							<div className="glass">
								<div className="card-title"><BarChart3 size={16} style={{ color: 'var(--accent)' }} /> AUTO-RAMP CAPITAL SCALING</div>
								<div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6vw' }}>
									<div className="autoramp-phase-card">
										<div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{telem.rampState?.phase_label ?? 'SEED'}</div>
										<div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.2vw' }}>Phase {telem.rampState?.current_phase ?? 0}/4</div>
									</div>
									{/* Phase progress bar */}
									<div style={{ display: 'flex', gap: '3px' }}>
										{['SEED', 'SPROUT', 'GROWTH', 'MATURE', 'APEX'].map((label, i) => (
											<div key={label} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= (telem.rampState?.current_phase ?? 0) ? 'var(--accent)' : 'rgba(255,255,255,0.05)', transition: 'background 0.3s ease' }} title={label} />
										))}
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between' }}>
										<span style={{ opacity: 0.5 }}>Max Position</span>
										<span style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>{((telem.rampState?.max_position_pct ?? 0.1) * 100).toFixed(0)}%</span>
									</div>
									<div style={{ display: 'flex', justifyContent: 'space-between' }}>
										<span style={{ opacity: 0.5 }}>Kill-Switch Threshold</span>
										<span style={{ color: '#ff6b6b' }}>{telem.rampState?.daily_loss_kill_pct?.toFixed(0) ?? '3'}% daily loss</span>
									</div>
								</div>
							</div>

							{/* Open Positions */}
							<div className="glass">
								<div className="card-title"><Target size={16} style={{ color: 'var(--accent-hover)' }} /> OPEN POSITIONS ({telem.openPositions.length})</div>
								{telem.openPositions.length === 0 ? (
									<div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', opacity: 0.3, textAlign: 'center', padding: '2vw 0' }}>NO OPEN POSITIONS</div>
								) : (
									<div style={{ display: 'flex', flexDirection: 'column', gap: '0.6vw' }}>
										{telem.openPositions.map((pos, i) => (
											<div key={i} className="position-row">
												<div>
													<span style={{ fontWeight: 700, marginRight: '8px' }}>{pos.symbol}</span>
													<span className={`badge ${pos.side === 'Buy' ? 'ok' : 'fail'}`} style={{ fontSize: '0.65rem' }}>{pos.side}</span>
												</div>
												<div style={{ display: 'flex', gap: '1vw', opacity: 0.7 }}>
													<span>${pos.entry_price.toFixed(4)}</span>
													<span>{Math.floor(pos.hold_duration_secs / 60)}m</span>
													<span style={{ color: pos.trailing_stop > 0 ? '#00ff88' : 'rgba(255,255,255,0.3)' }}>SL: ${pos.trailing_stop.toFixed(4)}</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						{/* LOG STREAM */}
						<div className="glass" role="log" aria-live="polite" aria-label="Synaptic Activity Log">
							<div className="card-title"><Terminal size={16} /> SYNAPTIC ACTIVITY LOG</div>
							<div ref={logRef} className="log-terminal">
								{telem.logs.map((l, i) => (
									<div key={i} style={{ display: 'flex', gap: '12px', color: 'var(--foreground)', opacity: 0.7, borderBottom: '1px solid rgba(255,255,255,0.01)', padding: '2px 0' }}>
										<span style={{ color: 'var(--foreground)', opacity: 0.3, minWidth: '90px' }}>{logTime(l.off)}</span>
										<span style={{ color: l.type === 'success' ? 'var(--accent-hover)' : 'var(--accent)', fontWeight: 700, minWidth: '100px' }}>{l.tag}</span>
										<span>{l.msg}</span>
									</div>
								))}
							</div>
						</div>

						{/* CONTROL BAR */}
						<div className="control-bar">
							<button className="lusion-btn-primary" onClick={handleLaunch} aria-label="Launch Synaptic Analysis">
								{analysisRunning ? '[ ◎ ANALYSIS RUNNING... ]' : '[ LAUNCH SYNAPTIC ANALYSIS ]'}
							</button>
							<button className="lusion-btn connect-btn-hover-fx" onClick={() => window.open(`https://explorer.mantle.xyz/address/0x1150f09ae885e6E7BcC0cb38feDd200d7f580008`, '_blank')} aria-label="View On-Chain Agent NFT"><span>[ VIEW AGENT NFT ON-CHAIN ]</span></button>
						</div>

					</div>

					{/* ── RIGHT COLUMN ── */}
					<div className="dashboard-col-right">

						{/* SWARM AGENT CHAT */}
						<SwarmChat telem={telem} orbState={orbState} />
						{/* SYNAPTIC CORE — 3D Brain */}
						<div className="glass" style={{ position: 'relative', overflow: 'visible' }}>
							<div className="card-title"><Eye size={16} style={{ color: 'var(--accent)' }} /> SYNAPTIC CORE — SWARM BRAIN</div>

							{/* Orbiting tech cards */}
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6vw', marginTop: '0.8vw' }}>
								{techCards.map(tc => (
									<div key={tc.label} className="snake-border" style={{
										padding: '0.6vw 0.8vw', background: 'rgba(0,0,0,0.4)', borderRadius: '0.5rem',
										border: '1px solid var(--border)', backdropFilter: 'blur(8px)',
										fontSize: '0.7rem', fontFamily: 'var(--font-mono)', transition: 'all 0.3s ease',
									}}>
										<div style={{ color: 'var(--accent-hover)', fontWeight: 700, marginBottom: '2px' }}>{tc.label}</div>
										<div style={{ color: 'var(--foreground)', opacity: 0.6 }}>{tc.desc}</div>
									</div>
								))}
							</div>

						</div>

						{/* SYNAPTIC DECISION ARBITRAGE */}
						<div className="glass">
							<div className="card-title"><Network size={16} style={{ color: 'var(--accent)' }} /> SYNAPTIC DECISION ARBITRAGE</div>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '0.6vw' }}>
								{telem.debates.map((d, i) => (
									<div key={i} className="debate-card" style={{
										background: 'rgba(10,10,18,0.4)', border: '1px solid rgba(255,255,255,0.03)',
										borderLeft: `3px solid ${d.color}`, borderRadius: '0.5rem', padding: '0.6vw 0.8vw', fontSize: '0.75rem', lineHeight: 1.5,
									}}>
										<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700 }}>
											<span style={{ color: d.color }}>{d.agent}</span>
											<span style={{ color: 'var(--foreground)', opacity: 0.3 }}>{d.time}</span>
										</div>
										<div style={{ color: 'var(--foreground)', opacity: 0.8, fontSize: '0.7rem' }}>{d.msg}</div>
									</div>
								))}
							</div>
						</div>

						{/* ON-CHAIN ACTIVITY */}
						<div className="glass">
							<div className="card-title"><Globe size={16} style={{ color: 'var(--accent-hover)' }} /> ON-CHAIN ACTIVITY (MANTLE L2)</div>
							<div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6vw' }}>
								{/* Verified Contracts */}
								<div style={{ padding: '0.6vw 0.8vw', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.12)', borderRadius: '0.5rem' }}>
									<div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Sourcify Verified Contracts</div>
									<a href="https://explorer.mantle.xyz/address/0xFA0b5036aF9770B370B33CeBBb42d1E626338383" target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block', marginBottom: '4px' }}>
										→ ERC8004Registry: 0xFA0b...8383
									</a>
									<a href="https://explorer.mantle.xyz/address/0x41c51a03FFE750F5df1F6ffc972DBA8265B5a4F4" target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block' }}>
										→ X402FlashLiquidator: 0x41c5...a4F4
									</a>
								</div>
								{/* Agent Identity */}
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ opacity: 0.5 }}>Agent NFT</span>
									<span style={{ color: 'var(--accent)' }}>#{telem.agentId} Identity · Rep 94.2%</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ opacity: 0.5 }}>Network</span>
									<span style={{ color: 'var(--accent-hover)' }}>Chain {telem.chainId} · Mantle Mainnet</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ opacity: 0.5 }}>TX Mode</span>
									<span style={{ color: telem.liveMode ? '#00ff88' : 'var(--accent-hover)' }}>
										{telem.liveMode ? '◉ LIVE BROADCAST' : '○ DRY-RUN (calldata only)'}
									</span>
								</div>
								{/* TX Feed */}
								{telem.txHashes.length > 0 && (
									<div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
										<div style={{ marginBottom: '4px', opacity: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Transactions</div>
										{telem.txHashes.slice(-5).map((hash, i) => (
											<a key={i} href={`https://explorer.mantle.xyz/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block', marginBottom: '2px' }}>
												→ {hash.slice(0, 10)}…{hash.slice(-8)}
											</a>
										))}
									</div>
								)}
								{/* Mantlescan Buttons */}
								<div style={{ display: 'flex', gap: '0.5vw', marginTop: '4px' }}>
									<button className="lusion-btn" style={{ flex: 1 }} onClick={() => window.open('https://explorer.mantle.xyz/address/0xFA0b5036aF9770B370B33CeBBb42d1E626338383', '_blank')}>View Registry ↗</button>
									<button className="lusion-btn" style={{ flex: 1 }} onClick={() => window.open('https://explorer.mantle.xyz/address/0x1150f09ae885e6E7BcC0cb38feDd200d7f580008', '_blank')}>View Agent NFT ↗</button>
								</div>
							</div>
						</div>

					</div>

				</div>

				{/* ═══ FOOTER ═══ */}
				<div className="glass footer-bar">
					<span>Build: v5.0-triarchy · 24-stage pipeline →</span>
					<span style={{ color: 'var(--accent-hover)' }}>⬡ SYSTEM ACTIVE · MANTLE DOMAIN</span>
					<span>Last Update: {footerTime}</span>
				</div>

				{/* Theme switcher */}
				<button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="lusion-btn connect-btn-hover-fx" style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100 }} aria-label="Toggle dark/light mode">
					<span>{theme === 'dark' ? '◉ DARK' : '◌ LIGHT'}</span>
				</button>
			</main>
		</>
	);
}
