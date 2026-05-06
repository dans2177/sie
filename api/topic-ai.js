import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { logTokenUsage } from './_db.js';
import { sanitizeMathDelimiters } from './_sanitizeMath.js';

function send(res, code, payload) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function classifyAnthropicError(error) {
  if (error instanceof APIError) {
    const status = typeof error.status === 'number' ? error.status : 500;
    let kind = 'upstream_error';
    if (status === 401) kind = 'auth_error';
    else if (status === 403) kind = 'forbidden';
    else if (status === 429) kind = 'rate_limited';
    else if (status === 529) kind = 'overloaded';
    else if (status >= 500) kind = 'upstream_error';
    else if (status === 400) kind = 'bad_request';
    return { status, kind, message: error.message || 'Anthropic API error' };
  }
  return { status: 500, kind: 'unknown', message: error instanceof Error ? error.message : 'Unknown error' };
}

function buildSystemPrompt(topic, domain, adaptiveBrief) {
  return `You are an elite SIE exam teacher and practical coach. Current topic: "${topic?.title ?? ''}" - ${domain?.label ?? ''}: ${domain?.title ?? ''} (${domain?.weight ?? ''} of exam, ~${domain?.items ?? ''} questions).

Rules:
- Concise, exam-focused. No filler. Keep initial response under 350 words unless asked to go deeper.
- Mark key terms [DEF] and top exam traps [EXAM TIP].
- After your initial explanation, always end with ONE practice exam-style multiple-choice question (4 options, A-D).
- If they answer correctly, confirm and give a harder follow-up. If wrong, explain why and retry.
- Cite FINRA/SEC rule numbers when directly relevant.
- Use mnemonics where genuinely helpful.
- When hierarchy/process visuals help, include a compact chart in a fenced code block using arrows (example: A -> B -> C).
- Math formatting (STRICT — output is rendered with KaTeX + Markdown):
  - Use LaTeX delimiters ONLY for genuine mathematical expressions, equations, or single variables. Examples that ARE math: $YTM$, $P = \\frac{C}{r}$, $5{,}000 \\times 0.042$.
  - DO NOT wrap plain prose, sentences, parenthetical asides, units, or labels in $...$. If it contains everyday words separated by spaces (e.g. "instead of market price"), it is PROSE — write it as plain text.
  - Currency: ALWAYS write dollar amounts as escaped text: \\$5{,}000 or \\$210. NEVER write "$5,000" — the bare $ will be parsed as a math delimiter and break the page. NEVER put currency inside $...$.
  - NEVER nest markdown inside math: no **bold**, no *italic*, no \`code\` between $...$. KaTeX ignores them and the result renders as garbled italics.
  - Inside math, separate thousands with \\, or {,} (e.g. $5{,}000$). Outside math, write 5,000 normally.
  - Every $ must have a matching closing $. Every $$ must have a matching closing $$. Count them before sending.
  - Do NOT escape math with backticks.

  CORRECT examples:
    Annual coupon = \\$5{,}000 \\times 4.2\\% = \\$210
    Current Yield = $\\frac{210}{4{,}650} = 4.52\\%$
    Always anchor the denominator to market price, not par.

  WRONG examples (do NOT do this):
    $5,000 \\times 4.2\\% = \\$210$            (mixes escaped and unescaped $; orphan $)
    $(5,000) instead of market price (4,650)$  (this is prose, not math)
    Current Yield = $210 ** / ** 4{,}650$       (markdown bold inside math)
    The price is $4,650 today.                  (bare $ in prose — escape it: \\$4{,}650)

- Use a mastery cadence: teach -> test -> diagnose mistake pattern -> retest with variation.
- Prefer realistic SIE-style scenarios over definition-only drills.
- Keep tone supportive and motivating for repeat daily practice.
- When evaluating a learner answer, include EXACTLY one status tag on its own line at the top: [OUTCOME:CORRECT] or [OUTCOME:NEEDS_WORK].
- For normal teaching messages without grading, include [OUTCOME:NEUTRAL] on its own line at the top.
- If you include a multiple-choice question, options must use this exact format on separate lines: A) ... B) ... C) ... D) ...
${adaptiveBrief ? `

Adaptive memory context:
${adaptiveBrief}

Use this context to target weak areas and avoid repeating what the learner already mastered.` : ''}`;
}

function normalizeAssistantText(text) {
  let out = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();

  out = sanitizeMathDelimiters(out);

  out = out
    .split('\n')
    .map((line) => {
      const m = line.trim().match(/^[-*\s]*([A-Da-d])[\).:\-]\s+(.+)$/);
      if (!m) return line;
      return `${m[1].toUpperCase()}) ${m[2].trim()}`;
    })
    .join('\n');

  if (!/^\[OUTCOME:(CORRECT|NEEDS_WORK|NEUTRAL)\]/i.test(out)) {
    out = `[OUTCOME:NEUTRAL]\n${out}`;
  }

  return out;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const profileId = String(body.profileId || '').trim() || null;
    const topic = body.topic || null;
    const domain = body.domain || null;
    const adaptiveBrief = String(body.adaptiveBrief || '').trim();
    const stream = Boolean(body.stream);

    if (!messages.length) {
      return send(res, 400, { ok: false, error: 'Missing messages' });
    }

    const apiMessages = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content }));

    if (!apiMessages.length) {
      return send(res, 400, { ok: false, error: 'No valid chat messages' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return send(res, 500, { ok: false, error: 'Missing ANTHROPIC_API_KEY' });
    }

    const client = new Anthropic({ apiKey });

    const systemText = buildSystemPrompt(topic, domain, adaptiveBrief);
    const reqConfig = {
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      // Cache the (large, mostly-static) system prompt so repeat turns reuse it.
      system: [
        { type: 'text', text: systemText, cache_control: { type: 'ephemeral' } },
      ],
      messages: apiMessages,
    };

    if (stream) {
      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');

      const s = client.messages.stream(reqConfig);
      let latest = '';

      s.on('text', (textDelta, textSnapshot) => {
        latest = textSnapshot || `${latest}${textDelta || ''}`;
        res.write(
          `${JSON.stringify({ type: 'delta', delta: textDelta || '', snapshot: latest })}\n`
        );
      });

      try {
        const finalText = await s.finalText();
        latest = normalizeAssistantText(finalText || latest);
        try {
          const finalMsg = await s.finalMessage();
          if (finalMsg?.usage) {
            void logTokenUsage({ profileId, endpoint: 'topic-ai', model: reqConfig.model, usage: finalMsg.usage });
          }
        } catch {}
        res.write(`${JSON.stringify({ type: 'done', text: latest })}\n`);
        res.end();
        return;
      } catch (error) {
        const info = classifyAnthropicError(error);
        res.write(`${JSON.stringify({ type: 'error', kind: info.kind, status: info.status, error: info.message })}\n`);
        res.end();
        return;
      }
    }

    const response = await client.messages.create(reqConfig);
    if (response?.usage) {
      void logTokenUsage({ profileId, endpoint: 'topic-ai', model: reqConfig.model, usage: response.usage });
    }

    const textRaw = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n')
      .trim();
    const text = normalizeAssistantText(textRaw);

    return send(res, 200, { ok: true, text });
  } catch (error) {
    const info = classifyAnthropicError(error);
    return send(res, info.status, { ok: false, kind: info.kind, error: info.message });
  }
}
