import { useState, useEffect, useRef, useCallback } from 'react';
import MenuOverlay from './components/MenuOverlay';
import HowItWorks from './components/HowItWorks';
import './index.css';
import LiquidGlassShader from './components/LiquidGlassShader';
import CustomCursor from './components/CustomCursor';
import { WebGLErrorBoundary } from './components/WebGLErrorBoundary';
import { useTelemetry } from './hooks/useTelemetry';
import SwarmChat from './components/SwarmChat';
import NoiseOverlay from './components/NoiseOverlay';
import TextReveal from './components/TextReveal';
import Lenis from 'lenis';
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

const NeuralLoom = ({ telem, hasPositions }: { telem: any, hasPositions: boolean }) => {
	const loomRef = useRef<HTMLDivElement>(null);
	const [pings, setPings] = useState<{ id: number, x: number, y: number }[]>([]);
	const [hoveredAnomaly, setHoveredAnomaly] = useState<string | null>(null);

	const anomalies = [
		{ id: 1, label: "LIQUIDITY IMBALANCE", top: `${(telem.cycle * 13) % 80 + 10}%`, left: `${(telem.cycle * 17) % 80 + 10}%` },
		{ id: 2, label: "WHALE TX DETECTED", top: `${(telem.cycle * 23) % 80 + 10}%`, left: `${(telem.cycle * 29) % 80 + 10}%` },
		{ id: 3, label: "NEWS SENTIMENT SPIKE", top: `${(telem.cycle * 31) % 80 + 10}%`, left: `${(telem.cycle * 37) % 80 + 10}%` },
	];

	const handleMouseMove = useCallback((e: React.MouseEvent) => {
		if (!loomRef.current) return;
		const rect = loomRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left - rect.width / 2;
		const y = e.clientY - rect.top - rect.height / 2;
		
		const rotateX = -(y / rect.height) * 15;
		const rotateY = (x / rect.width) * 15;

		loomRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
	}, []);

	const handleMouseLeave = useCallback(() => {
		if (!loomRef.current) return;
		loomRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
		loomRef.current.style.transition = 'transform 0.5s ease';
	}, []);

	const handleMouseEnter = useCallback(() => {
		if (!loomRef.current) return;
		loomRef.current.style.transition = 'none';
	}, []);

	const handleClick = useCallback((e: React.MouseEvent) => {
		if (!loomRef.current) return;
		const rect = loomRef.current.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;
		
		const newPing = { id: Date.now(), x, y };
		setPings(prev => [...prev, newPing]);
		
		setTimeout(() => {
			setPings(prev => prev.filter(p => p.id !== newPing.id));
		}, 1500);
	}, []);

	return (
		<div 
			className={`neural-loom-container ${hasPositions ? 'combat-mode' : ''}`}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			onMouseEnter={handleMouseEnter}
			onClick={handleClick}
			style={{ perspective: '800px', transformStyle: 'preserve-3d', ...(hasPositions ? {} : { flex: 1, margin: 'auto' }) }}
		>
			<div className="crt-overlay"></div>
			
			<div ref={loomRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, transformStyle: 'preserve-3d', willChange: 'transform' }}>
				<div className="loom-grid"></div>
				<div className="loom-orbit loom-orbit-1"></div>
				<div className="loom-orbit loom-orbit-2"></div>
				
				{anomalies.map(a => (
					<div 
						key={a.id}
						className="loom-anomaly" 
						style={{ top: a.top, left: a.left, opacity: 1, animation: 'none' }}
						onMouseEnter={() => setHoveredAnomaly(a.label)}
						onMouseLeave={() => setHoveredAnomaly(null)}
					>
						{hoveredAnomaly === a.label && (
							<div className="anomaly-tooltip">
								{a.label}
							</div>
						)}
					</div>
				))}

				{pings.map(p => (
					<div 
						key={p.id} 
						className="loom-ripple" 
						style={{ left: `${p.x}%`, top: `${p.y}%` }} 
					/>
				))}
			</div>

			{!hasPositions && (
				<div className="loom-core-status">
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.15em', color: 'var(--accent)', animation: 'pulse 4s infinite' }}>
						ZERO EXPOSURE
					</div>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.1em', opacity: 0.6, marginTop: '0.2rem' }}>
						SWARM IS HUNTING
					</div>
					<div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', opacity: 0.3, marginTop: '0.2rem', letterSpacing: '0.1em' }}>
						CYCLE: {telem.cycle} | UP: {telem.uptimeSecs}s
					</div>
				</div>
			)}
		</div>
	);
};

