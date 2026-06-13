import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
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

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: 'Swarm Agent online. I monitor all 24 pipeline stages, the LLM consensus, and risk parameters in real-time. Ask me anything about the swarm\'s status, architecture, or market analysis.',
  timestamp: Date.now(),
};

export default function SwarmChat({ telem, orbState }: SwarmChatProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatOrbState, setChatOrbState] = useState<'idle' | 'thinking' | 'working'>(orbState);
  const [blink, setBlink] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Blink timer for the orb eyes
  useEffect(() => {
    const t = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 200); }, 3500);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update orb state from parent when not chatting
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

    // Prepare assistant placeholder
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

      // If no content came through streaming, set a fallback
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

  // Orb rendering (enlarged version)
  const eyeH = chatOrbState === 'working' ? 12 : chatOrbState === 'thinking' ? 36 : 44;
  const eyeR = chatOrbState === 'working' ? '5px' : '14px';
  const eyeBg = chatOrbState === 'working' ? 'var(--accent-hover)' : '#fff';
  const eyeShadow = chatOrbState === 'working'
    ? '0 0 20px var(--accent-hover), 0 0 40px var(--accent-hover)'
    : '0 0 12px rgba(255,255,255,0.8)';

  return (
    <div className="swarm-chat" id="swarm-chat-panel" style={{ height: '100%', border: 'none', background: 'transparent' }}>
      {/* Agent Orb — large, centered */}
      <div className={`swarm-chat-orb ${chatOrbState}`}>
        <div className="swarm-chat-orb-inner">
          {['left', 'right'].map(side => (
            <div key={side} style={{
              width: 28, height: blink ? 3 : eyeH, background: eyeBg,
              borderRadius: eyeR, position: 'relative', overflow: 'hidden',
              transition: 'all 0.15s ease-out', boxShadow: eyeShadow,
              marginTop: blink ? 20 : 0,
            }}>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="swarm-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`swarm-chat-msg ${msg.role}`}>
            <div className="swarm-chat-msg-label">
              {msg.role === 'assistant' ? '◈ AGENT' : '▸ YOU'}
            </div>
            <div className="swarm-chat-msg-content">
              {msg.content || (isStreaming && i === messages.length - 1 ? '...' : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="swarm-chat-input-wrap">
        <textarea
          ref={textareaRef}
          className="swarm-chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the swarm anything..."
          rows={1}
          disabled={isStreaming}
        />
        <button
          className="swarm-chat-send"
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
        >
          {isStreaming ? <Loader2 size={16} className="spin" /> : <div className="lusion-dot-icon" />}
        </button>
      </div>
    </div>
  );
}
