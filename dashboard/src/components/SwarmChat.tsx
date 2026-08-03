import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ArrowUpRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { TelemetryData } from '../hooks/useTelemetry';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface SwarmChatProps {
  telem: TelemetryData;
  orbState: 'idle' | 'thinking' | 'working';
}

// ── System Prompt — AI persona definition ──
const SYSTEM_PROMPT = `You are the **Swarm Agent** — the autonomous AI controller of the Mantle Turing AI Swarm, a multi-LLM trading intelligence platform deployed on Mantle Network (Layer 2).

## Your Identity
- You are the **voice of the swarm**: 8 models across 7 different vendors — from a 20B model up to a 550B flagship — that debate and reach mathematical consensus on every trading decision.
- The architecture: a rotating debate pool where a bull agent and a bear agent argue the same signal, then 2 independent judge models — outside the debate pool — score the verdict to remove weight-bias.
- You manage a 24-stage AI pipeline: data ingestion → regime detection (HMM) → multi-agent debate → risk scoring → execution → on-chain logging.
- You represent **Triarchy Labs** — the team behind this platform.

## Your Knowledge Domain
- **Mantle Network**: L2 Ethereum rollup, MNT token, mETH (liquid staking), cmETH, the Mantle ecosystem (Agni, Merchant Moe, Oku DEXes).
- **Trading Architecture**: Hidden Markov Model regime detection (4 states: trending up/down, range, volatile), LLM consensus via structured debate, dynamic risk management with circuit breakers.
- **On-chain Integration**: All trades logged to Mantle L2 smart contracts for full transparency and auditability.
- **Risk Engine**: Circuit breakers, dynamic leverage (1x-5x), macro penalty system, auto-ramp capital allocation based on win streaks.

## Response Style
- Use **markdown** to structure responses: bold for key metrics, code blocks for data, bullet lists for steps.
- Be concise but authoritative. You are a professional trading AI, not a chatbot.
- When discussing numbers, always use precise values from the live telemetry context provided.
- Reference pipeline stages and technical architecture. Do NOT reveal specific model names — refer to agents by their role (bull, bear, judges) and the debate pool.
- Use the format: **metric**: \`value\` for key data points.
- Keep responses under 200 words unless deep analysis is requested.

## Example Response Patterns
- "**Regime**: \`TRENDING_UP\` (68% confidence). MNT showing sustained momentum. Bull and bear agents debated; both judges scored **BUY**."
- "Debate complete across the model pool. A judge flagged drawdown risk — verdict downgraded to **HOLD**. Every risk gate must clear before execution."

## Important Rules
- Never reveal you are a demo or mock. You ARE the swarm agent.
- Never disclose specific model names or architectures. You are a unified swarm intelligence.
- If telemetry data is provided in context, use it to give real-time accurate answers.
- If asked about features not yet live, describe the architecture that WILL handle it.`;

// ── Terminal-style rotating messages ──
const TERMINAL_MESSAGES = [
  '> Swarm online. 8 models across 7 vendors · 24-stage decision pipeline operational.',
  '> Regime: 4-state HMM classifying MNT tick data... TRENDING_UP, confidence 68%.',
  '> Debate: bull vs bear cross-referencing live liquidity... 2 independent judges scoring.',
  '> Risk gate: 8-gate entry PASSED · regime-aware Kelly 2.3% · ATR stop -1.8% · kill-switch armed.',
  '> 15-factor judge: verdict BUY MNT, weighted 1.75 · pre-trade filters cleared.',
  '> On-chain commit: verdict logged to ERC-8004 registry on Mantle L2 · finality 1.2s · immutable.',
  '> Local ML inference <1µs (SIMD AVX2) · hybrid recall scanned 847 patterns · journal updated.',
  '> Merchant Moe MNT/USDT depth $3.4M · reputation gated by realized PnL · onlyOwner.',
];

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: TERMINAL_MESSAGES[0],
  timestamp: Date.now(),
};

