import { buildDailyQuestions, normalizeQuestionSet } from './dailyTest';
import { CURRICULUM } from '../data/curriculum';
import { MATH } from '../data/math';
import type { ChatMessage, DailyQuestion, DailyTestRecord, GenerationProgress, MemorySummary } from '../types/index';

const LOCAL_DAILY_KEY = 'sie-v5-daily';
const LOCAL_LAST_TOPIC_KEY = 'sie-v5-last-topic';
const DAILY_BLUEPRINT = CURRICULUM
  .map((d) => `${d.label} ${d.title}: ${d.topics.map((t) => `${t.id} ${t.title}`).join('; ')}`)
  .join('\n');
const DAILY_VALID_TOPICS = CURRICULUM.flatMap((d) => d.topics.map((t) => ({ id: t.id, title: t.title })));
const DAILY_MATH_BLUEPRINT = MATH
  .map((m) => `${m.title}: ${m.formula}. Rule: ${m.rule}. Example: ${m.example.q} => ${m.example.a}`)
  .join('\n');

function localDailyAll(): Record<string, DailyTestRecord[]> {
  try {
    const raw = localStorage.getItem(LOCAL_DAILY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function localSaveDailyAll(data: Record<string, DailyTestRecord[]>) {
  try {
    localStorage.setItem(LOCAL_DAILY_KEY, JSON.stringify(data));
  } catch {
    // fall through
  }
}

function localGetDaily(profileId: string): DailyTestRecord[] {
  const all = localDailyAll();
  return all[profileId] || [];
}

function localPutDaily(profileId: string, record: DailyTestRecord) {
  const all = localDailyAll();
  const list = all[profileId] || [];
  const next = [record, ...list.filter((x) => x.date !== record.date)].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  );
  all[profileId] = next.slice(0, 30);
  localSaveDailyAll(all);
}

function localLastTopicAll(): Record<string, string | null> {
  try {
    const raw = localStorage.getItem(LOCAL_LAST_TOPIC_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function localSetLastTopic(profileId: string, topicId: string | null) {
  try {
    const all = localLastTopicAll();
    all[profileId] = topicId;
    localStorage.setItem(LOCAL_LAST_TOPIC_KEY, JSON.stringify(all));
  } catch {
    // fall through
  }
}

function localGetLastTopic(profileId: string): string | null {
  const all = localLastTopicAll();
  const topicId = all[profileId];
  return typeof topicId === 'string' && topicId.trim() ? topicId : null;
}

async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function syncProgress(profileId: string, done: string[]): Promise<void> {
  await safeJson('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, done }),
  });
}

export async function loadProgress(profileId: string): Promise<string[] | null> {
  const data = await safeJson<{ ok: boolean; done: string[] }>(
    `/api/progress?profileId=${encodeURIComponent(profileId)}`
  );
  if (data?.ok && Array.isArray(data.done)) {
    return data.done.map(String);
  }
  return null;
}

export async function loadMemorySummary(profileId: string): Promise<MemorySummary> {
  const data = await safeJson<{ ok: boolean; adaptiveBrief: string; weakTopicIds: string[]; recentScores: any[] }>(
    `/api/memory?profileId=${encodeURIComponent(profileId)}`
  );

  if (data?.ok) {
    return {
      adaptiveBrief: data.adaptiveBrief || '',
      weakTopicIds: data.weakTopicIds || [],
      recentScores: (data.recentScores || []).map((x: any) => ({
        date: x.test_date || x.date || '',
        score: Number(x.score || 0),
        total: Number(x.total || 0),
        completedAt: x.completedAt || x.completed_at || new Date().toISOString(),
      })),
    };
  }

  const history = localGetDaily(profileId).slice(0, 7);
  return {
    adaptiveBrief: '',
    weakTopicIds: history.flatMap((h) => h.weakTopicIds).slice(0, 6),
    recentScores: history.map((h) => ({
      date: h.date,
      score: h.score,
      total: h.total,
      completedAt: h.completedAt,
    })),
  };
}

export async function saveChatMemory(input: {
  profileId: string;
  topicId: string;
  userMessage: string;
  assistantMessage: string;
}): Promise<void> {
  await safeJson('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function loadTopicChatRemote(profileId: string, topicId: string): Promise<ChatMessage[] | null> {
  const data = await safeJson<{ ok: boolean; messages: ChatMessage[] }>(
    `/api/topic-chat?profileId=${encodeURIComponent(profileId)}&topicId=${encodeURIComponent(topicId)}`
  );
  if (data?.ok && Array.isArray(data.messages)) {
    return data.messages;
  }
  return null;
}

export async function saveTopicChatRemote(profileId: string, topicId: string, messages: ChatMessage[]): Promise<void> {
  await safeJson('/api/topic-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, topicId, messages }),
  });
}

export async function logEvent(profileId: string, eventType: string, payload: Record<string, unknown> = {}): Promise<void> {
  await safeJson('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, eventType, payload }),
  });
}

export async function loadLastTopic(profileId: string): Promise<string | null> {
  const data = await safeJson<{ ok: boolean; lastTopicId: string | null }>(
    `/api/profile-state?profileId=${encodeURIComponent(profileId)}`
  );

  if (data?.ok) {
    return data.lastTopicId ? String(data.lastTopicId) : null;
  }

  return localGetLastTopic(profileId);
}

export async function saveLastTopic(profileId: string, lastTopicId: string | null): Promise<void> {
  const payload = { profileId, lastTopicId };
  const res = await safeJson<{ ok: boolean }>('/api/profile-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res?.ok) {
    localSetLastTopic(profileId, lastTopicId);
  }
}

export async function loadDailyTest(profileId: string, date: string): Promise<{
  today: DailyTestRecord | null;
  history: Array<{ date: string; score: number; total: number; completedAt: string }>;
}> {
  const local = localGetDaily(profileId);
  const data = await safeJson<{ ok: boolean; today: any; history: any[] }>(
    `/api/daily-test?profileId=${encodeURIComponent(profileId)}&date=${encodeURIComponent(date)}`
  );

  if (data?.ok) {
    const remoteToday: DailyTestRecord | null = data.today
      ? {
          date: data.today.date,
          score: Number(data.today.score || 0),
          total: Number(data.today.total || 0),
          completedAt: data.today.completedAt || new Date().toISOString(),
          payload: data.today.payload,
          weakTopicIds: Array.isArray(data.today.weakTopicIds) ? data.today.weakTopicIds : [],
        }
      : null;

    const remoteHistory = (data.history || []).map((x: any) => ({
      date: x.date || x.test_date,
      score: Number(x.score || 0),
      total: Number(x.total || 0),
      completedAt: x.completedAt || x.completed_at || new Date().toISOString(),
    }));

    const mergedByDate = new Map<string, { date: string; score: number; total: number; completedAt: string }>();
    for (const item of remoteHistory) mergedByDate.set(item.date, item);
    for (const item of local.slice(0, 30)) {
      if (!mergedByDate.has(item.date)) {
        mergedByDate.set(item.date, {
          date: item.date,
          score: item.score,
          total: item.total,
          completedAt: item.completedAt,
        });
      }
    }

    const mergedHistory = [...mergedByDate.values()]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, 14);

    const localToday = local.find((x) => x.date === date) || null;
    return {
      today: remoteToday || localToday,
      history: mergedHistory,
    };
  }

  const today = local.find((x) => x.date === date) || null;
  return {
    today,
    history: local.slice(0, 14).map((x) => ({
      date: x.date,
      score: x.score,
      total: x.total,
      completedAt: x.completedAt,
    })),
  };
}

export async function saveDailyTest(profileId: string, record: DailyTestRecord): Promise<void> {
  // Always persist locally first so UI/history are reliable even when server storage is unavailable.
  localPutDaily(profileId, record);

  const payload = {
    profileId,
    date: record.date,
    score: record.score,
    total: record.total,
    payload: record.payload,
    weakTopicIds: record.weakTopicIds,
  };

  const res = await safeJson<{ ok: boolean }>('/api/daily-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res?.ok) {
    // Local save already completed; remote write is best-effort.
    return;
  }
}

export async function getOrBuildTodayQuestions(
  profileId: string,
  date: string,
  existing: DailyTestRecord | null,
  options: {
    total?: number;
    weakTopicIds?: string[];
    adaptiveBrief?: string;
    minMathQuestions?: number;
    onProgress?: (progress: GenerationProgress) => void;
  } = {}
): Promise<DailyQuestion[]> {
  const total = Number(options.total || 20);
  if (existing?.payload?.questions?.length) {
    const cleaned = normalizeQuestionSet(existing.payload.questions, existing.payload.questions.map((q, i) => ({
      id: q.id || `${date}-existing-${i + 1}`,
      topicId: q.topicId || 'general',
      topicTitle: q.topicTitle || 'SIE Mixed',
    })));
    if (cleaned.length) return cleaned;
  }

  const onProgress = options.onProgress;

  if (onProgress) {
    const seen = new Set<string>();
    const collected: DailyQuestion[] = [];
    const batchSize = 5;

    onProgress({ completed: 0, total, message: 'Starting AI generation...' });

    for (let batch = 0; batch < 8 && collected.length < total; batch += 1) {
      const needed = Math.min(batchSize, total - collected.length);
      try {
        const data = await safeJson<{ ok: boolean; questions: DailyQuestion[] }>('/api/daily-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: `${date}-chunk-${batch + 1}`,
            profileId,
            total: Math.max(needed, 5),
            weakTopicIds: options.weakTopicIds || [],
            adaptiveBrief: options.adaptiveBrief || '',
            minMathQuestions: Number(options.minMathQuestions || 0),
            blueprint: DAILY_BLUEPRINT,
            mathBlueprint: DAILY_MATH_BLUEPRINT,
            validTopics: DAILY_VALID_TOPICS,
          }),
        });

        const questionsRaw = Array.isArray(data?.questions) ? data!.questions : [];
        const questions = normalizeQuestionSet(
          questionsRaw,
          questionsRaw.map((q, i) => ({
            id: `${date}-chunk-${batch + 1}-${i + 1}`,
            topicId: String((q as DailyQuestion)?.topicId || 'general'),
            topicTitle: String((q as DailyQuestion)?.topicTitle || 'SIE Mixed'),
          }))
        );
        for (const q of questions) {
          const key = `${q.topicId}::${q.prompt}`;
          if (seen.has(key)) continue;
          seen.add(key);
          collected.push(q);
          if (collected.length >= total) break;
        }

        onProgress({
          completed: collected.length,
          total,
          message: `Generated ${collected.length}/${total} questions from AI...`,
        });
      } catch {
        onProgress({
          completed: collected.length,
          total,
          message: 'Retrying AI generation...',
        });
      }
    }

    if (collected.length < total) {
      const fallback = buildDailyQuestions(`${date}-fallback`, profileId, total - collected.length);
      collected.push(...fallback);
      onProgress({
        completed: collected.length,
        total,
        message: 'Finalizing question set...',
      });
    }

    return collected.slice(0, total);
  }

  try {
    const data = await safeJson<{ ok: boolean; questions: DailyQuestion[] }>('/api/daily-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        profileId,
        total,
        weakTopicIds: options.weakTopicIds || [],
        adaptiveBrief: options.adaptiveBrief || '',
        minMathQuestions: Number(options.minMathQuestions || 0),
        blueprint: DAILY_BLUEPRINT,
        mathBlueprint: DAILY_MATH_BLUEPRINT,
        validTopics: DAILY_VALID_TOPICS,
      }),
    });

    const normalized = Array.isArray(data?.questions)
      ? normalizeQuestionSet(
          data.questions,
          data.questions.map((q, i) => ({
            id: `${date}-api-${i + 1}`,
            topicId: String((q as DailyQuestion)?.topicId || 'general'),
            topicTitle: String((q as DailyQuestion)?.topicTitle || 'SIE Mixed'),
          }))
        )
      : [];

    if (!data?.ok || normalized.length < Math.min(10, total)) {
      throw new Error('Daily AI generation failed');
    }

    return normalized.slice(0, total);
  } catch {
    return buildDailyQuestions(date, profileId, total);
  }
}
