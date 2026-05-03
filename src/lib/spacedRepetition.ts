import { CURRICULUM } from '../data/curriculum';
import type { ObjectiveRecord, ReviewOutcome } from '../types/index';

const STORE_KEY = 'sie-v5-spaced-repetition';

function getAllTopicTitles(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const domain of CURRICULUM) {
    for (const topic of domain.topics) {
      map[topic.id] = topic.title;
    }
  }
  return map;
}

function readAll(): Record<string, Record<string, ObjectiveRecord>> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, Record<string, ObjectiveRecord>>) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // fall through
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function reviewObjective(profileId: string, topicId: string, outcome: ReviewOutcome): ObjectiveRecord {
  const all = readAll();
  const byTopic = all[profileId] || {};
  const now = new Date().toISOString();
  const prev = byTopic[topicId];

  const base: ObjectiveRecord =
    prev || {
      topicId,
      ease: 2.3,
      intervalDays: 0,
      reps: 0,
      lapses: 0,
      dueAt: now,
      lastOutcome: 'needsWork',
      lastReviewedAt: now,
    };

  let next: ObjectiveRecord;

  if (outcome === 'correct') {
    const reps = base.reps + 1;
    const ease = clamp(base.ease + 0.1, 1.3, 2.8);
    const intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.max(4, Math.round(base.intervalDays * ease));
    next = {
      ...base,
      reps,
      ease,
      intervalDays,
      dueAt: addDays(now, intervalDays),
      lastOutcome: 'correct',
      lastReviewedAt: now,
    };
  } else {
    const ease = clamp(base.ease - 0.2, 1.3, 2.8);
    next = {
      ...base,
      reps: 0,
      ease,
      intervalDays: 0,
      lapses: base.lapses + 1,
      dueAt: now,
      lastOutcome: 'needsWork',
      lastReviewedAt: now,
    };
  }

  byTopic[topicId] = next;
  all[profileId] = byTopic;
  writeAll(all);
  return next;
}

export function getDueObjectives(profileId: string, limit = 8): Array<{ topicId: string; title: string; dueAt: string; urgency: 'due' | 'soon'; lapses: number }> {
  const byTopic = readAll()[profileId] || {};
  const nowMs = Date.now();
  const titles = getAllTopicTitles();

  return Object.values(byTopic)
    .map((r) => {
      const dueMs = new Date(r.dueAt).getTime();
      const soonCutoff = nowMs + 24 * 60 * 60 * 1000;
      const urgency: 'due' | 'soon' = dueMs <= nowMs ? 'due' : 'soon';
      const include = dueMs <= soonCutoff;
      return { include, dueMs, row: { topicId: r.topicId, title: titles[r.topicId] || r.topicId, dueAt: r.dueAt, urgency, lapses: r.lapses } };
    })
    .filter((x) => x.include)
    .sort((a, b) => a.dueMs - b.dueMs)
    .slice(0, limit)
    .map((x) => x.row);
}

export function getSpacedSummary(profileId: string): { tracked: number; dueNow: number } {
  const byTopic = readAll()[profileId] || {};
  const nowMs = Date.now();
  const records = Object.values(byTopic);
  const dueNow = records.filter((r) => new Date(r.dueAt).getTime() <= nowMs).length;
  return { tracked: records.length, dueNow };
}

export function clearObjectives(profileId: string, topicIds?: string[]): void {
  const all = readAll();
  const byTopic = all[profileId] || {};
  if (!topicIds || topicIds.length === 0) {
    all[profileId] = {};
    writeAll(all);
    return;
  }

  for (const id of topicIds) {
    delete byTopic[id];
  }
  all[profileId] = byTopic;
  writeAll(all);
}