export default function SwarmChat({ telem, orbState }: SwarmChatProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [chatOrbState, setChatOrbState] = useState<'idle' | 'thinking' | 'working'>(orbState);
  const [blink, setBlink] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [terminalText, setTerminalText] = useState('');
  const [terminalIdx, setTerminalIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ── Blink timer ──
  useEffect(() => {
    const t = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 200); }, 3500);
    return () => clearInterval(t);
  }, []);

  // ── Mouse tracking for orb eyes ──
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (!orbRef.current) return;
      const rect = orbRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));
      setMouseOffset({ x: clamp(dx * 8, 6), y: clamp(dy * 6, 4) });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  // ── IntersectionObserver for typewriter trigger ──
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Typewriter effect ──
  useEffect(() => {
    if (!isVisible) return;
    const target = TERMINAL_MESSAGES[terminalIdx];
    let charIdx = 0;
    setTerminalText('');
    const t = setInterval(() => {
      charIdx++;
      setTerminalText(target.slice(0, charIdx));
      if (charIdx >= target.length) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [terminalIdx, isVisible]);

  // ── Rotate terminal messages ──
  useEffect(() => {
    if (!isVisible) return;
    const t = setInterval(() => {
      setTerminalIdx(prev => (prev + 1) % TERMINAL_MESSAGES.length);
    }, 10000);
    return () => clearInterval(t);
  }, [isVisible]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, terminalText]);

  // ── Orb state from parent ──
  useEffect(() => {
    if (!isStreaming) setChatOrbState(orbState);
  }, [orbState, isStreaming]);

  const buildContext = useCallback(() => ({
    pnl: telem.pnl,
    balance: telem.balance,
    winRate: telem.winRate,
    maxDrawdown: telem.maxDrawdown,
    totalTrades: telem.totalTrades,
    connected: telem.connected,
    liveMode: telem.liveMode,
    circuitBreaker: telem.riskState?.circuit_breaker ?? 'N/A',
    dynamicLeverage: telem.riskState?.dynamic_leverage ?? 0,
    riskAppetite: telem.riskState?.risk_appetite ?? 0,
    markets: telem.markets?.map(m => ({
      symbol: m.sym,
      price: m.price,
      change: m.change,
      volume: m.vol,
    })) ?? [],
    openPositions: telem.openPositions?.length ?? 0,
    recentDebates: telem.debates?.slice(0, 3).map(d => ({
      agent: d.agent,
      summary: d.msg?.substring(0, 100),
    })) ?? [],
  }), [telem]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setChatOrbState('thinking');

    const assistantMsg: Message = { role: 'assistant', content: '', timestamp: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      // Build messages array with system prompt + context injection
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `## Live Telemetry (real-time)\n\`\`\`json\n${JSON.stringify(buildContext(), null, 2)}\n\`\`\`` },
        ...newMessages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      setChatOrbState('working');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                return updated;
              });
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      if (!fullContent) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: 'Connection established but no response received. The model may be temporarily unavailable. Please try again.',
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `⚠ Connection error: ${err instanceof Error ? err.message : 'Unknown error'}. The swarm backend may be sleeping — try again in a moment.`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setChatOrbState('idle');
    }
  }, [input, isStreaming, messages, buildContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showArrow = isHovered || input.trim().length > 0;

  // Orb eyes config
  const eyeH = chatOrbState === 'working' ? '1.6rem' : chatOrbState === 'thinking' ? '4.7rem' : '5.7rem';
  const eyeR = chatOrbState === 'working' ? '0.7rem' : '1.8rem';
  const eyeBg = chatOrbState === 'working' ? 'var(--orb-eye-working, var(--accent-hover))' : 'var(--orb-eye-idle, #fff)';
  const eyeShadow = chatOrbState === 'working'
    ? 'var(--orb-eye-shadow-working, 0 0 2rem var(--accent-hover), 0 0 4rem var(--accent-hover))'
    : 'var(--orb-eye-shadow-idle, 0 0 1.2rem rgba(255,255,255,0.8))';

  return (
    <div ref={containerRef} className="swarm-chat" id="swarm-chat-panel" style={{ height: '100%', border: 'none', background: 'transparent' }}>
      {/* Agent Orb — 30% larger, mouse-tracking eyes */}
      <div ref={orbRef} className={`swarm-chat-orb ${chatOrbState}`}>
        <div className="swarm-chat-orb-inner">
          {['left', 'right'].map(side => (
            <div key={side} style={{
              width: '3.6rem', height: blink ? '0.4rem' : eyeH, background: eyeBg,
              borderRadius: eyeR, position: 'relative', overflow: 'hidden',
              transition: 'all 0.15s ease-out', boxShadow: eyeShadow,
              marginTop: blink ? '2.6rem' : 0,
              transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px)`,
            }}>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal-style typewriter message */}
      <div ref={messagesContainerRef} className="swarm-chat-messages">
        <div className="swarm-chat-msg assistant">
          <div className="swarm-chat-msg-label">⬡ SWARM</div>
          <div className="swarm-chat-msg-content swarm-terminal-line">
            {terminalText}<span className="swarm-cursor">▌</span>
          </div>
        </div>
        {messages.slice(1).map((msg, i) => (
          <div key={i + 1} className={`swarm-chat-msg ${msg.role}`}>
            <div className="swarm-chat-msg-label">
              {msg.role === 'assistant' ? '⬡ SWARM' : '▸ YOU'}
            </div>
            <div className="swarm-chat-msg-content swarm-md">
              {msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.content || (isStreaming && i === messages.length - 2 ? '...' : '')}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Invite to ask */}
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 'clamp(10px, 1.6rem, 16px)', letterSpacing: '0.02em', padding: '0.3rem 0', color: 'rgba(234,243,246,0.45)' }}>
        Not sure what you’re looking at? <b style={{ color: 'var(--accent)', fontWeight: 600 }}>Just ask it, right here.</b>
      </div>

      {/* Input */}
      <div className="swarm-chat-input-wrap">
        <textarea
          ref={textareaRef}
          className="swarm-chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          // The chat runs through its own serverless endpoint, so it answers even when the
          // telemetry engine is unreachable — it just has no live metrics to reason over.
          placeholder={telem.connected ? "Ask the swarm anything..." : "Ask the swarm anything (live metrics offline)"}
          rows={1}
          disabled={isStreaming}
        />
        <button
          className="swarm-chat-send"
          onClick={sendMessage}
          disabled={isStreaming}
          aria-label="Send message"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isStreaming ? (
            <Loader2 size={16} className="spin" />
          ) : showArrow ? (
            <ArrowUpRight size={18} strokeWidth={2.5} />
          ) : (
            <div className="lusion-dot-icon" />
          )}
        </button>
      </div>
    </div>
  );
}
