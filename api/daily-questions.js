import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { logTokenUsage } from './_db.js';

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

function extractToolQuestions(response) {
  const block = response.content.find((b) => b.type === 'tool_use' && b.name === 'submit_questions');
  if (block && block.input && Array.isArray(block.input.questions)) {
    return block.input.questions;
  }
  // Fallback: legacy text/JSON if model ignored the tool.
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n');
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
- Call the submit_questions tool exactly once with exactly ${total} questions.
- Each question must be realistic SIE-style: scenario-based when possible, regulation/product suitability, calculations where relevant.
- One clearly best answer per question.
- Include a short explanation of why the correct answer is correct.
- Mix difficulties (easy/medium/hard) with emphasis on exam-like relevance.
- Use only the provided SIE blueprint and topic IDs.
- At least ${minMathQuestions} questions must be equation/calculation focused with realistic numbers.
- Never prepend answer letters to option text; options must be clean strings only.`;

    const tools = [
      {
        name: 'submit_questions',
        description: `Submit exactly ${total} SIE exam questions for today.`,
        input_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              minItems: total,
              maxItems: total,
              items: {
                type: 'object',
                required: ['prompt', 'options', 'answerIndex', 'explanation', 'topicId', 'topicTitle'],
                properties: {
                  prompt: { type: 'string', minLength: 10 },
                  options: {
                    type: 'array',
                    minItems: 4,
                    maxItems: 4,
                    items: { type: 'string', minLength: 1 },
                  },
                  answerIndex: { type: 'integer', minimum: 0, maximum: 3 },
                  explanation: { type: 'string', minLength: 5 },
                  topicId: { type: 'string', minLength: 1 },
                  topicTitle: { type: 'string', minLength: 1 },
                },
              },
            },
          },
          required: ['questions'],
        },
      },
    ];

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
          max_tokens: 4000,
          system: [
            { type: 'text', text: system, cache_control: { type: 'ephemeral' } },
          ],
          tools,
          tool_choice: { type: 'tool', name: 'submit_questions' },
          messages: [{ role: 'user', content: `${user}${correction}` }],
        });

        if (response?.usage) {
          void logTokenUsage({ profileId, endpoint: 'daily-questions', model: 'claude-sonnet-4-6', usage: response.usage });
        }

        const raw = extractToolQuestions(response);
        if (!raw) {
          lastIssue = 'Model did not return a valid questions tool call';
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
    const info = classifyAnthropicError(error);
    return send(res, info.status, { ok: false, kind: info.kind, error: info.message });
  }
}
