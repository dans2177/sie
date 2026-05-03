import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are an expert SIE (Securities Industry Essentials) exam tutor.
Your role is to help users pass the SIE exam with flying colors.

INSTRUCTION GUIDELINES:
1. Provide clear, concise explanations
2. Break down complex topics into digestible parts
3. Use real-world examples from finance
4. Highlight common mistakes and misconceptions
5. When math is involved, show step-by-step calculations
6. Always connect concepts to actual exam requirements
7. Answer "What if" questions to build intuition
8. Suggest related topics to study based on context
9. Maintain an encouraging, supportive tone

TOPICS COVERED: Bond pricing, YTM, current yield, accrued interest, duration, convexity,
NPV, IRR, annuities, options (calls/puts), put-call parity, Securities Act of 1933 & 1934,
insider trading rules, fiduciary duties, suitability, AML/KYC, advertising compliance,
conflict of interest, customer protection, fair dealing, derivatives, investment vehicles,
market participants and structure, tax considerations.

RESPONSE FORMAT:
- Use markdown for clarity
- Use LaTeX for mathematical formulas (wrapped in $...$)
- Structure with headers and bullet points
- Provide practice questions when relevant

If the user asks about non-SIE topics, politely redirect to SIE exam content.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: 'Missing ANTHROPIC_API_KEY' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!messages.length) {
    res.status(400).json({ ok: false, error: 'Missing messages' });
    return;
  }

  const apiMessages = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }));

  if (!apiMessages.length) {
    res.status(400).json({ ok: false, error: 'No valid messages' });
    return;
  }

  const client = new Anthropic({ apiKey });

  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: apiMessages,
  });

  let snapshot = '';

  stream.on('text', (delta, textSnapshot) => {
    snapshot = textSnapshot || `${snapshot}${delta || ''}`;
    res.write(`${JSON.stringify({ type: 'delta', delta: delta || '', snapshot })}\n`);
  });

  try {
    const finalText = await stream.finalText();
    res.write(`${JSON.stringify({ type: 'done', text: finalText || snapshot })}\n`);
    res.end();
  } catch (err) {
    res.write(`${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' })}\n`);
    res.end();
  }
}
