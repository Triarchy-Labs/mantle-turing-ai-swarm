/**
 * useTelemetry — Polls swarm-engine telemetry API and maps to dashboard state.
 * On backend outage: freezes the last known REAL data and flags as disconnected.
 * Never fabricates metrics — only real telemetry is ever displayed.
 * Endpoint: http://localhost:3402/
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const TELEMETRY_URL = import.meta.env.VITE_TELEMETRY_URL || 'https://mantle-swarm-engine.onrender.com';

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
  // Optional on-chain attestation fields (populated once the backend writes verdicts
  // to DecisionAttestor). Absent until then — the UI degrades honestly.
  verdict_tx?: string;
  inputs_hash?: string;
  chain_hash?: string;
  score?: number;
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
  risk_state: RiskState | null;
  ramp_state: RampState | null;
  open_positions: PositionEntry[];
}

interface RiskState {
  dynamic_leverage: number;
  atr_estimate: number;
  macro_penalty: number;
  ewma_confidence: number;
  risk_appetite: number;
  pretrade_factor: number;
  circuit_breaker: string;
}

interface RampState {
  current_phase: number;
  phase_label: string;
  max_position_pct: number;
  daily_loss_kill_pct: number;
  total_promotions: number;
  total_demotions: number;
}

interface PositionEntry {
  symbol: string;
  side: string;
  entry_price: number;
  quantity: number;
  unrealized_pnl: number;
  hold_duration_secs: number;
  trailing_stop: number;
  unstuck_stage: string;
}

export interface DecisionEntry {
  sym: string;
  verdict: 'EXECUTED' | 'REJECTED' | 'HOLD';
  reason: string;
  time: string;
  // On-chain proof (present once the verdict is attested to DecisionAttestor).
  txHash?: string;      // Mantlescan tx of the recordVerdict() call
  inputsHash?: string;  // keccak256 of the canonical 15-factor inputs — recompute to verify
  chainHash?: string;   // tamper-evident chain tip for this verdict
  score?: number;       // deterministic judge score
}

export interface MemoryEntry {
  id: string;
  action: 'RAG_SEARCH' | 'VECTOR_WRITE' | 'GRAPH_LINK';
  content: string;
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
  regime?: string;
  regimeConf?: number;
  liq?: string;
  buySell?: string;
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
  logs: { tag: string; msg: string; type: string; off: number; time?: string }[];
  txHashes: string[];
  pnl: string;
  winRate: string;
  version: string;
  registryAddress: string;
  chainId: number;
  agentId: number;
  benchmark: BenchmarkTelemetry | null;
  paperStats: PaperStats | null;
  riskState: RiskState | null;
  rampState: RampState | null;
  openPositions: PositionEntry[];
  decisions: DecisionEntry[];
  memoryStream: MemoryEntry[];
  totalTrades: number;
  balance: string;
  maxDrawdown: string;
}

const ROLE_COLORS: Record<string, string> = { bull: '#7dd4e0', bear: '#00f5ff', macro: '#00d4ff' };

// ── Initial / offline state — honest placeholders, NO fabricated metrics ──
// Shown only before the first successful fetch. Once real data arrives it is
// kept (frozen) during any outage; we never invent numbers the agent didn't produce.
const INITIAL_DATA: TelemetryData = {
  connected: false,
  liveMode: false,
  cycle: 0,
  uptimeSecs: 0,
  pipelineStage: 0,
  pipelineTotal: 24,
  markets: [],
  debates: [],
  logs: [],
  txHashes: [],
  pnl: '—',
  winRate: '—',
  version: 'v5.0-triarchy',
  registryAddress: '0xEb27…8a66',
  chainId: 5000,
  agentId: 1,
  benchmark: null,
  paperStats: null,
  riskState: null,
  rampState: null,
  openPositions: [],
  decisions: [],
  memoryStream: [],
  totalTrades: 0,
  balance: '—',
  maxDrawdown: '—',
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
    regime: s.regime || 'RANGING',
    regimeConf: s.regime_confidence ? Math.round(s.regime_confidence * 100) : undefined,
    liq: s.liquidity_usd ? formatVolume(s.liquidity_usd) : undefined,
    buySell: s.buy_sell_ratio ? `${(s.buy_sell_ratio * 100).toFixed(1)}%` : undefined,
  }));

  const ps = resp.paper_stats;

  // Map debates (empty when the backend has none — never fabricated)
  const debates = resp.debates.map(d => ({
    agent: d.agent,
    color: ROLE_COLORS[d.role] || '#00d4ff',
    msg: d.message,
    time: new Date(d.timestamp * 1000).toLocaleTimeString('en-US', { hour12: false }),
  }));

  // Map logs
  const logs = resp.log_entries.map((l, i) => ({
    tag: l.tag,
    msg: l.message,
    type: l.level === 'success' ? 'success' : '',
    off: i,
    time: l.timestamp ? new Date(l.timestamp * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }) : undefined,
  }));

  return {
    connected: true,
    liveMode: resp.live_mode ?? false,
    cycle: resp.cycle,
    uptimeSecs: resp.uptime_secs,
    pipelineStage: resp.pipeline_stage,
    pipelineTotal: resp.pipeline_total,
    markets,
    debates,
    logs,
    decisions: (resp.log_entries || []).filter(l => l.tag === '[JUDGE]').slice(-3).reverse().map(l => {
      const parts = l.message.split(': ');
      const sym = parts[0] || 'UNK';
      const body = parts[1] || '';
      const verdictStr = (body.includes('BUY') || body.includes('SELL') ? 'EXECUTED' : 'HOLD') as 'EXECUTED' | 'REJECTED' | 'HOLD';
      const scoreStr = body.replace('Verdict=', '');
      return {
        sym,
        verdict: verdictStr,
        reason: scoreStr,
        time: new Date((l.timestamp || 0) * 1000).toLocaleTimeString('en-US', { hour12: false }),
        txHash: l.verdict_tx,
        inputsHash: l.inputs_hash,
        chainHash: l.chain_hash,
        score: l.score,
      };
    }),
    memoryStream: (resp as unknown as { memory_stream?: MemoryEntry[] }).memory_stream ?? [],
    txHashes: resp.tx_hashes ?? [],
    pnl: ps ? `$${ps.total_pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
    winRate: ps ? `${(ps.win_rate * 100).toFixed(1)}%` : '—',
    version: resp.version,
    registryAddress: resp.registry_address.length > 12
      ? `${resp.registry_address.slice(0, 6)}…${resp.registry_address.slice(-4)}`
      : resp.registry_address,
    chainId: resp.chain_id,
    agentId: resp.agent_id,
    benchmark: resp.benchmark,
    paperStats: resp.paper_stats,
    riskState: resp.risk_state,
    rampState: resp.ramp_state,
    openPositions: resp.open_positions ?? [],
    totalTrades: resp.paper_stats?.total_trades ?? 0,
    balance: ps ? `$${ps.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
    maxDrawdown: ps ? `${(ps.max_drawdown * 100).toFixed(1)}%` : '—',
  };
}

export function useTelemetry(): TelemetryData {
  const [data, setData] = useState<TelemetryData>(INITIAL_DATA);
  const failCountRef = useRef(0);

  // Exponential backoff: 5s → 10s → 30s → 60s → 5min (cap)
  const getBackoffInterval = useCallback((failures: number) => {
    const intervals = [5000, 10000, 30000, 60000, 300000];
    return intervals[Math.min(failures, intervals.length - 1)];
  }, []);

  const fetchTelemetry = useCallback(async () => {
    try {
      const timeout = failCountRef.current > 2 ? 8000 : 60000;
      const resp = await fetch(TELEMETRY_URL, { signal: AbortSignal.timeout(timeout) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: TelemetryResponse = await resp.json();
      setData(mapResponse(json));

      if (failCountRef.current > 0) {
        console.info('[telemetry] Backend reconnected');
        failCountRef.current = 0;
      }
    } catch {
      if (failCountRef.current === 0) {
        console.info('[telemetry] Backend unreachable — holding last known data, reconnecting…');
      }
      failCountRef.current++;
      // Honest offline state: keep the last known REAL data on screen, flag as
      // disconnected. No fabricated metrics, debates, or tx hashes — ever.
      setData(prev => ({ ...prev, connected: false, liveMode: false }));
    }
  }, []);

  // Adaptive polling: reschedule with backoff after each tick.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const tick = async () => {
      await fetchTelemetry();
      if (cancelled) return;
      timeoutId = setTimeout(tick, getBackoffInterval(failCountRef.current));
    };

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [fetchTelemetry, getBackoffInterval]);

  return data;
}
