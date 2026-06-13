import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap } from 'lucide-react';
import './index.css';
import LiquidGlassShader from './components/LiquidGlassShader';
import CustomCursor from './components/CustomCursor';
import { WebGLErrorBoundary } from './components/WebGLErrorBoundary';
import { useTelemetry } from './hooks/useTelemetry';
import SwarmChat from './components/SwarmChat';

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

const MetricPill = ({ 
	label, 
	value, 
	isActive = false, 
	onHoverChange 
}: { 
	label: string, 
	value: string, 
	isActive?: boolean,
	onHoverChange: (isHovered: boolean) => void 
}) => {
	const pillRef = useRef<HTMLButtonElement>(null);
	const [circleStyle, setCircleStyle] = useState({ left: '50%', top: '50%' });
	const [isLocalHover, setIsLocalHover] = useState(false);

	const getMousePos = (e: React.MouseEvent) => {
		if (!pillRef.current) return { left: '50%', top: '50%' };
		const rect = pillRef.current.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;
		return { left: `${x}%`, top: `${y}%` };
	};

	const handleMouseEnter = (e: React.MouseEvent) => {
		setCircleStyle(getMousePos(e));
		setIsLocalHover(true);
		onHoverChange(true);
	};

	const handleMouseLeave = (e: React.MouseEvent) => {
		setCircleStyle(getMousePos(e));
		setIsLocalHover(false);
		onHoverChange(false);
	};

	return (
		<button 
			className={`metric-pill-btn ${isActive ? 'active' : ''} ${isLocalHover ? 'hovered' : ''}`}
			ref={pillRef}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<div className="btn__bg"></div>
			<div className="btn__circle-wrap">
				<div 
					className="btn__circle" 
					style={{ 
						left: circleStyle.left, 
						top: circleStyle.top 
					}}
				>
					<div className="before__100"></div>
				</div>
			</div>
			<div className="btn__text">
				<span className="pill-label">{label} </span>
				<span className="pill-val">{value}</span>
			</div>
		</button>
	);
};

