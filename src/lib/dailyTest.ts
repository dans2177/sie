import { CURRICULUM } from '../data/curriculum';
import type { DailyQuestion } from '../types/index';

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
}

function cleanOption(value: unknown): string {
  const raw = cleanText(value);
  return raw
    .replace(/^\(?[A-Da-d]\)?[\).:\-]\s*/, '')
    .replace(/^[-*]\s*/, '')
    .trim();
}

export function normalizeQuestion(
  input: Partial<DailyQuestion>,
  fallback: { id: string; topicId: string; topicTitle: string }
): DailyQuestion | null {
  const prompt = cleanText(input.prompt);
  const explanation = cleanText(input.explanation);
  const optionsRaw = Array.isArray(input.options) ? input.options : [];
  const options = optionsRaw.map(cleanOption).filter(Boolean);
  const uniqueOptions = [...new Set(options)].slice(0, 4);
  const answerIndex = Number(input.answerIndex);

  if (!prompt || !explanation || uniqueOptions.length !== 4) return null;
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) return null;

  return {
    id: cleanText(input.id) || fallback.id,
    topicId: cleanText(input.topicId) || fallback.topicId,
    topicTitle: cleanText(input.topicTitle) || fallback.topicTitle,
    prompt,
    options: uniqueOptions,
    answerIndex,
    explanation,
  };
}

export function normalizeQuestionSet(
  questions: Partial<DailyQuestion>[],
  fallbacks: Array<{ id: string; topicId: string; topicTitle: string }>
): DailyQuestion[] {
  const out: DailyQuestion[] = [];
  const seenPrompt = new Set<string>();

  for (let i = 0; i < questions.length; i += 1) {
    const q = normalizeQuestion(questions[i], fallbacks[i] || fallbacks[0]);
    if (!q) continue;
    const key = q.prompt.toLowerCase();
    if (seenPrompt.has(key)) continue;
    seenPrompt.add(key);
    out.push(q);
  }

  return out;
}

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

function pickN<T>(items: T[], n: number, rnd: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length && out.length < n) {
    const idx = Math.floor(rnd() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function shuffled<T>(items: T[], rnd: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDailyQuestions(date: string, profileId: string, total = 20): DailyQuestion[] {
  const rnd = mulberry32(hashSeed(`${date}:${profileId}:sie-daily-v1`));

  const topics = CURRICULUM.flatMap((domain) =>
    domain.topics.map((topic) => ({
      topic,
      domain,
      facts: topic.subtopics.filter(Boolean),
    }))
  ).filter((x) => x.facts.length > 0);

  const selected = pickN(topics, Math.min(total, topics.length), rnd);

  return selected.map(({ topic, domain, facts }, idx) => {
    const correct = facts[Math.floor(rnd() * facts.length)];

    const distractorPool = topics
      .filter((t) => t.topic.id !== topic.id)
      .flatMap((t) => t.facts)
      .filter((f) => f !== correct);

    const distractors = pickN(distractorPool, 3, rnd);
    const all = shuffled([correct, ...distractors], rnd);
    const answerIndex = all.findIndex((x) => x === correct);

    return {
      id: `${date}-${topic.id}-${idx + 1}`,
      topicId: topic.id,
      topicTitle: topic.title,
      prompt: `Which statement best reflects ${topic.title}?`,
      options: all,
      answerIndex,
      explanation: `This maps to ${domain.label} (${domain.title}) and the core fact: ${correct}`,
    };
  });
}

export function scoreDailyTest(questions: DailyQuestion[], selectedAnswers: number[]) {
  let score = 0;
  const missesByTopic: Record<string, number> = {};

  questions.forEach((q, idx) => {
    const selected = selectedAnswers[idx];
    if (selected === q.answerIndex) {
      score += 1;
    } else {
      missesByTopic[q.topicId] = (missesByTopic[q.topicId] || 0) + 1;
    }
  });

  const weakTopicIds = Object.entries(missesByTopic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([topicId]) => topicId);

  return { score, total: questions.length, weakTopicIds };
}
