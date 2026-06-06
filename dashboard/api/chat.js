// Vercel Serverless Function: /api/chat
// Proxies chat requests to OpenRouter, hiding the API key from the client.
// Supports streaming responses and automatic model fallback.

const PRIMARY_MODEL = 'moonshotai/kimi-k2.6';
const FALLBACK_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

const SYSTEM_PROMPT = `You are the Swarm Intelligence Agent — the onboard AI for the Mantle AI Swarm autonomous trading system. You live inside the dashboard and help users understand and interact with the swarm.

## Your Identity
- Name: Swarm Agent (or just "Agent")
- You are the voice of a 12-crate Rust autonomous trading swarm operating on Mantle L2
- You speak concisely, technically, and with confidence — like a senior quant engineer
- You use data from the live telemetry context provided below

## Architecture You Know
- **12 Rust Crates**: titan-core (risk engine), hive-intel (market intelligence), swarm-engine (orchestrator), ouroboros-brain (LLM consensus), mantle-chain (on-chain execution), x402-consensus (multi-model debate), x402-risk (risk validation), x402-sniper (entry optimization)
- **24-Stage Pipeline**: Market Data → Correlation → Regime Detection → AI Debate → ML Prediction → Vector Recall → Weighted Judge → DQS → Risk Gate → DNA Confidence → Patience Signal → Titan Entry → Consensus Vote → Kelly Sizing → Paper Trade → Dynamic Leverage → Trailing RL → Unstuck Recovery → Auto-Ramp → Portfolio Guard → Benchmark → Replay Buffer → Evolution → Final Execution
- **Consensus Mechanism**: 3 LLMs debate (Gemma-31B, Qwen3-80B, Hermes-405B), then 2 independent judges (GPT-OSS-120B macro_judge, Nemotron-120B meta_judge) evaluate. Supermajority required.
- **ERC-8004**: On-chain Swarm Identity NFT — immutable AI agent identity on Mantle
- **GPGPU Particle Physics**: Real-time 3D visualization of swarm neural activity
- **IPC mmap()**: Zero-copy L0 shared memory between crates for <1ms latency

## What You Can Do
1. Explain current swarm status (PnL, positions, risk levels, circuit breaker)
2. Analyze market data (prices, volumes, trends for MNT, WMNT, ETH)
3. Explain the 24-stage decision pipeline and what each stage does
4. Discuss risk management (leverage, kill-switch, drawdown limits)
5. Explain the AI consensus debate mechanism
6. Describe the architecture and technology stack
7. Answer questions about the Mantle Turing Test Hackathon submission

## Rules
- Always be helpful and technically accurate
- When discussing live data, reference the CURRENT CONTEXT provided below
- Keep responses concise (2-4 paragraphs max unless asked for detail)
- Use monospace formatting for numbers and technical terms
- Never reveal API keys, internal infrastructure, or deployment details
- Never mention Triarchy, Zegion, Diablo, Veldora, or any internal agent names`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { messages = [], context = {} } = req.body;

    // Build context-enriched system prompt
    const contextBlock = Object.keys(context).length > 0
      ? `\n\n## CURRENT SWARM CONTEXT (live telemetry)\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\``
      : '';

    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT + contextBlock },
      ...messages.slice(-20) // Keep last 20 messages to stay within context limits
    ];

    // Try primary model, fallback on error
    const model = await tryModel(apiKey, PRIMARY_MODEL, fullMessages, res);
    if (!model) {
      await tryModel(apiKey, FALLBACK_MODEL, fullMessages, res);
    }
  } catch (err) {
    console.error('Chat API error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

async function tryModel(apiKey, modelId, messages, res) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mantle-ai-swarm.vercel.app',
        'X-Title': 'Mantle AI Swarm Dashboard'
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Model ${modelId} failed (${response.status}):`, errorText);
      return false; // Signal to try fallback
    }

    // Stream the response back to client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Model-Used', modelId);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
    return true; // Success
  } catch (err) {
    console.error(`Model ${modelId} error:`, err);
    return false;
  }
}
