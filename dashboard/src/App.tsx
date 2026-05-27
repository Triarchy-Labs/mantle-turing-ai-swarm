import { useState } from 'react'
import { Activity, Shield, Zap, Globe, Terminal, Network } from 'lucide-react'
import './index.css'

type ViewMode = 'IPC' | 'ERC8004'

const onChainEvents = [
  { id: '1', agentId: 'ERC8004:#1', target: '0x3a9f…8b21', sentiment: 105, success: true, time: '2m ago' },
  { id: '2', agentId: 'ERC8004:#1', target: '0x71bc…11a0', sentiment: 112, success: true, time: '15m ago' },
  { id: '3', agentId: 'ERC8004:#2', target: '0x99aa…ff10', sentiment: 95, success: true, time: '1h ago' },
  { id: '4', agentId: 'ERC8004:#1', target: '0xdead…beef', sentiment: 87, success: false, time: '3h ago' },
]

const ipcEvents = [
  { id: '1', agentId: 'liquidator', target: 'mmap://x402_state', sentiment: 0, success: true, time: '200μs' },
  { id: '2', agentId: 'sniper', target: 'mmap://x402_state', sentiment: 0, success: true, time: '150μs' },
  { id: '3', agentId: 'polymarket', target: 'ws://oracle', sentiment: 0, success: true, time: '1.2ms' },
]

function App() {
  const [view, setView] = useState<ViewMode>('ERC8004')
  const events = view === 'ERC8004' ? onChainEvents : ipcEvents

  return (
    <>
      <header className="header">
        <div>
          <h1>X402 Swarm Intelligence</h1>
          <p><span className="status-dot live"></span>Mantle Network — AI Agent Execution Layer</p>
        </div>
        <div className="toggle-group">
          <button className={`toggle-btn ${view === 'IPC' ? 'active' : ''}`} onClick={() => setView('IPC')}>
            <Terminal size={14} /> L0 IPC
          </button>
          <button className={`toggle-btn ${view === 'ERC8004' ? 'active' : ''}`} onClick={() => setView('ERC8004')}>
            <Shield size={14} /> ERC-8004
          </button>
        </div>
      </header>

      <div className="metrics">
        <div className="glass metric">
          <h3><Activity size={13} /> Total Liquidations</h3>
          <div className="val">1,402</div>
        </div>
        <div className="glass metric">
          <h3><Zap size={13} /> Swarm Reputation</h3>
          <div className="val">8,950</div>
        </div>
        <div className="glass metric">
          <h3><Globe size={13} /> Network</h3>
          <div className="val cyan">Connected</div>
        </div>
        <div className="glass metric">
          <h3><Network size={13} /> Active Agents</h3>
          <div className="val">2</div>
        </div>
      </div>

      <div className="glass events-section">
        <h2>{view === 'ERC8004' ? 'On-Chain AI Inferences' : 'L0 IPC Memory-Mapped Logs'}</h2>
        <div className="events">
          {events.map(ev => (
            <div className="event-row" key={ev.id}>
              <div><span className="event-label">Agent</span><div className="event-val cyan">{ev.agentId}</div></div>
              <div><span className="event-label">Target</span><div className="event-val">{ev.target}</div></div>
              <div><span className="event-label">{view === 'ERC8004' ? 'Sentiment' : 'Latency'}</span>
                <div className="event-val">{view === 'ERC8004' ? `${ev.sentiment / 100}x` : ev.time}</div>
              </div>
              <div><span className="event-label">Status</span>
                <span className={`badge ${ev.success ? 'ok' : 'fail'}`}>{ev.success ? 'OK' : 'FAIL'}</span>
              </div>
              <div><span className="event-label">Time</span><div className="event-val" style={{color:'var(--text-secondary)'}}>{ev.time}</div></div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default App
