import { CURRICULUM } from '../data/curriculum';
import { buildDailyQuestions, normalizeQuestionSet } from './dailyTest';
import type { DailyQuestion, MockExamAttempt, MockExamResult, MockGenerationProgress } from '../types/index';

const MOCK_EXAM_KEY = 'sie-v5-mock-exam';
const MOCK_EXAM_ATTEMPT_KEY = 'sie-v5-mock-exam-attempt';
const MOCK_TOTAL = 75;

const DOMAIN_TARGETS: Array<{ domainId: string; target: number }> = [
  { domainId: 'd1', target: 12 },
  { domainId: 'd2', target: 33 },
  { domainId: 'd3', target: 23 },
  { domainId: 'd4', target: 7 },
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickN<T>(items: T[], n: number, rnd: () => number): T[] {
  if (items.length <= n) return [...items];
  return shuffle(items, rnd).slice(0, n);
}

function localReadAll(): Record<string, MockExamResult[]> {
  try {
    const raw = localStorage.getItem(MOCK_EXAM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function localWriteAll(data: Record<string, MockExamResult[]>) {
  try {
    localStorage.setItem(MOCK_EXAM_KEY, JSON.stringify(data));
  } catch {
    // fall through
  }
}

function localReadAttempts(): Record<string, MockExamAttempt> {
  try {
    const raw = localStorage.getItem(MOCK_EXAM_ATTEMPT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function localWriteAttempts(data: Record<string, MockExamAttempt>) {
  try {
    localStorage.setItem(MOCK_EXAM_ATTEMPT_KEY, JSON.stringify(data));
  } catch {
    // fall through
  }
}

export function loadMockExamHistory(profileId: string): MockExamResult[] {
  return localReadAll()[profileId] || [];
}

export function saveMockExamResult(profileId: string, result: MockExamResult): void {
  const all = localReadAll();
  const prior = all[profileId] || [];
  const next = [result, ...prior].slice(0, 20);
  all[profileId] = next;
  localWriteAll(all);
}

export function loadMockExamAttempt(profileId: string): MockExamAttempt | null {
  const all = localReadAttempts();
  const attempt = all[profileId];
  if (!attempt) return null;
  if (!Array.isArray(attempt.questions) || !Array.isArray(attempt.answers)) return null;
  return attempt;
}

export function saveMockExamAttempt(attempt: MockExamAttempt): void {
  const all = localReadAttempts();
  all[attempt.profileId] = attempt;
  localWriteAttempts(all);
}

export function clearMockExamAttempt(profileId: string): void {
  const all = localReadAttempts();
  delete all[profileId];
  localWriteAttempts(all);
}

async function fetchBatch(
  profileId: string,
  date: string,
  total: number,
  weakTopicIds: string[],
  adaptiveBrief: string,
  minMathQuestions = 0
): Promise<DailyQuestion[]> {
  try {
    const res = await fetch('/api/daily-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        profileId,
        total,
        weakTopicIds,
        adaptiveBrief,
        minMathQuestions,
      }),
    });

    if (!res.ok) throw new Error('Question generation failed');
    const data = (await res.json()) as { ok?: boolean; questions?: DailyQuestion[] };
    if (!data.ok || !Array.isArray(data.questions)) throw new Error('Question generation failed');
    return normalizeQuestionSet(
      data.questions,
      data.questions.map((q, i) => ({
        id: `${date}-batch-${i + 1}`,
        topicId: String(q?.topicId || 'general'),
        topicTitle: String(q?.topicTitle || 'SIE Mixed'),
      }))
    );
  } catch {
    return buildDailyQuestions(date, profileId, total);
  }
}

export async function getMockExamQuestions(
  profileId: string,
  date: string,
  weakTopicIds: string[],
  adaptiveBrief: string,
  onProgress?: (progress: MockGenerationProgress) => void
): Promise<DailyQuestion[]> {
  const seed = hashSeed(`${profileId}:${date}:mock-v1`);
  const rnd = mulberry32(seed);

  const topicToDomain: Record<string, string> = {};
  for (const domain of CURRICULUM) {
    for (const topic of domain.topics) topicToDomain[topic.id] = domain.id;
  }

  const allBatches: DailyQuestion[][] = [];
  let generated = 0;
  onProgress?.({
    generated,
    target: MOCK_TOTAL,
    completedDomains: 0,
    totalDomains: DOMAIN_TARGETS.length,
    message: 'Starting AI mock exam generation...',
  });

  for (let i = 0; i < DOMAIN_TARGETS.length; i += 1) {
    const target = DOMAIN_TARGETS[i];
    const domain = CURRICULUM.find((d) => d.id === target.domainId);
    const domainTopicIds = (domain?.topics || []).map((t) => t.id);
    const weakInDomain = weakTopicIds.filter((id) => domainTopicIds.includes(id));
    const batchWeakIds = weakInDomain.length ? weakInDomain : domainTopicIds.slice(0, 8);
    const total = Math.min(40, target.target + 8);
    const minMathQuestions = target.domainId === 'd2' ? Math.min(10, Math.floor(total / 2)) : 0;
    const batch = await fetchBatch(profileId, `${date}-${target.domainId}`, total, batchWeakIds, adaptiveBrief, minMathQuestions);
    allBatches.push(batch);
    generated += batch.length;
    onProgress?.({
      generated,
      target: MOCK_TOTAL,
      completedDomains: i + 1,
      totalDomains: DOMAIN_TARGETS.length,
      message: `Generated domain ${i + 1}/${DOMAIN_TARGETS.length} (${generated} raw questions)`,
    });
  }

  const unique: DailyQuestion[] = [];
  const seen = new Set<string>();
  for (const q of allBatches.flat()) {
    const k = `${q.topicId}::${q.prompt}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(q);
  }

  const selected: DailyQuestion[] = [];
  const used = new Set<string>();

  for (const target of DOMAIN_TARGETS) {
    const domainPool = unique.filter((q) => topicToDomain[q.topicId] === target.domainId && !used.has(`${q.topicId}::${q.prompt}`));
    const picked = pickN(domainPool, target.target, rnd);
    for (const q of picked) {
      selected.push(q);
      used.add(`${q.topicId}::${q.prompt}`);
    }
  }

  if (selected.length < MOCK_TOTAL) {
    const leftovers = unique.filter((q) => !used.has(`${q.topicId}::${q.prompt}`));
    const fill = pickN(leftovers, MOCK_TOTAL - selected.length, rnd);
    selected.push(...fill);
  }

  if (selected.length < MOCK_TOTAL) {
    const fallback = buildDailyQuestions(`${date}-fallback`, profileId, MOCK_TOTAL - selected.length);
    selected.push(...fallback);
  }

  const finalized = shuffle(selected, rnd).slice(0, MOCK_TOTAL).map((q, idx) => ({ ...q, id: `${date}-mock-${idx + 1}` }));
  onProgress?.({
    generated: finalized.length,
    target: MOCK_TOTAL,
    completedDomains: DOMAIN_TARGETS.length,
    totalDomains: DOMAIN_TARGETS.length,
    message: 'Mock exam ready.',
  });
  return finalized;
}

export function buildMockDomainBreakdown(questions: DailyQuestion[], answers: number[]) {
  const topicToDomain = new Map<string, { domainId: string; label: string }>();
  for (const domain of CURRICULUM) {
    for (const topic of domain.topics) {
      topicToDomain.set(topic.id, { domainId: domain.id, label: domain.label });
    }
  }

  const map = new Map<string, { domainId: string; label: string; score: number; total: number }>();

  questions.forEach((q, idx) => {
    const d = topicToDomain.get(q.topicId) || { domainId: 'other', label: 'Other' };
    const key = d.domainId;
    const row = map.get(key) || { domainId: d.domainId, label: d.label, score: 0, total: 0 };
    row.total += 1;
    if (answers[idx] === q.answerIndex) row.score += 1;
    map.set(key, row);
  });

  return [...map.values()].map((x) => ({ ...x, pct: Math.round((x.score / Math.max(x.total, 1)) * 100) }));
}
