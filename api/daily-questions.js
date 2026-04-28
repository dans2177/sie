import Anthropic from '@anthropic-ai/sdk';

function send(res, code, payload) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function extractJsonArray(text) {
  const fenced = (text.match(/```json\s*([\s\S]*?)```/i) || [])[1] || text;
  const trimmed = String(fenced || '').trim();
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

function normalizeQuestions(raw, { date, total, topicMap, fallbackTopicIds }) {
  const seenPrompts = new Set();
  const out = [];

  for (let i = 0; i < raw.length && out.length < total; i += 1) {
    const item = raw[i] || {};
    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
    const options = Array.isArray(item.options)
      ? item.options
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .map((x) => x.replace(/^\(?[A-Da-d]\)?[\).:\-]\s*/, '').trim())
          .filter(Boolean)
      : [];
    const uniqueOptions = [...new Set(options)].slice(0, 4);
    const answerIndex = typeof item.answerIndex === 'number' ? item.answerIndex : -1;
    const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';

    if (!prompt || uniqueOptions.length !== 4 || answerIndex < 0 || answerIndex > 3 || !explanation) {
      continue;
    }

    const key = prompt.toLowerCase();
    if (seenPrompts.has(key)) continue;
    seenPrompts.add(key);

    const rawTopicId = typeof item.topicId === 'string' ? item.topicId.trim() : '';
    const topicId = topicMap.has(rawTopicId)
      ? rawTopicId
      : (fallbackTopicIds[out.length % Math.max(fallbackTopicIds.length, 1)] || 'general');

    const inferredTopicTitle = (topicMap.get(topicId) || {}).title || 'SIE Mixed';
    const topicTitle = typeof item.topicTitle === 'string' && item.topicTitle.trim()
      ? item.topicTitle.trim()
      : inferredTopicTitle;

    out.push({
      id: `${date}-ai-${out.length + 1}`,
      topicId,
      topicTitle,
      prompt,
      options: uniqueOptions,
      answerIndex,
      explanation,
    });
  }

  return out;
}

function isMathQuestion(q) {
  const text = `${q.prompt || ''} ${q.explanation || ''}`.toLowerCase();
  const hasNumbers = /\d/.test(text);
  const hasMathToken = /(yield|ytm|nav|breakeven|margin|equation|formula|coupon|par|premium|discount|ratio|percent|%|\$|\bdivided\b|\bcalculate\b|\bcompute\b|\breg\s*t\b)/i.test(text);
  return hasNumbers || hasMathToken;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const date = String(body.date || '').trim();
    const profileId = String(body.profileId || '').trim();
    const total = Math.max(1, Math.min(40, Number(body.total || 20)));
    const weakTopicIds = Array.isArray(body.weakTopicIds) ? body.weakTopicIds.map((x) => String(x || '').trim()).filter(Boolean) : [];
    const adaptiveBrief = String(body.adaptiveBrief || '').trim();
    const blueprint = String(body.blueprint || '').trim();
    const mathBlueprint = String(body.mathBlueprint || '').trim();
    const validTopics = Array.isArray(body.validTopics) ? body.validTopics : [];
    const minMathQuestions = Math.max(3, Math.min(10, Number(body.minMathQuestions || Math.round(total * 0.3))));

    if (!date || !profileId || !blueprint || !validTopics.length) {
      return send(res, 400, { ok: false, error: 'Missing required fields' });
    }

    const topicMap = new Map(
      validTopics
        .map((t) => ({ id: String(t?.id || '').trim(), title: String(t?.title || '').trim() }))
        .filter((t) => t.id)
        .map((t) => [t.id, t])
    );

    if (!topicMap.size) {
      return send(res, 400, { ok: false, error: 'No valid topics provided' });
    }

    const preferredTopicIds = weakTopicIds.filter((id) => topicMap.has(id));
    const fallbackTopicIds = preferredTopicIds.length ? preferredTopicIds : [...topicMap.keys()];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return send(res, 500, { ok: false, error: 'Missing ANTHROPIC_API_KEY' });
    }

    const client = new Anthropic({ apiKey });

    const system = `You write high-quality SIE exam questions.

Rules:
- Return ONLY a JSON array with exactly ${total} objects.
- No markdown, no prose, no code fences.
- Each object schema:
  {
    "prompt": string,
    "options": [string, string, string, string],
    "answerIndex": number,
    "explanation": string,
    "topicId": string,
    "topicTitle": string
  }
- Questions must be realistic SIE style: scenario-based when possible, regulation/product suitability, calculations where relevant.
- One clearly best answer only.
- Include a short explanation of why the correct answer is correct.
- Keep difficulty mixed (easy/medium/hard) with emphasis on exam-like relevance.
- Use only the provided SIE blueprint and topic IDs.
- At least ${minMathQuestions} questions must be equation/calculation focused.
- For equation/calculation items, include realistic numbers and a calculation-oriented explanation.
- Never prepend answer letters to option text; options must be clean strings only.`;

  const user = `Date: ${date}\nProfile: ${profileId}\nWeak topics (prioritize): ${preferredTopicIds.join(', ') || 'none'}\n\nAdaptive context:\n${adaptiveBrief || 'none'}\n\nAllowed topic IDs:\n${[...topicMap.keys()].join(', ')}\n\nSIE Blueprint:\n${blueprint}\n\nMath Blueprint (must be used for quantitative items):\n${mathBlueprint || 'none provided'}`;

      let attempts = 0;
      let bestQuestions = [];
      let lastIssue = 'Unknown generation issue';

      while (attempts < 3) {
        attempts += 1;
        const correction = attempts > 1
          ? `\n\nPrevious attempt failed validation: ${lastIssue}. Regenerate and strictly fix this.`
          : '';

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2600,
          system,
          messages: [{ role: 'user', content: `${user}${correction}` }],
        });

        const text = response.content
          .filter((b) => b.type === 'text')
          .map((b) => (b.type === 'text' ? b.text : ''))
          .join('\n');

        const raw = extractJsonArray(text);
        if (!raw) {
          lastIssue = 'Model did not return a valid JSON array';
          continue;
        }

        const questions = normalizeQuestions(raw, {
          date,
          total,
          topicMap,
          fallbackTopicIds,
        });
        bestQuestions = questions;

        if (questions.length < Math.min(10, total)) {
          lastIssue = `Only ${questions.length} valid questions were returned`;
          continue;
        }

        const mathCount = questions.filter(isMathQuestion).length;
        if (mathCount < minMathQuestions) {
          lastIssue = `Only ${mathCount} math/equation questions found, required ${minMathQuestions}`;
          continue;
        }

        return send(res, 200, { ok: true, questions, attempts });
      }

      if (bestQuestions.length >= Math.min(10, total)) {
        return send(res, 200, { ok: true, questions: bestQuestions.slice(0, total), degraded: true, issue: lastIssue, attempts });
      }

      return send(res, 422, { ok: false, error: `Question generation failed validation after ${attempts} attempts: ${lastIssue}` });
  } catch (error) {
    return send(res, 500, { ok: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
