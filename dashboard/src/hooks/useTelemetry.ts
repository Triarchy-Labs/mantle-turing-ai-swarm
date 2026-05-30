/**
 * useTelemetry — Polls swarm-engine telemetry API and maps to dashboard state.
 * Falls back to mock data when backend is offline.
 * Endpoint: http://localhost:3402/
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const TELEMETRY_URL = 'http://localhost:3402';
const POLL_INTERVAL = 5000; // 5s

// ── Telemetry API response types ──
interface SymbolTelemetry {
  symbol: string;
  price: number;
  price_change_24h: number;
  regime: string;
  regime_confidence: number;
  verdict: string;
  score: number;
  confidence: number;
  volume_24h: number;
  buy_sell_ratio: number;
  liquidity_usd: number;
  on_chain_logged: boolean;
}

interface PaperStats {
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  max_drawdown: number;
  balance: number;
}

interface BenchmarkTelemetry {
  total_cycles: number;
  agreements: number;
  agreement_rate: number;
  ai_avg_confidence: number;
}

interface DebateEntry {
  symbol: string;
  agent: string;
  message: string;
  role: string;
  timestamp: number;
}

interface LogEntry {
  timestamp: number;
  tag: string;
  message: string;
  level: string;
}

interface TelemetryResponse {
  version: string;
  uptime_secs: number;
  cycle: number;
  pipeline_stage: number;
  pipeline_total: number;
  live_mode: boolean;
  symbols: SymbolTelemetry[];
  debates: DebateEntry[];
  log_entries: LogEntry[];
  tx_hashes: string[];
  paper_stats: PaperStats | null;
  benchmark: BenchmarkTelemetry | null;
  pipeline: string;
  agent_id: number;
  chain_id: number;
  registry_address: string;
}

// ── Dashboard-facing types ──
export interface MarketRow {
  sym: string;
  price: string;
  vol: string;
  change: string;
  up: boolean;
  conf: number;
  verdict: string;
}

export interface TelemetryData {
  connected: boolean;
  liveMode: boolean;
  cycle: number;
  uptimeSecs: number;
  pipelineStage: number;
  pipelineTotal: number;
  markets: MarketRow[];
  debates: { agent: string; color: string; msg: string; time: string }[];
  logs: { tag: string; msg: string; type: string; off: number }[];
  txHashes: string[];
  pnl: string;
  winRate: string;
  version: string;
  registryAddress: string;
  chainId: number;
  agentId: number;
  benchmark: BenchmarkTelemetry | null;
  paperStats: PaperStats | null;
}

// ── Mock fallback (used when backend is offline) ──
const ROLE_COLORS: Record<string, string> = { bull: '#a855f7', bear: '#00f5ff', macro: '#00d4ff' };

const MOCK_DEBATES = [
  { agent: 'Veldora (Synthesis)', color: '#a855f7', msg: 'Trade volume surged 14% in 4h. Movement vector confirms BUY signal.', time: '' },
  { agent: 'Zegion (Executor)', color: '#00f5ff', msg: 'Must verify liquidity depth on Agni pools before order entry.', time: '' },
  { agent: 'Diablo (Architect)', color: '#00d4ff', msg: 'SMA(20) crossed above SMA(50). Strong bullish impulse for MNT.', time: '' },
];

const MOCK_LOGS = [
  { tag: '[SYNAPSE]', msg: 'Veldora (Synthesis): Trade volume surged 14% in 4h. Vector confirms...', type: '', off: 0 },
  { tag: '[ANALYSIS]', msg: 'MNT trend strength index at 72.3%. Market regime: Bullish.', type: '', off: 1 },
  { tag: '[SYNAPSE]', msg: 'Launching arbiter contest between Diablo and Zegion...', type: '', off: 2 },
  { tag: '[ML]', msg: 'Local ML prediction complete. Asset growth probability: 81.2%', type: '', off: 3 },
  { tag: '[VECTOR]', msg: 'Similar pattern found from 2026-05-27 in vector archive. Success: 89%', type: 'success', off: 4 },
  { tag: '[JUDGE]', msg: 'Seven factors analyzed. Final verdict: BUY with weight 1.75.', type: '', off: 5 },
  { tag: '[AUDIT]', msg: 'Slippage and front-running risk checks: all passed.', type: 'success', off: 6 },
  { tag: '[ENTRY]', msg: 'Optimal entry point detected: $0.7852. Launching swarm orders.', type: '', off: 7 },
  { tag: '[CONSENSUS]', msg: 'Swarm Consensus reached: BUY with 82.5% probability.', type: 'success', off: 8 },
  { tag: '[RISK]', msg: 'Risk limit checks passed: margin deviation < 2%. No risks.', type: '', off: 9 },
];

const MOCK_DATA: TelemetryData = {
  connected: false,
  liveMode: false,
  cycle: 0,
  uptimeSecs: 0,
  pipelineStage: 10,
  pipelineTotal: 13,
  markets: [
    { sym: 'MNT', price: '$0.7833', vol: '$1,248,092', change: '+4.58%', up: true, conf: 82.5, verdict: 'BUY' },
    { sym: 'WMNT', price: '$0.7841', vol: '$842,104', change: '+4.64%', up: true, conf: 78.4, verdict: 'BUY' },
    { sym: 'ETH', price: '$3,224.03', vol: '$41,209,500', change: '-1.75%', up: false, conf: 55.6, verdict: 'HOLD' },
  ],
  debates: MOCK_DEBATES,
  logs: MOCK_LOGS,
  txHashes: [],
  pnl: '$1,444.91',
  winRate: '75.7%',
  version: 'v4.2-triarchy',
  registryAddress: '0xFA0b…8383',
  chainId: 5000,
  agentId: 1,
  benchmark: null,
  paperStats: null,
};

function formatPrice(price: number): string {
  if (price >= 100) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toFixed(4)}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${Math.round(vol).toLocaleString()}`;
  return `$${vol.toFixed(0)}`;
}

function formatChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function mapVerdict(v: string): string {
  const upper = v.toUpperCase();
  if (upper.includes('BUY')) return 'BUY';
  if (upper.includes('SELL')) return 'SELL';
  return 'HOLD';
}

function mapResponse(resp: TelemetryResponse): TelemetryData {
  const markets: MarketRow[] = resp.symbols.map(s => ({
    sym: s.symbol,
    price: formatPrice(s.price),
    vol: formatVolume(s.volume_24h),
    change: formatChange(s.price_change_24h),
    up: s.price_change_24h >= 0,
    conf: Math.round(s.confidence * 10) / 10,
    verdict: mapVerdict(s.verdict),
  }));

  const ps = resp.paper_stats;

  // Map debates
  const debates = resp.debates.length > 0
    ? resp.debates.map(d => ({
        agent: d.agent,
        color: ROLE_COLORS[d.role] || '#00d4ff',
        msg: d.message,
        time: new Date(d.timestamp * 1000).toLocaleTimeString('en-US', { hour12: false }),
      }))
    : MOCK_DEBATES;

  // Map logs
  const logs = resp.log_entries.length > 0
    ? resp.log_entries.map((l, i) => ({
        tag: l.tag,
        msg: l.message,
        type: l.level === 'success' ? 'success' : '',
        off: i,
      }))
    : MOCK_LOGS;

  return {
    connected: true,
    liveMode: resp.live_mode ?? false,
    cycle: resp.cycle,
    uptimeSecs: resp.uptime_secs,
    pipelineStage: resp.pipeline_stage,
    pipelineTotal: resp.pipeline_total,
    markets: markets.length > 0 ? markets : MOCK_DATA.markets,
    debates,
    logs,
    txHashes: resp.tx_hashes ?? [],
    pnl: ps ? `$${ps.total_pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : MOCK_DATA.pnl,
    winRate: ps ? `${(ps.win_rate * 100).toFixed(1)}%` : MOCK_DATA.winRate,
    version: resp.version,
    registryAddress: resp.registry_address.length > 12
      ? `${resp.registry_address.slice(0, 6)}…${resp.registry_address.slice(-4)}`
      : resp.registry_address,
    chainId: resp.chain_id,
    agentId: resp.agent_id,
    benchmark: resp.benchmark,
    paperStats: resp.paper_stats,
  };
}

export function useTelemetry(): TelemetryData {
  const [data, setData] = useState<TelemetryData>(MOCK_DATA);
  const lastErrorRef = useRef(0);

  const fetchTelemetry = useCallback(async () => {
    try {
      const resp = await fetch(TELEMETRY_URL, { signal: AbortSignal.timeout(3000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: TelemetryResponse = await resp.json();
      setData(mapResponse(json));
      lastErrorRef.current = 0;
    } catch {
      // Suppress log spam: only log first error
      if (lastErrorRef.current === 0) {
        console.info('[telemetry] Backend offline — using mock data');
      }
      lastErrorRef.current = Date.now();
      setData(prev => ({ ...prev, connected: false }));
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const t = setInterval(fetchTelemetry, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchTelemetry]);

  return data;
}