export default function App() {
	const telem = useTelemetry();
	const [theme, setTheme] = useState<'dark' | 'light'>('dark');
	const [mounted, setMounted] = useState(false);
	const [orbState, setOrbState] = useState<'idle' | 'thinking' | 'working'>('idle');
	const [activeStage, setActiveStage] = useState(0);
	const [analysisRunning, setAnalysisRunning] = useState(true);
	const [footerTime, setFooterTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
	const [globalPillHover, setGlobalPillHover] = useState(false);
	const [logoFormed, setLogoFormed] = useState(false);
	const logRef = useRef<HTMLDivElement>(null);

	// Trigger animation on page load
	useEffect(() => {
		const t = setInterval(() => {
			setActiveStage(prev => {
				if (prev >= 24) { clearInterval(t); setAnalysisRunning(false); return 24; }
				return prev + 1;
			});
		}, 800);
		return () => clearInterval(t);
	}, []);

	// Auto-trigger pipeline animation when a new cycle starts
	const prevCycleRef = useRef(telem.cycle);
	useEffect(() => {
		if (telem.cycle > prevCycleRef.current) {
			prevCycleRef.current = telem.cycle;
			setAnalysisRunning(true);
			setActiveStage(0);
			const t = setInterval(() => {
				setActiveStage(prev => {
					if (prev >= 24) { clearInterval(t); setAnalysisRunning(false); return 24; }
					return prev + 1;
				});
			}, 800); // ~19 seconds to complete animation
			return () => clearInterval(t);
		}
	}, [telem.cycle]);

	// Lenis smooth scroll setup
	useEffect(() => {
		const lenis = new Lenis({
			duration: 1.2,
			easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			orientation: 'vertical',
			gestureOrientation: 'vertical',
			smoothWheel: true,
			touchMultiplier: 2,
		});

		function raf(time: number) {
			lenis.raf(time);
			requestAnimationFrame(raf);
		}

		requestAnimationFrame(raf);

		return () => {
			lenis.destroy();
		};
	}, []);

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
	const [isAutoRampFlipped, setIsAutoRampFlipped] = useState(false);
	const [manualPhaseOverride, setManualPhaseOverride] = useState<number | null>(null);
	const [overrideFlash, setOverrideFlash] = useState<number | null>(null);
	const [configValues, setConfigValues] = useState({ lossKill: 3.0, maxCap: 100 });
	const [showTxLogs, setShowTxLogs] = useState(true);
	const [menuOpen, setMenuOpen] = useState(false);
	const [howOpen, setHowOpen] = useState(false);

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

	// Particle logo: assemble for 30s, then disperse for 90s — on a loop.
	useEffect(() => {
		const SHOW_MS = 30000, HIDE_MS = 90000;
		let formed = false;
		let id: ReturnType<typeof setTimeout>;
		const loop = () => {
			formed = !formed;
			setLogoFormed(formed);
			id = setTimeout(loop, formed ? SHOW_MS : HIDE_MS);
		};
		id = setTimeout(loop, HIDE_MS); // start dispersed; first appearance after 90s
		return () => clearTimeout(id);
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
			<div style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '1.5rem', opacity: 0.6, textAlign: 'center' }}>
				<div style={{ fontSize: '3.2rem', marginBottom: '12px', animation: 'pulse 2s infinite' }}>⬡</div>
				INITIALIZING SWARM...
			</div>
		</div>
	);

	return (
		<>
			{/* GPGPU Particle Background */}
			<WebGLErrorBoundary fallback={null}>
				<LiquidGlassShader theme={theme} mode={logoFormed ? 1 : 0} />
			</WebGLErrorBoundary>
			<CustomCursor />
			<NoiseOverlay />

			{/* Vignette */}
			<div className="vignette-overlay" style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(4,4,6,0.8) 100%)', zIndex: -98, pointerEvents: 'none' }} />

			{/* ═══ HEADER ═══ */}
			<MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} onOpenHowItWorks={() => setHowOpen(true)} />
			<HowItWorks open={howOpen} onClose={() => setHowOpen(false)} />
			<header className="header" role="banner" aria-label="Mantle AI Swarm Dashboard">
				<a href="/" className="triarchy-logo-wrapper" title="Triarchy Labs">
					<span className="triarchy-logo-text">TRIARCHY</span>
					<span className="triarchy-logo-divider">|</span>
					<div className="triarchy-logo-btn">
						<span className="triarchy-logo-glyph">⬡</span>
					</div>
				</a>

				<div className="header-right-container" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
					<div className="header-right-stats">
						<span className="stats-label">{telem.connected ? (telem.liveMode ? 'LIVE TX' : 'CONNECTED') : 'RECONNECTING'}</span>
					</div>
					<button
						className="theme-toggle-dl"
						onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
						aria-label="Toggle dark/light mode"
					>
						<span className={`theme-letter ${theme === 'dark' ? 'active' : ''}`}>D</span>
						<span className={`theme-letter ${theme === 'light' ? 'active' : ''}`}>L</span>
					</button>
					<div className={`header-menu-btn ${menuOpen ? 'open' : ''}`} role="button" tabIndex={0} aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
						<span className="bar"></span>
						<span className="bar"></span>
					</div>
				</div>
			</header>

			<main>
				{/* ═══ HERO SECTION ═══ */}
				<section className="hero-section" aria-label="Dashboard Hero">
					<div className="hero-blur-bg">
						<img className="mdx-glow-core" src="/assets/images/blurs/cyan-blur.webp" alt="Mantle AI Glow" />
						<div className="mdx-arch-glass"></div>
						<div className="mdx-arch-line"></div>
					</div>
					<div className="hero-content">
						<div className="hero-title-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.2rem' }}>
							<h1 className="hero-title" style={{ margin: 0 }}>
								MANTLE
							</h1>
						</div>
						<div className="hero-bottom-layout">
							<div className="hero-bottom-left">
								<p className="mdx-two-tone-text">
									Autonomous AI swarm operating on Mantle L2.<br/>
									<span className="faded">We don't just execute trades — we shape the on-chain future.</span>
								</p>
								<div 
									className="metrics-pills" 
									aria-label="Key Performance Metrics" 
								>
									<MetricPill label="UPTIME" value={fmtUptime} isActive={!globalPillHover} onHoverChange={setGlobalPillHover} />
									<MetricPill label="CYCLES" value={cycle.toLocaleString()} onHoverChange={setGlobalPillHover} />
									<MetricPill label="TRADES" value={telem.totalTrades.toString()} onHoverChange={setGlobalPillHover} />
									<MetricPill label="CIRCUIT" value={telem.riskState?.circuit_breaker ?? 'N/A'} onHoverChange={setGlobalPillHover} />
								</div>
							</div>
							<div className="hero-bottom-right">
							</div>
						</div>
					</div>
					<div className="tech-stats-bar">
						<span>12 CRATES</span>
						<span className="tech-dot">·</span>
						<span>25,365 LOC</span>
						<span className="tech-dot">·</span>
						<span>24-STAGE PIPELINE</span>
						<span className="tech-dot">·</span>
						<span>8 TITAN MODULES</span>
					</div>
				</section>

				{/* ═══ BENTO GRID ═══ */}
				<div className="bento-grid">
					{/* LIVE MARKET MONITORING CARD (Row 1) */}
					<div className="shape-akari" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card " role="region" aria-label="Live Market Data" style={{ flexGrow: 1, margin: 0 }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>001</div>
							<div>DEXSCREENER LIVE</div>
						</div>
						<div className="bento-content" style={{ overflow: 'visible', margin: 0 }}>
							<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingTop: '3.5rem' }}>
								{telem.markets.map(m => (
									<div key={m.sym} className="market-row" style={{ padding: '0' }}>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', position: 'relative', paddingRight: '2.5rem' }}>
											<div style={{ minWidth: '40%' }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
													<span style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{m.sym}</span>
													{m.regime && <span style={{ fontSize: '1.4rem', padding: '0.3rem 1rem', borderRadius: '3rem', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', fontWeight: 600 }}>{m.regime === 'TRENDING_UP' ? '↑ TREND' : m.regime === 'TRENDING_DOWN' ? '↓ TREND' : m.regime === 'VOLATILE' ? '• VOL' : '~ RANGE'}{m.regimeConf ? ` ${m.regimeConf}%` : ''}</span>}
												</div>
												<div style={{ fontSize: '1.4rem', color: 'var(--foreground)', opacity: 0.25, fontFamily: 'var(--font-mono)', marginTop: '0.3rem' }}>Vol {m.vol}{m.liq ? ` · Liq ${m.liq}` : ''}{m.buySell ? ` · B/S ${m.buySell}` : ''}</div>
											</div>
											<div style={{ textAlign: 'right', flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
												<div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-mono)', color: '#fcfcfd', opacity: 0.35, marginBottom: '0.4rem', fontWeight: 500 }}>{m.change}</div>
												<div style={{ fontSize: '2.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)', lineHeight: 1 }}>{m.price}</div>
											</div>
											<div className="verdict-capsule">
												<div className="verdict-dot" style={{ background: `rgba(0, 212, 255, ${Math.max(0.15, (m.conf - 40) / 60)})`, boxShadow: `0 0 12px rgba(0, 212, 255, ${Math.max(0.15, (m.conf - 40) / 60) + 0.2})` }}></div>
												<div className="verdict-content">
													{m.verdict}<br /><span style={{ fontSize: '1.5rem', opacity: 0.7 }}>{m.conf}%</span>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>DATA • ORACLE • ACTIVE</div>
						<h2 className="lusion-card-title"><TextReveal>Live Market Feed</TextReveal></h2>
					</div>
				</div>

					{/* SWARM AGENT CHAT CARD (Row 2, Left) */}
					<div className="shape-choochoo" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card " role="region" aria-label="Swarm Agent Chat" style={{ flexGrow: 1, margin: 0 }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>002</div>
							<div>MULTI-LLM CONSENSUS</div>
						</div>
						<div className="bento-content" style={{ padding: 0, margin: '1vw -1.5vw -1.5vw -1.5vw', flex: 1, display: 'flex' }}>
							<SwarmChat telem={telem} orbState={orbState} />
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>AI • LLM • EXECUTION</div>
						<h2 className="lusion-card-title"><TextReveal>Swarm Agent AI</TextReveal></h2>
					</div>
				</div>

					{/* RISK MATRIX ENGINE (Row 2, Right) */}
					<div className="shape-ion align-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card " role="region" aria-label="Risk Matrix Engine" style={{ flexGrow: 1, margin: 0 }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>004</div>
							<div>RISK ENGINE</div>
						</div>
						<div className="bento-content" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', overflow: 'visible', margin: 0 }}>
							<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingTop: '3.5rem', gap: '0.4rem' }}>

								{/* Ramp Phase Badge */}
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
										<span style={{ fontSize: 'clamp(10px, 1.5rem, 15px)', padding: '0.3rem 1.2rem', borderRadius: '3rem', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.08em' }}>
											{telem.rampState?.phase_label ?? 'SEED'}
										</span>
										<span style={{ fontSize: 'clamp(14px, 2.4rem, 24px)', opacity: 0.4 }}>Phase {telem.rampState?.current_phase ?? 1}/5</span>
									</div>
									<div style={{ fontSize: '1.5rem', opacity: 0.4 }}>
										↑{telem.rampState?.total_promotions ?? 0} ↓{telem.rampState?.total_demotions ?? 0}
									</div>
								</div>

								{/* Risk rows */}
								<div className="risk-metrics-scroll">
									{[
										{ label: 'Dynamic Leverage', value: `${(telem.riskState?.dynamic_leverage ?? 0).toFixed(1)}×`, accent: true, bold: true },
										{ label: 'Risk Appetite', value: `${((telem.riskState?.risk_appetite ?? 0) * 100).toFixed(0)}%`, accent: true },
										{ label: 'EWMA Confidence', value: `${((telem.riskState?.ewma_confidence ?? 0) * 100).toFixed(1)}%`, accent: true },
										{ label: 'ATR Estimate', value: `${((telem.riskState?.atr_estimate ?? 0) * 100).toFixed(2)}%`, accent: false },
										{ label: 'Pre-trade Factor', value: `${((telem.riskState?.pretrade_factor ?? 0) * 100).toFixed(0)}%`, accent: false },
										{ label: 'Macro Penalty', value: (telem.riskState?.macro_penalty ?? 0).toFixed(3), accent: false, warn: (telem.riskState?.macro_penalty ?? 0) > 0.05 },
										{ label: 'Max Position', value: `${((telem.rampState?.max_position_pct ?? 0.1) * 100).toFixed(0)}%`, accent: false },
										{ label: 'Daily Loss Kill', value: `${telem.rampState?.daily_loss_kill_pct ?? 3.0}%`, accent: false, warn: true },
									].map((row, i) => (
										<div key={i} className="risk-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', transition: 'transform 0.2s ease' }}>
											<span style={{ opacity: 0.5, fontSize: 'clamp(14px, 2.4rem, 24px)' }}>{row.label}</span>
											<span style={{
												color: row.warn ? 'rgba(0,212,255,0.45)' : row.accent ? 'var(--accent)' : 'var(--foreground)',
												fontWeight: row.bold ? 700 : 500,
												fontSize: row.bold ? '1.5rem' : '1.2rem',
												fontFamily: 'var(--font-mono)',
											}}>{row.value}</span>
										</div>
									))}
								</div>

								{/* Circuit Breaker — special row */}
								<div className="risk-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '0.3rem' }}>
									<span style={{ opacity: 0.5, fontSize: 'clamp(14px, 2.4rem, 24px)' }}>Circuit Breaker</span>
									<span style={{ color: telem.riskState?.circuit_breaker === 'GREEN' ? 'var(--accent)' : 'rgba(0,212,255,0.45)', fontWeight: 700, fontSize: 'clamp(16px, 2.8rem, 28px)' }}>
										● {telem.riskState?.circuit_breaker === 'GREEN' ? 'ACTIVE' : (telem.riskState?.circuit_breaker ?? 'N/A')}
									</span>
								</div>

								{/* Progress bars section */}
								<div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
									{[
										{ label: 'LEVERAGE UTILIZATION', value: ((telem.riskState?.dynamic_leverage ?? 5) / 20) * 100 },
										{ label: 'RISK APPETITE', value: (telem.riskState?.risk_appetite ?? 0.85) * 100 },
										{ label: 'EWMA CONFIDENCE', value: (telem.riskState?.ewma_confidence ?? 0.72) * 100 },
									].map((bar, i) => (
										<div key={i}>
											<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
												<span style={{ fontSize: '1.4rem', opacity: 0.4, letterSpacing: '0.06em' }}>{bar.label}</span>
												<span style={{ fontSize: '1.4rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{bar.value.toFixed(0)}%</span>
											</div>
											<div style={{ height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
												<div style={{
													height: '100%',
													width: `${Math.min(bar.value, 100)}%`,
													background: bar.value > 80 ? 'linear-gradient(90deg, #00f5ff, #00d4ff)' : 'linear-gradient(90deg, rgba(0,212,255,0.3), rgba(0,212,255,0.6))',
													borderRadius: '3px',
													transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
												}} />
											</div>
										</div>
									))}
								</div>

							</div>
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>SAFETY • LIMITS • GUARDS</div>
						<h2 className="lusion-card-title"><TextReveal>Risk Matrix</TextReveal></h2>
					</div>
				</div>

					{/* SYNAPTIC DECISION PIPELINE (Row 4) */}
					<div className="shape-hero" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card events-section" role="region" aria-label="Decision Pipeline" style={{ flexGrow: 1, margin: 0 }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>003</div>
							<div>24-STAGE PIPELINE</div>
						</div>
						<div className="bento-content" style={{ justifyContent: 'flex-start', overflow: 'auto' }}>
							<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, paddingTop: '3.5rem' }}>

								{/* Header row: title + verdict badge + stage counter */}
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
										<div className="lusion-dot" style={{ position: 'relative', top: 0, left: 0, right: 'auto', width: '8px', height: '8px', opacity: 0.8 }} />
										<span style={{ fontSize: '2.4rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', opacity: 0.7 }}>SYNAPTIC DECISION PIPELINE</span>
									</div>
									<div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
										{/* Verdict badge */}
										{(() => {
											const mnt = telem.markets?.[0];
											const v = mnt?.verdict ?? 'HOLD';
											const vColor = v === 'BUY' ? 'var(--accent)' : v === 'SELL' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.4)';
											return (
												<span style={{ fontSize: '2.4rem', padding: '0 0.5rem', color: vColor, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
													{v}
												</span>
											);
										})()}
										<span style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>{effectiveStage}/24</span>
									</div>
								</div>

								{/* Active stage name */}
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0' }}>
									<span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'blink 2s ease infinite' }} />
									<span style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
										{pipelineStages[effectiveStage]?.label ?? pipelineStages[0].label}
									</span>
								</div>

								{/* Progress bar — each segment with tooltip */}
								<div style={{ display: 'flex', gap: '3px' }}>
									{pipelineStages.map((s, idx) => (
										<div key={idx} title={`[${s.n}] ${s.label}`} style={{
											flex: 1, height: '8px', borderRadius: '4px', cursor: 'default',
											background: idx < effectiveStage ? 'var(--accent-hover)' : idx === effectiveStage ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
											transition: 'background 0.3s ease',
											boxShadow: idx === effectiveStage ? '0 0 6px var(--accent)' : 'none',
										}} />
									))}
								</div>

								{/* Stage group labels under bar */}
								<div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.2rem' }}>
									{[
										{ label: 'ANALYSIS', span: '01–03' },
										{ label: 'DEBATE', span: '04–08' },
										{ label: 'RISK', span: '09–14' },
										{ label: 'EXEC', span: '15–18' },
										{ label: 'AUDIT', span: '19–24' },
									].map((g, i) => (
										<span key={i} style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)', opacity: 0.3, letterSpacing: '0.06em', textAlign: 'center' }}>
											{g.label}
										</span>
									))}
								</div>

								{/* Benchmark stats row */}
								<div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: '0.3rem' }}>
									{[
										{ label: 'Verdicts', value: telem.benchmark?.total_cycles ?? 0 },
										{ label: 'Agreement', value: `${((telem.benchmark?.agreement_rate ?? 0) * 100).toFixed(1)}%` },
										{ label: 'AI Conf.', value: `${(telem.benchmark?.ai_avg_confidence ?? 0).toFixed(1)}%` },
										{ label: 'Consensus', value: `${telem.benchmark?.agreements ?? 0}/${telem.benchmark?.total_cycles ?? 0}` },
									].map((stat, i) => (
										<div key={i} style={{ textAlign: 'center' }}>
											<div style={{ fontSize: '2.4rem', opacity: 0.35, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{stat.label}</div>
											<div style={{ fontSize: '1.4rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{stat.value}</div>
										</div>
									))}
								</div>

								{/* Expand/collapse toggle */}
								<div className="risk-row" onClick={() => setExpandedPipeline(!expandedPipeline)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '0.3rem', opacity: 0.4, fontSize: '1.5rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
									{expandedPipeline ? '▼ COLLAPSE STAGES' : '▶ EXPAND ALL 24 STAGES'}
								</div>

								{/* Expanded stage list */}
								{expandedPipeline && (
									<div role="list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.3rem' }}>
										{pipelineStages.map((s, idx) => {
											const st = idx < effectiveStage ? 'done' : idx === effectiveStage ? 'active' : 'pending';
											return (
												<div key={s.n} role="listitem" className={`pipeline-stage ${st === 'active' ? 'active' : ''}`} style={{ flex: '1 1 calc(25% - 0.6rem)', padding: '0.5rem 0.8rem' }}>
													<div style={{ display: 'flex', gap: '6px', fontSize: '2.4rem', alignItems: 'center' }}>
														<span style={{ color: st === 'done' ? 'var(--accent-hover)' : st === 'active' ? 'var(--accent)' : 'var(--foreground)', opacity: st === 'pending' ? 0.25 : 0.5, fontSize: '1.4rem' }}>{s.n}</span>
														<span style={{ color: st === 'done' ? 'var(--accent-hover)' : st === 'active' ? '#fff' : 'var(--foreground)', opacity: st === 'pending' ? 0.3 : 1, fontWeight: st === 'active' ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '1.5rem' }}>{s.label}</span>
													</div>
												</div>
											);
										})}
									</div>
								)}

							</div>
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>STATE • DAG • PROCESS</div>
						<h2 className="lusion-card-title"><TextReveal>Execution State</TextReveal></h2>
					</div>
				</div>

					{/* OPEN POSITIONS & TX LOGS (Row 3, Left) */}
					<div className="shape-choochoo" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card " role="region" style={{ flexGrow: 1, margin: 0, padding: 0, overflow: 'hidden', position: 'relative' }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', right: '2.5vw', width: 'auto', boxSizing: 'border-box' }}>
							<div style={{ display: 'flex', gap: '1rem' }}>
								<div>006</div>
								<div>POSITIONS & ON-CHAIN TX</div>
							</div>
							<button 
								onClick={() => setShowTxLogs(!showTxLogs)}
								style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--accent)', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, pointerEvents: 'auto', zIndex: 20, opacity: 1 }}
							>
								{showTxLogs ? 'MUTE LOGS' : 'VIEW LOGS'}
							</button>
						</div>
						<div className="bento-content" style={{ position: 'absolute', top: '3rem', left: 0, right: 0, bottom: 0, overflow: 'hidden', padding: 0, margin: 0 }}>
							<NeuralLoom telem={telem} hasPositions={telem.openPositions.length > 0} />

							{telem.openPositions.length > 0 && !showTxLogs && (
								<div className="glass-positions-layer" style={{ padding: '2.5vw', width: '100%', height: '100%', boxSizing: 'border-box' }}>
									<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5vw' }}>
										{telem.openPositions.map((pos, i) => (
											<div key={i} className="position-row" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1vw', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
												<div>
													<div style={{ fontWeight: 700, fontSize: '2.8rem', marginBottom: '0.5vw' }}>{pos.symbol}</div>
													<span className={`badge ${pos.side === 'Buy' ? 'ok' : 'fail'}`} style={{ fontSize: '2.4rem' }}>{pos.side}</span>
												</div>
												<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', opacity: 0.9, fontFamily: 'var(--font-mono)' }}>
													<span style={{ fontSize: '2.4rem' }}>${pos.entry_price.toFixed(4)}</span>
													<span style={{ color: pos.trailing_stop > 0 ? '#00f5ff' : 'rgba(255,255,255,0.3)', fontSize: '2.4rem', marginTop: '0.5vw' }}>SL: ${pos.trailing_stop.toFixed(4)}</span>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{showTxLogs && (
								<div style={{ position: 'absolute', inset: 0, background: 'transparent', pointerEvents: 'none', zIndex: 10, padding: '2.5vw', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
									<div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '1.5vw', fontSize: '1.4rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ON-CHAIN BROADCAST LOG</div>
									
									<div style={{ display: 'flex', flexDirection: 'column', gap: '0.8vw', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', flex: 1 }}>
										{telem.logs.slice(-25).map((log, i) => (
											<div key={`sys-${i}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
												<span style={{ opacity: 0.3 }}>[{log.time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) + '.000'}]</span> <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{log.tag}</span> {log.msg}
											</div>
										))}
										{telem.txHashes.slice(-5).map((hash, i) => (
											<div key={`tx-${i}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginTop: '0.5vw' }}>
												<span style={{ opacity: 0.3 }}>[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}.000]</span> ⛓️ [ON-CHAIN] TX CONFIRMED: {hash}
											</div>
										))}
										{telem.txHashes.length === 0 && telem.logs.length === 0 && (
											<div style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', fontSize: '1.2rem' }}>Awaiting swarm telemetry...</div>
										)}
									</div>
								</div>
							)}
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>GRID • IMMERSIVE • ALPHA</div>
						<h2 className="lusion-card-title"><TextReveal>{telem.openPositions.length === 0 ? 'Neural Topology' : `Execution Targets (${telem.openPositions.length})`}</TextReveal></h2>
					</div>
				</div>

					{/* AUTO-RAMP CAPITAL SCALING (Row 3, Right) */}
					<div className="shape-ion align-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card" role="region" style={{ flexGrow: 1, margin: 0, padding: 0, overflow: 'visible', background: 'transparent', border: 'none' }}>
						<div className="flip-card-container">
							<div className={`flip-card-inner ${isAutoRampFlipped ? 'is-flipped' : ''}`}>
								{/* --- FRONT: VISUALIZER --- */}
								<div className="flip-card-front bento-card" style={{ margin: 0, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
									<div className="lusion-dot"></div>
									<div className="lusion-top-meta">
										<div>005</div>
										<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
											{manualPhaseOverride !== null && <span style={{ color: '#00a8cc', animation: 'blink 1s infinite' }}>OVERRIDE ACTIVE</span>}
											<span>SCALING</span>
											<button onClick={() => setIsAutoRampFlipped(true)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', opacity: 0.5, cursor: 'pointer', fontSize: 'clamp(10px, 1.4rem, 14px)', padding: '0 5px' }} title="Configure">⚙</button>
										</div>
									</div>
									<div className="bento-content" style={{ fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center', flex: 1 }}>
										<div style={{ textAlign: 'center' }}>
											<div style={{ fontSize: 'clamp(20px, 3.8rem, 38px)', fontWeight: 800, color: manualPhaseOverride ? '#00a8cc' : 'var(--accent)', textShadow: manualPhaseOverride ? '0 0 20px rgba(0,168,204,0.5)' : '0 0 20px var(--accent-glow)', letterSpacing: '0.05em', transition: 'color 0.3s' }}>
												{overrideFlash !== null ? 'OVERRIDE...' : (manualPhaseOverride ? ['SEED', 'SPROUT', 'GROWTH', 'MATURE', 'APEX'][manualPhaseOverride - 1] : (telem.rampState?.phase_label ?? 'SEED'))}
											</div>
											<div style={{ fontSize: 'clamp(10px, 1.5rem, 15px)', opacity: 0.5, marginTop: '0.5rem', letterSpacing: '0.1em' }}>
												PHASE {manualPhaseOverride || telem.rampState?.current_phase || 1} OF 5
											</div>
										</div>
										
										<div style={{ display: 'flex', alignItems: 'flex-end', height: '80px', gap: '8px', padding: '0 1rem' }}>
											{['SEED', 'SPROUT', 'GROWTH', 'MATURE', 'APEX'].map((label, i) => {
												const phaseNum = i + 1;
												const actualPhase = telem.rampState?.current_phase ?? 1;
												const currentPhase = manualPhaseOverride || actualPhase;
												const isActive = phaseNum === currentPhase;
												const isPassed = phaseNum < currentPhase;
												const isOverride = manualPhaseOverride === phaseNum;
												
												const limits = ['Max Cap: 10%', 'Max Cap: 25%', 'Max Cap: 50%', 'Max Cap: 75%', 'Max Cap: 100%'];
												const reqs = ['Req: 2 Wins', 'Req: 3 Wins', 'Req: 5 Wins', 'Req: 10 Wins', 'Apex Mode'];
												
												return (
													<div 
														key={label} 
														className="phase-step"
														onClick={() => {
															setOverrideFlash(phaseNum);
															setTimeout(() => setOverrideFlash(null), 500);
															setManualPhaseOverride(phaseNum);
														}}
														style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
													>
														<div className="phase-tooltip">
															<div style={{ color: 'var(--accent)', marginBottom: '4px', fontWeight: 'bold' }}>{label}</div>
															<div>{limits[i]}</div>
															<div style={{ opacity: 0.7 }}>{reqs[i]}</div>
															<div style={{ color: '#00a8cc', marginTop: '4px', opacity: 0.8 }}>Click to Override</div>
														</div>
														<div style={{ 
															width: '100%', 
															height: `${20 + i * 15}px`, 
															borderRadius: '2px', 
															background: isOverride ? '#00a8cc' : isActive ? 'var(--accent)' : isPassed ? 'var(--accent-muted)' : 'rgba(255,255,255,0.05)', 
															boxShadow: isOverride ? '0 0 15px rgba(0,168,204,0.5)' : isActive ? '0 0 15px var(--accent-glow)' : 'none',
															transition: 'all 0.4s ease'
														}} />
														<div style={{ 
															fontSize: 'clamp(10px, 1.4rem, 14px)', 
															opacity: isActive ? 1 : isPassed ? 0.7 : 0.3, 
															color: isOverride ? '#00a8cc' : isActive ? 'var(--accent)' : 'inherit',
															fontWeight: isActive ? 700 : 400
														}}>
															{label}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								</div>

								{/* --- BACK: CONFIG --- */}
								<div className="flip-card-back bento-card" style={{ margin: 0, padding: '1.5rem', background: 'var(--background)' }}>
									<div className="lusion-dot" style={{ background: '#00a8cc', boxShadow: '0 0 10px #00a8cc' }}></div>
									<div className="lusion-top-meta">
										<div>CONFIG</div>
										<div style={{ color: '#00a8cc' }}>SUPERVISOR</div>
									</div>
									<div className="bento-content" style={{ fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
										<div>
											<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', opacity: 0.7, fontSize: '2.4rem' }}>
												<span>Daily Loss Kill</span>
												<span style={{ color: 'var(--accent)' }}>{configValues.lossKill.toFixed(1)}%</span>
											</div>
											<input type="range" min="1.0" max="10.0" step="0.1" value={configValues.lossKill} onChange={e => setConfigValues({...configValues, lossKill: parseFloat(e.target.value)})} className="cyber-slider" />
										</div>
										<div>
											<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', opacity: 0.7, fontSize: '2.4rem' }}>
												<span>Max Position Cap</span>
												<span style={{ color: 'var(--accent)' }}>{configValues.maxCap}%</span>
											</div>
											<input type="range" min="10" max="100" step="5" value={configValues.maxCap} onChange={e => setConfigValues({...configValues, maxCap: parseInt(e.target.value)})} className="cyber-slider" />
										</div>
										<button 
											onClick={() => setIsAutoRampFlipped(false)}
											style={{ 
												background: 'var(--accent-muted)', 
												border: '1px solid var(--accent)', 
												color: 'var(--accent)', 
												padding: '0.75rem', 
												fontFamily: 'var(--font-mono)', 
												letterSpacing: '0.1em',
												cursor: 'pointer',
												marginTop: '1rem',
												transition: 'all 0.2s',
												fontWeight: 'bold'
											}}
										>
											DEPLOY PARAMS
										</button>
										{manualPhaseOverride !== null && (
											<button 
												onClick={() => { setManualPhaseOverride(null); setIsAutoRampFlipped(false); }}
												style={{ background: 'transparent', border: '1px solid #00a8cc', color: '#00a8cc', padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '1.4rem', cursor: 'pointer' }}
											>
												RESET OVERRIDE
											</button>
										)}
									</div>
								</div>
							</div>
						</div>
					</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>CAPITAL • GROWTH</div>
						<h2 className="lusion-card-title"><TextReveal>Auto-Ramp</TextReveal></h2>
					</div>
				</div>

					{/* LOG STREAM (Row 5) */}
					<div className="shape-akari align-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card " role="log" aria-live="polite" style={{ flexGrow: 1, margin: 0 }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>007</div>
							<div>SYSTEM LOG</div>
						</div>
						<div className="bento-content">
							<div ref={logRef} className="log-terminal" style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
								{telem.logs.map((l, i) => (
									<div key={i} className="log-row" style={{ display: 'flex', gap: '1rem', color: 'var(--foreground)', opacity: 0.8, padding: '0.2rem 0', fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
										<span style={{ color: 'var(--foreground)', opacity: 0.3, minWidth: '85px' }}>{logTime(l.off)}</span>
										<span style={{ color: l.type === 'success' ? '#00f5ff' : 'var(--accent)', fontWeight: 700, minWidth: '95px' }}>{l.tag}</span>
										<span style={{ opacity: 0.9 }}>{l.msg}</span>
									</div>
								))}
								{/* Auto-scroll anchor removed to prevent window scroll hijacking */}
							</div>
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>EVENTS • LOGS • TRACE</div>
						<h2 className="lusion-card-title"><TextReveal>Activity Stream</TextReveal></h2>
					</div>
				</div>

					{/* SYNAPTIC DECISION JOURNAL (Row 7) */}
					<div className="shape-ion" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card " role="region" style={{ flexGrow: 1, margin: 0 }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>009</div>
							<div>DECISION LOG</div>
						</div>
						<div className="bento-content">
							<div style={{ display: 'flex', flexDirection: 'column', gap: '1vw' }}>
								{(telem as any).decisions?.map((d: any, i: number) => (
									<div key={i} className="decision-row" style={{
										display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0'
									}}>
										<div style={{ display: 'flex', flexDirection: 'column', gap: '0.3vw', flex: 1, paddingRight: '1rem' }}>
											<div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700 }}>
												{d.sym} <span style={{ opacity: 0.4, fontSize: '1.4rem', marginLeft: '0.5vw' }}>{d.time}</span>
											</div>
											<div style={{ fontSize: '1.5rem', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{d.reason}</div>
										</div>
										<span style={{ 
											fontSize: '1.4rem', 
											fontWeight: 700, 
											letterSpacing: '0.1em',
											color: d.verdict === 'EXECUTED' ? '#00f5ff' : d.verdict === 'HOLD' ? 'var(--foreground)' : 'var(--accent)'
										}}>
											{d.verdict}
										</span>
									</div>
								))}
							</div>
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ALPHA • VERDICTS • HISTORY</div>
						<h2 className="lusion-card-title"><TextReveal>Decision Journal</TextReveal></h2>
					</div>
				</div>

					{/* ON-CHAIN ACTIVITY (Row 7, Right) */}
					<div className="shape-choochoo align-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card " role="region" style={{ flexGrow: 1, margin: 0 }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>010</div>
							<div>BLOCKCHAIN</div>
						</div>
						<div className="bento-content" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', display: 'flex', flexDirection: 'column', gap: '2vw' }}>
							<div style={{ paddingBottom: '1.5vw' }}>
								<div style={{ fontSize: '2.4rem', opacity: 0.5, marginBottom: '1vw', textTransform: 'uppercase', letterSpacing: '0.1em' }}>✓ Sourcify Verified</div>
								<a href="https://mantlescan.xyz/address/0xEb271ece1aB2f72835556Ee67ad0BCA36a378a66#code" target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block', marginBottom: '0.5vw' }}>
									→ 0xEb27...8a66 <span style={{ opacity: 0.4, fontSize: '1.4rem' }}>(Registry)</span>
								</a>
								<a href="https://mantlescan.xyz/address/0x19A53120FE1f0147f28fE83c2922A402AC98217c#code" target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block' }}>
									→ 0x19A5...217c <span style={{ opacity: 0.4, fontSize: '1.4rem' }}>(Liquidator)</span>
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
								<span style={{ color: telem.liveMode ? '#00f5ff' : 'var(--accent-hover)', fontWeight: 700 }}>
									{telem.liveMode ? '◉ LIVE TX' : '○ DRY-RUN'}
								</span>
							</div>
							{telem.txHashes.length > 0 && (
								<div style={{ paddingTop: '2vw', marginTop: 'auto' }}>
									<div style={{ marginBottom: '1vw', opacity: 0.5, fontSize: '2.4rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent TXs</div>
									{telem.txHashes.slice(-3).map((hash, i) => (
										<a key={i} href={`https://mantlescan.xyz/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="onchain-link" style={{ display: 'block', marginBottom: '0.5vw' }}>
											→ {hash.slice(0, 10)}…{hash.slice(-8)}
										</a>
									))}
								</div>
							)}
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1.5rem' }}>
						<div>
							<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>MANTLE L2 • TX • VERIFIED</div>
							<h2 className="lusion-card-title"><TextReveal>On-Chain Activity</TextReveal></h2>
						</div>
						<button className="lusion-btn-glass" onClick={() => window.open(`https://mantlescan.xyz/address/0xEb271ece1aB2f72835556Ee67ad0BCA36a378a66`, '_blank')} aria-label="View On-Chain Agent NFT">
							[ VIEW AGENT NFT ]
						</button>
					</div>
				</div>

					{/* SWARM MEMORY NEXUS (Row 6) */}
					<div className="shape-choochoo align-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
					<article className="bento-card " role="region" style={{ flexGrow: 1, margin: 0 }}>
						<div className="lusion-dot"></div>
						<div className="lusion-top-meta">
							<div>008</div>
							<div>MEMORY DB</div>
						</div>
						<div className="bento-content" style={{ display: 'flex', flexDirection: 'column', gap: '1vw' }}>
							{(telem as any).memoryStream?.map((m: any, idx: number) => (
								<div key={idx} className="db-matrix-row" style={{
									fontFamily: 'var(--font-mono)', fontSize: '1.5rem', padding: '0.5vw', borderLeft: `2px solid ${m.action === 'VECTOR_WRITE' ? '#00f5ff' : 'var(--accent)'}`
								}}>
									<div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6, marginBottom: '0.2vw' }}>
										<span style={{ color: m.action === 'VECTOR_WRITE' ? '#00f5ff' : 'inherit' }}>[{m.action}]</span>
										<span>{m.id}</span>
									</div>
									<div style={{ color: 'var(--foreground)', opacity: 0.9 }}>{m.content}</div>
								</div>
							))}
							{/* Pulse cursor at the end to simulate typing */}
							<div style={{ animation: 'blink 1s infinite', color: '#00f5ff', opacity: 0.5, marginTop: '1vw' }}>_</div>
						</div>
						</article>
					<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
						<div className="lusion-card-tags" style={{ fontSize: '2.4rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>RAG • VECTORS • KNOWLEDGE</div>
						<h2 className="lusion-card-title"><TextReveal>Memory Nexus</TextReveal></h2>
					</div>
				</div>
				</div>

				{/* CONTROL BAR (Centered below grid) */}
				<div className="control-bar" style={{ 
					marginBottom: '4rem', 
					position: 'relative',
					width: '100%' 
				}}>
					{/* Grid aligned with the cards above */}
					<div className="bento-grid" style={{
						marginTop: 0,
						paddingBottom: 0,
						minHeight: 0,
						rowGap: 0,
						width: '100%'
					}}>
						{/* Dummy div to force columns 1-5 to hold their width, matching Card 007 */}
						<div style={{ gridColumn: 'span 5' }}></div>

						{/* Buttons explicitly mapped to Card 008's grid coordinates */}
						<div className="shape-choochoo align-right" style={{ 
							display: 'flex', 
							justifyContent: 'flex-start', 
							alignItems: 'center',
							aspectRatio: 'auto',
						}}>
							<button className="lusion-btn-primary" onClick={handleLaunch} aria-label="Launch Synaptic Analysis" style={{ padding: '1.5rem 0', width: '100%', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
								{analysisRunning ? '[ ◎ RUNNING... ]' : '[ LAUNCH ANALYSIS ]'}
							</button>
						</div>
					</div>
					
					{/* Scroll to Top Button */}
					<div style={{ position: 'absolute', right: '4rem', top: '50%', marginTop: '-2.5rem', animation: 'pulse-drift 4s ease-in-out infinite' }}>
						<button 
							className="lusion-btn-up" 
							onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
							aria-label="Scroll to top"
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M12 19V5M5 12l7-7 7 7"/>
							</svg>
						</button>
					</div>
				</div>

				{/* ═══ FOOTER ═══ */}
				<div className="footer-bar" style={{ 
					background: 'transparent', 
					border: 'none', 
					boxShadow: 'none',
					fontWeight: 600,
					opacity: 0.5,
					letterSpacing: '0.05em'
				}}>
					<span>Build: v5.0-triarchy · 24-stage pipeline →</span>
					<span>Paper validation · PnL {telem.pnl} · WR {telem.winRate}</span>
					<span style={{ color: 'var(--accent)' }}>⬡ SYSTEM ACTIVE · MANTLE DOMAIN</span>
					<span>Last Update: {footerTime}</span>
				</div>


			</main>
		</>
	);
}
