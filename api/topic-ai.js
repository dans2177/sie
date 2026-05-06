import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { logTokenUsage } from './_db.js';
import { sanitizeMathDelimiters } from './_sanitizeMath.js';
import { SUBMIT_REPLY_TOOL, renderStructuredReply } from './_renderReply.js';

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

YOU MUST respond by calling the submit_reply tool. Never write free-form prose outside the tool call.

Content rules:
- Concise, exam-focused. Total reply under 350 words unless the learner asks to go deeper.
- Mark key terms inline as "[DEF] term" and top exam traps as "[EXAM TIP] note".
- After your initial explanation, ALWAYS include an mcq with 4 options A-D.
- If the learner answered, set outcome=CORRECT or NEEDS_WORK accordingly. Otherwise NEUTRAL.
- Cite FINRA/SEC rule numbers when directly relevant. Use mnemonics where genuinely helpful.

Formatting rules (CRITICAL — output is rendered by the host, not by you):
- DO NOT write LaTeX delimiters ($..$, $$..$$, \\(..\\), \\[..\\]) anywhere in any string.
- DO NOT write markdown bold (**text**) or italic (*text*). Headings come from section.heading.
- Prose fields (intro, body, bullets[], mcq.stem, mcq.options[].text) are ARRAYS of {type, value} parts:
  * {"type":"text","value":"..."}  for words, punctuation, currency like "$1,000".
  * {"type":"math","value":"\\\\frac{C}{P}"}  for ANY LaTeX — never put LaTeX in a text part.
  Example intro:
    [{"type":"text","value":"Current yield is "},{"type":"math","value":"\\\\frac{C}{P}"},{"type":"text","value":", so a $50 coupon on a $1,100 bond gives "},{"type":"math","value":"4.55\\\\%"},{"type":"text","value":"."}]
- For DISPLAYED equations, put raw LaTeX (no $$ wrapper) in section.math (a plain string).
- MCQ options go in mcq.options as { label, text } with labels A-D in order; text is also a parts array.
${adaptiveBrief ? `

Adaptive memory context:
${adaptiveBrief}

Use this context to target weak areas and avoid repeating what the learner already mastered.` : ''}`;
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
      max_tokens: 1400,
      system: [
        { type: 'text', text: systemText, cache_control: { type: 'ephemeral' } },
      ],
      tools: [SUBMIT_REPLY_TOOL],
      tool_choice: { type: 'tool', name: 'submit_reply' },
      messages: apiMessages,
    };

    if (stream) {
      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        try { res.flushHeaders(); } catch {}
      }

      // Heartbeat keeps the connection warm while we wait for the tool result.
      // The structured tool input cannot be streamed as readable markdown, so we
      // wait for the full response, render to clean markdown, then emit one delta.
      res.write(`${JSON.stringify({ type: 'delta', delta: '', snapshot: '' })}\n`);
      const heartbeat = setInterval(() => {
        try { res.write(`${JSON.stringify({ type: 'heartbeat' })}\n`); } catch {}
      }, 2000);

      try {
        const response = await client.messages.create(reqConfig);
        clearInterval(heartbeat);
        if (response?.usage) {
          void logTokenUsage({ profileId, endpoint: 'topic-ai', model: reqConfig.model, usage: response.usage });
        }
        const toolUse = response.content.find((b) => b.type === 'tool_use' && b.name === 'submit_reply');
        const struct = toolUse?.input || {};
        let rendered = renderStructuredReply(struct);
        rendered = sanitizeMathDelimiters(rendered);
        res.write(`${JSON.stringify({ type: 'delta', delta: rendered, snapshot: rendered })}\n`);
        res.write(`${JSON.stringify({ type: 'done', text: rendered })}\n`);
        res.end();
        return;
      } catch (error) {
        clearInterval(heartbeat);
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

    const toolUse = response.content.find((b) => b.type === 'tool_use' && b.name === 'submit_reply');
    const struct = toolUse?.input || {};
    let text = renderStructuredReply(struct);
    text = sanitizeMathDelimiters(text);

    return send(res, 200, { ok: true, text });
  } catch (error) {
    const info = classifyAnthropicError(error);
    return send(res, info.status, { ok: false, kind: info.kind, error: info.message });
  }
}