export default function App() {
	const telem = useTelemetry();
	const [theme, setTheme] = useState<'dark' | 'light'>('dark');
	const [mounted, setMounted] = useState(false);
	const [orbState, setOrbState] = useState<'idle' | 'thinking' | 'working'>('idle');
	const [activeStage, setActiveStage] = useState(10);
	const [analysisRunning, setAnalysisRunning] = useState(false);
	const [footerTime, setFooterTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
	const [globalPillHover, setGlobalPillHover] = useState(false);
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
		const t = setInterval(() => { i = (i + 1) % 3; setOrbState(states[i]); }, 10000);
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
				<LiquidGlassShader theme={theme} mode={analysisRunning ? 2 : ((telem.connected && telem.pipelineStage >= 22) || orbState === 'working' ? 1 : 0)} />
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
				<section className="hero-section" aria-label="Dashboard Hero">
					<div className="hero-blur-bg">
						<div className="mdx-blur-cyan"></div>
						<div className="mdx-arch-glass"></div>
						<div className="mdx-arch-line"></div>
					</div>
					<div className="hero-content">
						<div className="hero-title-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.2rem' }}>
							<h1 className="hero-title" style={{ margin: 0 }}>
								MANTLE
							</h1>
						</div>
						<p className="hero-subtitle">
							12 crates · 26,873 LOC · 24-stage pipeline · 8 Titan modules · Mantle Mainnet
						</p>
					</div>
				</section>
				{/* ═══ METRICS PILLS (5 CAPSULES) ═══ */}
				<section 
					className="metrics-pills" 
					aria-label="Key Performance Metrics" 
				>
					<MetricPill label="PNL" value={telem.pnl} isActive={!globalPillHover} onHoverChange={setGlobalPillHover} />
					<MetricPill label="WIN RATE" value={telem.winRate} onHoverChange={setGlobalPillHover} />
					<MetricPill label="UPTIME" value={fmtUptime} onHoverChange={setGlobalPillHover} />
					<MetricPill label="TRADES" value={telem.totalTrades.toString()} onHoverChange={setGlobalPillHover} />
					<MetricPill label="CIRCUIT" value={telem.riskState?.circuit_breaker ?? 'N/A'} onHoverChange={setGlobalPillHover} />
				</section>

				{/* ═══ BENTO GRID ═══ */}
				<div className="bento-grid">
					{/* LIVE MARKET MONITORING CARD (Row 1) */}
					<article className="bento-card shape-akari" role="region" aria-label="Live Market Data">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 001</div>
							<div>MARKET</div>
						</div>
						<div className="bento-content">
							<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
								{telem.markets.map(m => (
									<div key={m.sym} className="market-row" style={{ padding: '1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
											<div>
												<div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{m.sym}</div>
												<div style={{ fontSize: '0.85rem', color: 'var(--foreground)', opacity: 0.5 }}>Vol 24h: {m.vol}</div>
											</div>
											<div style={{ textAlign: 'right' }}>
												<div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{m.price}</div>
												<div className={`badge ${m.up ? 'ok' : 'fail'}`} style={{ fontSize: '1rem', padding: '0.2rem 0.6rem', marginTop: '0.4rem' }}>{m.change}</div>
											</div>
											<div className={`lusion-btn ${m.up ? 'connect-state-true' : ''}`} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>
												{m.verdict}<br /><span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{m.conf}%</span>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Live Market Feed</h2>
							<div className="lusion-card-tags">DATA • ORACLE • ACTIVE</div>
						</div>
					</article>

					{/* SWARM AGENT CHAT CARD (Row 2, Left) */}
					<article className="bento-card shape-choochoo" role="region" aria-label="Swarm Agent Chat">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 002</div>
							<div>SWARM</div>
						</div>
						<div className="bento-content" style={{ padding: '0 1vw' }}>
							<SwarmChat telem={telem} orbState={orbState} />
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Swarm Agent AI</h2>
							<div className="lusion-card-tags">AI • LLM • EXECUTION</div>
						</div>
					</article>

					{/* RISK MATRIX ENGINE (Row 2, Right) */}
					<article className="bento-card shape-ion align-right" role="region">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 004</div>
							<div>RISK</div>
						</div>
						<div className="bento-content" style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', display: 'flex', flexDirection: 'column', gap: '2vw' }}>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ opacity: 0.5 }}>Dynamic Leverage</span>
								<span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.4rem' }}>{telem.riskState?.dynamic_leverage.toFixed(1) ?? '—'}×</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ opacity: 0.5 }}>ATR Estimate</span>
								<span style={{ color: 'var(--accent-hover)', fontSize: '1.4rem' }}>{((telem.riskState?.atr_estimate ?? 0) * 100).toFixed(2)}%</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ opacity: 0.5 }}>Macro Penalty</span>
								<span style={{ color: telem.riskState?.macro_penalty ? '#ff6b6b' : '#00ff88', fontSize: '1.4rem' }}>{telem.riskState?.macro_penalty.toFixed(2) ?? '0.00'}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between' }}>
								<span style={{ opacity: 0.5 }}>Circuit Breaker</span>
								<span style={{ color: telem.riskState?.circuit_breaker === 'GREEN' ? '#00ff88' : '#ff6b6b', fontWeight: 700, fontSize: '1.4rem' }}>● {telem.riskState?.circuit_breaker ?? 'N/A'}</span>
							</div>
							<div style={{ marginTop: 'auto' }}>
								<div style={{ fontSize: '0.8rem', opacity: 0.4, marginBottom: '0.5vw' }}>LEVERAGE UTILIZATION</div>
								<div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
									<div style={{ height: '100%', width: `${((telem.riskState?.dynamic_leverage ?? 5) / 20) * 100}%`, background: 'linear-gradient(90deg, #00ff88, #00d4ff)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
								</div>
							</div>
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Risk Matrix</h2>
							<div className="lusion-card-tags">SAFETY • LIMITS • GUARDS</div>
						</div>
					</article>

					{/* SYNAPTIC DECISION PIPELINE (Row 4) */}
					<article className="bento-card shape-hero events-section" role="region" aria-label="Decision Pipeline">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 003</div>
							<div>PIPELINE</div>
						</div>
						<div className="bento-content" style={{ justifyContent: 'center' }}>
							<div className="card-title collapsible-header" onClick={() => setExpandedPipeline(!expandedPipeline)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', marginBottom: '2vw' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}><Zap size={20} style={{ color: 'var(--accent-hover)' }} /> <span style={{ fontSize: '1.2rem', letterSpacing: '0.1em' }}>SYNAPTIC DECISION PIPELINE</span></div>
								<span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>{expandedPipeline ? '▼ COLLAPSE' : `▶ ${effectiveStage}/24 — EXPAND`}</span>
							</div>
							<div style={{ display: 'flex', gap: '4px', marginBottom: expandedPipeline ? '2vw' : '0' }}>
								{pipelineStages.map((_, idx) => (
									<div key={idx} style={{ flex: 1, height: '8px', borderRadius: '4px', background: idx < effectiveStage ? 'var(--accent-hover)' : idx === effectiveStage ? 'var(--accent)' : 'rgba(255,255,255,0.06)', transition: 'background 0.3s ease' }} />
								))}
							</div>
							<div className={`collapsible-content ${expandedPipeline ? 'expanded' : 'collapsed'}`} style={{ display: expandedPipeline ? 'block' : 'none' }}>
								<div role="list" style={{ display: 'flex', flexWrap: 'wrap', gap: '1vw', marginTop: '1vw' }}>
									{pipelineStages.map((s, idx) => {
										const st = idx < effectiveStage ? 'done' : idx === effectiveStage ? 'active' : 'pending';
										return (
											<div key={s.n} role="listitem" className={`pipeline-stage ${st === 'active' ? 'active' : ''}`} style={{ flex: '1 1 calc(25% - 1vw)' }}>
												<div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem' }}>
													<span style={{ color: st === 'active' ? 'var(--accent-hover)' : 'var(--foreground)', opacity: st === 'pending' ? 0.3 : 0.5 }}>[{s.n}]</span>
													<span style={{ color: st === 'done' ? 'var(--accent-hover)' : st === 'active' ? '#fff' : 'var(--foreground)', opacity: st === 'pending' ? 0.4 : 1, fontWeight: st === 'active' ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Execution State</h2>
							<div className="lusion-card-tags">STATE • DAG • PROCESS</div>
						</div>
					</article>

					{/* OPEN POSITIONS (Row 3, Left) */}
					<article className="bento-card shape-choochoo" role="region">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 006</div>
							<div>PORTFOLIO</div>
						</div>
						<div className="bento-content">
							{telem.openPositions.length === 0 ? (
								<div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', opacity: 0.3, textAlign: 'center', margin: 'auto' }}>NO OPEN POSITIONS</div>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vw' }}>
									{telem.openPositions.map((pos, i) => (
										<div key={i} className="position-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1vw', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
											<div>
												<div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.5vw' }}>{pos.symbol}</div>
												<span className={`badge ${pos.side === 'Buy' ? 'ok' : 'fail'}`} style={{ fontSize: '0.8rem' }}>{pos.side}</span>
											</div>
											<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>
												<span style={{ fontSize: '1.1rem' }}>${pos.entry_price.toFixed(4)}</span>
												<span style={{ color: pos.trailing_stop > 0 ? '#00ff88' : 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '0.5vw' }}>SL: ${pos.trailing_stop.toFixed(4)}</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Positions ({telem.openPositions.length})</h2>
							<div className="lusion-card-tags">HOLDINGS • ACTIVE</div>
						</div>
					</article>

					{/* AUTO-RAMP CAPITAL SCALING (Row 3, Right) */}
					<article className="bento-card shape-ion align-right" role="region">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 005</div>
							<div>SCALING</div>
						</div>
						<div className="bento-content" style={{ fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: '2vw', justifyContent: 'center' }}>
							<div style={{ textAlign: 'center' }}>
								<div style={{ fontSize: '3vw', fontWeight: 800, color: 'var(--accent)' }}>{telem.rampState?.phase_label ?? 'SEED'}</div>
								<div style={{ fontSize: '1rem', opacity: 0.5, marginTop: '1vw' }}>Phase {telem.rampState?.current_phase ?? 0}/4</div>
							</div>
							<div style={{ display: 'flex', gap: '6px', marginTop: '2vw' }}>
								{['SEED', 'SPROUT', 'GROWTH', 'MATURE', 'APEX'].map((label, i) => (
									<div key={label} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i <= (telem.rampState?.current_phase ?? 0) ? 'var(--accent)' : 'rgba(255,255,255,0.05)', transition: 'background 0.3s ease' }} title={label} />
								))}
							</div>
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Auto-Ramp</h2>
							<div className="lusion-card-tags">CAPITAL • GROWTH</div>
						</div>
					</article>

					{/* LOG STREAM (Row 5) */}
					<article className="bento-card shape-akari align-right" role="log" aria-live="polite">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 007</div>
							<div>SYSTEM LOG</div>
						</div>
						<div className="bento-content">
							<div ref={logRef} className="log-terminal" style={{ height: '100%' }}>
								{telem.logs.map((l, i) => (
									<div key={i} style={{ display: 'flex', gap: '1vw', color: 'var(--foreground)', opacity: 0.7, borderBottom: '1px solid rgba(255,255,255,0.01)', padding: '0.8vw 0', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
										<span style={{ color: 'var(--foreground)', opacity: 0.3, minWidth: '90px' }}>{logTime(l.off)}</span>
										<span style={{ color: l.type === 'success' ? 'var(--accent-hover)' : 'var(--accent)', fontWeight: 700, minWidth: '100px' }}>{l.tag}</span>
										<span>{l.msg}</span>
									</div>
								))}
							</div>
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Activity Stream</h2>
							<div className="lusion-card-tags">EVENTS • LOGS • TRACE</div>
						</div>
					</article>

					{/* SYNAPTIC DECISION ARBITRAGE (Row 7) */}
					<article className="bento-card shape-ion" role="region">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 009</div>
							<div>ARBITRAGE</div>
						</div>
						<div className="bento-content">
							<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vw' }}>
								{telem.debates.map((d, i) => (
									<div key={i} className="debate-card" style={{
										background: 'rgba(10,10,18,0.4)', border: '1px solid rgba(255,255,255,0.03)',
										borderLeft: `4px solid ${d.color}`, borderRadius: '1vw', padding: '1.5vw', lineHeight: 1.5,
									}}>
										<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1vw', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
											<span style={{ color: d.color }}>{d.agent}</span>
											<span style={{ color: 'var(--foreground)', opacity: 0.3 }}>{d.time}</span>
										</div>
										<div style={{ color: 'var(--foreground)', opacity: 0.8, fontSize: '1rem' }}>{d.msg}</div>
									</div>
								))}
							</div>
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Debate Consensus</h2>
							<div className="lusion-card-tags">AGENTS • LOGIC • VOTING</div>
						</div>
					</article>

					{/* ON-CHAIN ACTIVITY (Row 7, Right) */}
					<article className="bento-card shape-choochoo align-right" role="region">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 010</div>
							<div>BLOCKCHAIN</div>
						</div>
						<div className="bento-content" style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', display: 'flex', flexDirection: 'column', gap: '2vw' }}>
							<div style={{ padding: '1.5vw', background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.12)', borderRadius: '1vw' }}>
								<div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '1vw', textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Sourcify Verified</div>
								<a href="https://explorer.mantle.xyz/address/0xFA0b5036aF9770B370B33CeBBb42d1E626338383" target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block', marginBottom: '0.5vw' }}>
									→ ERC8004Registry
								</a>
								<a href="https://explorer.mantle.xyz/address/0x41c51a03FFE750F5df1F6ffc972DBA8265B5a4F4" target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block' }}>
									→ X402FlashLiquidator
								</a>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ opacity: 0.5 }}>Agent NFT</span>
								<span style={{ color: 'var(--accent)', fontWeight: 700 }}>#{telem.agentId} Identity</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ opacity: 0.5 }}>Network</span>
								<span style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>Chain {telem.chainId}</span>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ opacity: 0.5 }}>TX Mode</span>
								<span style={{ color: telem.liveMode ? '#00ff88' : 'var(--accent-hover)', fontWeight: 700 }}>
									{telem.liveMode ? '◉ LIVE TX' : '○ DRY-RUN'}
								</span>
							</div>
							{telem.txHashes.length > 0 && (
								<div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2vw', marginTop: 'auto' }}>
									<div style={{ marginBottom: '1vw', opacity: 0.5, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent TXs</div>
									{telem.txHashes.slice(-3).map((hash, i) => (
										<a key={i} href={`https://explorer.mantle.xyz/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block', marginBottom: '0.5vw' }}>
											→ {hash.slice(0, 10)}…{hash.slice(-8)}
										</a>
									))}
								</div>
							)}
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">On-Chain Activity</h2>
							<div className="lusion-card-tags">MANTLE L2 • TX • VERIFIED</div>
						</div>
					</article>

					{/* SYNAPTIC CORE — 3D Brain (Row 6) */}
					<article className="bento-card shape-choochoo align-right" role="region">
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>EXP 008</div>
							<div>CORE</div>
						</div>
						<div className="bento-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5vw' }}>
							{techCards.map(tc => (
								<div key={tc.label} className="snake-border" style={{
									padding: '1.5vw', background: 'rgba(0,0,0,0.4)', borderRadius: '1vw',
									border: '1px solid var(--border)', backdropFilter: 'blur(8px)',
									fontFamily: 'var(--font-mono)', transition: 'all 0.3s ease',
								}}>
									<div style={{ color: 'var(--accent-hover)', fontWeight: 700, marginBottom: '0.5vw', fontSize: '1rem' }}>{tc.label}</div>
									<div style={{ color: 'var(--foreground)', opacity: 0.6, fontSize: '0.85rem' }}>{tc.desc}</div>
								</div>
							))}
						</div>
						<div className="lusion-bottom-info">
							<h2 className="lusion-card-title">Swarm Brain</h2>
							<div className="lusion-card-tags">MODULES • TECH • NEURAL</div>
						</div>
					</article>
				</div>

				{/* CONTROL BAR (Centered below grid) */}
				<div className="control-bar" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '4rem', padding: '0 4rem' }}>
					<button className="lusion-btn-primary" onClick={handleLaunch} aria-label="Launch Synaptic Analysis">
						{analysisRunning ? '[ ◎ ANALYSIS RUNNING... ]' : '[ LAUNCH SYNAPTIC ANALYSIS ]'}
					</button>
					<button className="lusion-btn connect-btn-hover-fx" onClick={() => window.open(`https://explorer.mantle.xyz/address/0x1150f09ae885e6E7BcC0cb38feDd200d7f580008`, '_blank')} aria-label="View On-Chain Agent NFT"><span>[ VIEW AGENT NFT ON-CHAIN ]</span></button>
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
