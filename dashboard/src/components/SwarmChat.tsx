import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ArrowUpRight } from 'lucide-react';
import type { TelemetryData } from '../hooks/useTelemetry';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface SwarmChatProps {
  telem: TelemetryData;
  orbState: 'idle' | 'thinking' | 'working';
}

// ── Terminal-style rotating messages ──
const TERMINAL_MESSAGES = [
  '> Swarm Agent online. Monitoring 24 pipeline stages, LLM consensus, and risk parameters in real-time.',
  '> Regime detection: Hidden Markov Model analyzing MNT price structure... 4-state classifier active.',
  '> Debate round complete. Gemma-4-31B, Qwen3-80B, Hermes-405B reached consensus: HOLD with 71.2% confidence.',
  '> Risk engine: Circuit breaker ACTIVE. Dynamic leverage at 2.4x. Macro penalty: 0.00.',
  '> Paper trading session #847. Win rate: 75.7%. PnL: +$1,444.91. Max drawdown: -2.8%.',
  '> On-chain logger: Last tx committed to Mantle L2. Block confirmed in 1.2s.',
  '> Auto-ramp: Phase GROWTH. Win streak: 12. Capital utilization scaling to 65%.',
  '> Scanning DexScreener for MNT/USDe/ETH/USDT liquidity depth on Agni + Merchant Moe...',
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: buildContext(),
        }),
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
  const eyeH = chatOrbState === 'working' ? 12 : chatOrbState === 'thinking' ? 36 : 44;
  const eyeR = chatOrbState === 'working' ? '5px' : '14px';
  const eyeBg = chatOrbState === 'working' ? 'var(--accent-hover)' : '#fff';
  const eyeShadow = chatOrbState === 'working'
    ? '0 0 20px var(--accent-hover), 0 0 40px var(--accent-hover)'
    : '0 0 12px rgba(255,255,255,0.8)';

  return (
    <div ref={containerRef} className="swarm-chat" id="swarm-chat-panel" style={{ height: '100%', border: 'none', background: 'transparent' }}>
      {/* Agent Orb — 30% larger, mouse-tracking eyes */}
      <div ref={orbRef} className={`swarm-chat-orb ${chatOrbState}`}>
        <div className="swarm-chat-orb-inner" style={{ width: '12.5rem', height: '12.5rem' }}>
          {['left', 'right'].map(side => (
            <div key={side} style={{
              width: 28, height: blink ? 3 : eyeH, background: eyeBg,
              borderRadius: eyeR, position: 'relative', overflow: 'hidden',
              transition: 'all 0.15s ease-out', boxShadow: eyeShadow,
              marginTop: blink ? 20 : 0,
              transform: `translate(${mouseOffset.x}px, ${mouseOffset.y}px)`,
            }}>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal-style typewriter message */}
      <div className="swarm-chat-messages">
        <div className="swarm-chat-msg assistant">
          <div className="swarm-chat-msg-label">◈ AGENT</div>
          <div className="swarm-chat-msg-content" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', opacity: 0.8, fontSize: '1.4rem' }}>
            {terminalText}<span style={{ opacity: 0.6, animation: 'blink 1s steps(1) infinite' }}>▌</span>
          </div>
        </div>
        {messages.slice(1).map((msg, i) => (
          <div key={i + 1} className={`swarm-chat-msg ${msg.role}`}>
            <div className="swarm-chat-msg-label">
              {msg.role === 'assistant' ? '◈ AGENT' : '▸ YOU'}
            </div>
            <div className="swarm-chat-msg-content">
              {msg.content || (isStreaming && i === messages.length - 2 ? '...' : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Model names */}
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', opacity: 0.3, letterSpacing: '0.06em', padding: '0.3rem 0' }}>
        Gemma-4-31B · Qwen3-80B · Hermes-405B
      </div>

      {/* Input */}
      <div className="swarm-chat-input-wrap">
        <textarea
          ref={textareaRef}
          className="swarm-chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={telem.connected ? "Ask the swarm anything..." : "AI Chat available when engine is live"}
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
