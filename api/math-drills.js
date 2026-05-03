import Anthropic, { APIError } from '@anthropic-ai/sdk';

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

function extractJsonArray(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Math drill generation did not return a JSON array');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function buildPrompt({ formulas, focusFormulaIds, weakFormulaIds, existingQuestionIds, batchSize, requireCoverage, recentPrompts, randomSeed }) {
  const focusText = focusFormulaIds.length
    ? `STRICT: Every question MUST use formulaId = "${focusFormulaIds[0]}". Do not use any other formula.`
    : 'Distribute questions across the formulas provided.';
  const weakText = weakFormulaIds.length
    ? `Spend extra weight on weak formulas: ${weakFormulaIds.join(', ')}.`
    : 'No weakness override provided.';
  const coverageText = requireCoverage
    ? 'Coverage requirement: produce AT LEAST ONE question for every formula listed below. Do not skip any formulaId.'
    : 'Coverage: balanced across listed formulas.';
  const recentText = Array.isArray(recentPrompts) && recentPrompts.length
    ? `RECENT PROMPTS YOU JUST WROTE (DO NOT REPEAT THESE NUMBERS OR SCENARIOS — pick fresh figures, different magnitudes, different industries/issuers):\n${recentPrompts.slice(-8).map((p, i) => `  ${i + 1}. ${String(p).slice(0, 220)}`).join('\n')}`
    : 'No prior prompts to avoid.';

  return `You create SIE exam math drills for fill-in-the-blank repetition.

Randomization seed: ${randomSeed} — use this to pick fresh, varied numbers (different orders of magnitude, different round vs non-round figures). Never default to textbook examples.

OUTPUT: ONLY a JSON array of ${batchSize} object(s). No prose, no markdown.

Use a worked-equation TEMPLATE with ___ blanks. Example:
{"id":"cy-101","formulaId":"m1","formulaTitle":"Current Yield","difficulty":"easy","prompt":"A bond pays a $50 annual coupon and trades at $1,000.","template":"Current Yield = ___ / ___ = ___%","blanks":[{"label":"Annual coupon","numericAnswer":50,"tolerance":0.01,"acceptableAnswers":["50","$50"]},{"label":"Price","numericAnswer":1000,"tolerance":0.01,"acceptableAnswers":["1000","$1000","1,000"]},{"label":"Yield","numericAnswer":5,"tolerance":0.01,"acceptableAnswers":["5","5%"]}],"hint":"Coupon ÷ price.","answerFormat":"percent","canonicalAnswer":"5%","acceptableAnswers":["5","5%"],"numericAnswer":5,"tolerance":0.01,"unit":"percent","explanation":"Current yield is annual coupon divided by current price.","steps":["50/1000 = 0.05","Convert to percent: 5%"]}

Rules:
- 1-4 blanks per question. Each blank: numericAnswer + tolerance + acceptableAnswers.
- Question-level canonicalAnswer/numericAnswer = FINAL value (last blank).
- unit ∈ plain|percent|dollars|ratio. difficulty ∈ easy|medium|hard.
- formulaId must match a provided formula.
- id must NOT reuse any of: ${existingQuestionIds.slice(-30).join(', ') || 'none'}.
- Numbers MUST be different from any recent prompt below — vary the magnitude AND the scenario (different company size, fund type, bond coupon, strike, etc.).
- Keep explanation/steps SHORT (1 sentence + 2 steps).

${focusText}
${weakText}
${coverageText}

${recentText}

Formulas:
${JSON.stringify(formulas.map((f) => ({ id: f.id, title: f.title, formula: f.formula })))}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const formulas = Array.isArray(body.formulas) ? body.formulas : [];
    const focusFormulaIds = Array.isArray(body.focusFormulaIds) ? body.focusFormulaIds : [];
    const weakFormulaIds = Array.isArray(body.weakFormulaIds) ? body.weakFormulaIds : [];
    const existingQuestionIds = Array.isArray(body.existingQuestionIds) ? body.existingQuestionIds : [];
    const requireCoverage = Boolean(body.requireCoverage);
    const recentPrompts = Array.isArray(body.recentPrompts) ? body.recentPrompts.map(String) : [];
    const batchSize = Math.min(Math.max(Number(body.batchSize) || 6, 1), 14);

    if (!formulas.length) {
      return send(res, 400, { ok: false, error: 'Missing formulas' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return send(res, 500, { ok: false, error: 'Missing ANTHROPIC_API_KEY' });
    }

    const client = new Anthropic({ apiKey });
    const randomSeed = `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    const reqConfig = {
      model: 'claude-sonnet-4-6',
      max_tokens: 1400,
      temperature: 1.0,
      system: [
        {
          type: 'text',
          text: 'You produce strict JSON for educational math practice content.',
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: buildPrompt({ formulas, focusFormulaIds, weakFormulaIds, existingQuestionIds, batchSize, requireCoverage }),
        },
      ],
    };

    const stream = Boolean(body.stream);
    if (stream) {
      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        try { res.flushHeaders(); } catch {}
      }
      // Defeat client/proxy initial buffering with a padded comment-style line.
      res.write(`${JSON.stringify({ type: 'start', total: batchSize, padding: ' '.repeat(2048) })}\n`);

      const s = client.messages.stream(reqConfig);
      let latest = '';
      let lastEmittedCount = 0;
      const heartbeat = setInterval(() => {
        try { res.write(`${JSON.stringify({ type: 'heartbeat', count: lastEmittedCount, total: batchSize })}\n`); } catch {}
      }, 2000);

      // Try to extract the next complete top-level object from `latest` after offset.
      const tryExtractNext = (offset) => {
        const text = latest;
        const start = text.indexOf('{', offset);
        if (start === -1) return null;
        let depth = 0;
        let inStr = false;
        let escape = false;
        for (let i = start; i < text.length; i += 1) {
          const ch = text[i];
          if (escape) { escape = false; continue; }
          if (ch === '\\') { escape = true; continue; }
          if (ch === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (ch === '{') depth += 1;
          else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
              const slice = text.slice(start, i + 1);
              try {
                const parsed = JSON.parse(slice);
                return { question: parsed, end: i + 1 };
              } catch {
                return null;
              }
            }
          }
        }
        return null;
      };

      let cursor = 0;
      s.on('text', (textDelta, textSnapshot) => {
        latest = textSnapshot || `${latest}${textDelta || ''}`;
        // Live raw text so client can show streaming progress like chat.
        if (textDelta) {
          res.write(`${JSON.stringify({ type: 'delta', delta: textDelta, snapshot: latest })}\n`);
        }
        // Emit newly completed objects.
        while (true) {
          const next = tryExtractNext(cursor);
          if (!next) break;
          cursor = next.end;
          lastEmittedCount += 1;
          res.write(`${JSON.stringify({ type: 'question', question: next.question, count: lastEmittedCount, total: batchSize })}\n`);
        }
        res.write(`${JSON.stringify({ type: 'progress', count: lastEmittedCount, total: batchSize })}\n`);
      });

      try {
        await s.finalText();
        // Final pass to flush anything remaining (e.g. last object before closing bracket).
        while (true) {
          const next = tryExtractNext(cursor);
          if (!next) break;
          cursor = next.end;
          lastEmittedCount += 1;
          res.write(`${JSON.stringify({ type: 'question', question: next.question, count: lastEmittedCount, total: batchSize })}\n`);
        }
        clearInterval(heartbeat);
        res.write(`${JSON.stringify({ type: 'done', count: lastEmittedCount, total: batchSize })}\n`);
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

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    const questions = extractJsonArray(text);
    return send(res, 200, { ok: true, questions });
  } catch (error) {
    const info = classifyAnthropicError(error);
    return send(res, info.status, { ok: false, kind: info.kind, error: info.message });
  }
}