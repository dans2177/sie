import type { ChatMessage, Domain, MathDrillQuestion, Topic } from '../types/index';

const CHAT_TIMEOUT_MS = 60000;

async function callClaudeServerStream(
  messages: ChatMessage[],
  topic: Topic | null,
  domain: Domain | null,
  adaptiveBrief: string | undefined,
  onDelta: (snapshot: string, delta: string) => void,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch('/api/topic-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, topic, domain, adaptiveBrief, stream: true }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      throw new Error(errorBody || `Server request failed (${res.status})`);
    }

    if (!res.body) {
      throw new Error('Streaming response body is missing');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let latest = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const evt = JSON.parse(trimmed) as { type?: string; delta?: string; snapshot?: string; text?: string; error?: string };
        if (evt.type === 'delta') {
          const delta = evt.delta || '';
          latest = evt.snapshot || `${latest}${delta}`;
          onDelta(latest, delta);
        } else if (evt.type === 'done') {
          latest = evt.text || latest;
        } else if (evt.type === 'error') {
          throw new Error(evt.error || 'Stream failed');
        }
      }
    }

    return latest;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callClaude(
  messages: ChatMessage[],
  topic: Topic | null,
  domain: Domain | null,
  adaptiveBrief?: string,
  onDelta?: (snapshot: string, delta: string) => void,
): Promise<string> {
  let text = '';
  try {
    if (onDelta) {
      text = await callClaudeServerStream(messages, topic, domain, adaptiveBrief, onDelta);
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
      try {
        const res = await fetch('/api/topic-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, topic, domain, adaptiveBrief }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorBody = await res.text().catch(() => '');
          throw new Error(errorBody || `Server request failed (${res.status})`);
        }

        const data = (await res.json()) as { ok?: boolean; text?: string; error?: string };
        if (!data?.ok) {
          throw new Error(data?.error || 'Topic chat generation failed');
        }
        text = data.text || '';
      } finally {
        clearTimeout(timeout);
      }
    }
  } catch (error) {
    if (error instanceof Error && /404|Failed to fetch|NetworkError|aborted|AbortError|timeout/i.test(error.message)) {
      text = 'AI server endpoint is unavailable. Server-only mode is enabled. Start the API server and try again.';
    } else {
      throw error;
    }
  }

  if (onDelta) onDelta(text, '');
  return text;
}

export async function generateMathDrills({
  formulas,
  focusFormulaIds,
  weakFormulaIds,
  existingQuestionIds,
  recentPrompts,
  batchSize,
  requireCoverage,
  onQuestion,
  onProgress,
  onDelta,
}: {
  formulas: Array<{ id: string; title: string; formula: string; rule: string; example: string }>;
  focusFormulaIds: string[];
  weakFormulaIds: string[];
  existingQuestionIds: string[];
  recentPrompts?: string[];
  batchSize: number;
  requireCoverage?: boolean;
  onQuestion?: (question: MathDrillQuestion, count: number, total: number) => void;
  onProgress?: (count: number, total: number) => void;
  onDelta?: (snapshot: string) => void;
}): Promise<MathDrillQuestion[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  try {
    const res = await fetch('/api/math-drills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formulas, focusFormulaIds, weakFormulaIds, existingQuestionIds, recentPrompts: recentPrompts || [], batchSize, requireCoverage: Boolean(requireCoverage), stream: true }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      throw new Error(errorBody || `Math drill generation failed (${res.status})`);
    }

    if (!res.body) {
      throw new Error('Streaming response body is missing');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const collected: MathDrillQuestion[] = [];

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let evt: { type?: string; question?: MathDrillQuestion; count?: number; total?: number; error?: string; snapshot?: string; delta?: string };
        try {
          evt = JSON.parse(trimmed);
        } catch {
          continue;
        }
        if (evt.type === 'question' && evt.question) {
          collected.push(evt.question);
          onQuestion?.(evt.question, evt.count ?? collected.length, evt.total ?? batchSize);
        } else if (evt.type === 'delta') {
          if (evt.snapshot) onDelta?.(evt.snapshot);
        } else if (evt.type === 'progress' || evt.type === 'start' || evt.type === 'heartbeat') {
          onProgress?.(evt.count ?? collected.length, evt.total ?? batchSize);
        } else if (evt.type === 'error') {
          throw new Error(evt.error || 'Math drill stream failed');
        }
      }
    }

    return collected;
  } catch (error) {
    if (error instanceof Error && /404|Failed to fetch|NetworkError|aborted|AbortError|timeout/i.test(error.message)) {
      throw new Error('Math drill endpoint is unavailable. Start the API server and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
