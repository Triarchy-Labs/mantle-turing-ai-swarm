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

interface TelemetryResponse {
  version: string;
  uptime_secs: number;
  cycle: number;
  symbols: SymbolTelemetry[];
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
  cycle: number;
  uptimeSecs: number;
  markets: MarketRow[];
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
const MOCK_DATA: TelemetryData = {
  connected: false,
  cycle: 0,
  uptimeSecs: 0,
  markets: [
    { sym: 'MNT', price: '$0.7833', vol: '$1,248,092', change: '+4.58%', up: true, conf: 82.5, verdict: 'BUY' },
    { sym: 'WMNT', price: '$0.7841', vol: '$842,104', change: '+4.64%', up: true, conf: 78.4, verdict: 'BUY' },
    { sym: 'ETH', price: '$3,224.03', vol: '$41,209,500', change: '-1.75%', up: false, conf: 55.6, verdict: 'HOLD' },
  ],
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

  return {
    connected: true,
    cycle: resp.cycle,
    uptimeSecs: resp.uptime_secs,
    markets: markets.length > 0 ? markets : MOCK_DATA.markets,
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
