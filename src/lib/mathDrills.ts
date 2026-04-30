import type { MathDrillCard, MathDrillQuestion, MathDrillReviewResult, MathDrillSummary } from '../types/index';

const STORE_KEY = 'sie-v5-math-drills';

function readAll(): Record<string, Record<string, MathDrillCard>> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, Record<string, MathDrillCard>>) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    // fall through
  }
}

function readProfile(profileId: string): Record<string, MathDrillCard> {
  return readAll()[profileId] || {};
}

function writeProfile(profileId: string, byId: Record<string, MathDrillCard>) {
  const all = readAll();
  all[profileId] = byId;
  writeAll(all);
}

export function mergeRemoteMathDrillCards(profileId: string, remote: MathDrillCard[]): MathDrillCard[] {
  const local = readProfile(profileId);
  const merged: Record<string, MathDrillCard> = { ...local };
  for (const card of remote) {
    if (!card || !card.id) continue;
    const existing = merged[card.id];
    if (!existing) {
      merged[card.id] = card;
      continue;
    }
    const localTime = new Date(existing.lastReviewedAt || existing.generatedAt || 0).getTime();
    const remoteTime = new Date(card.lastReviewedAt || card.generatedAt || 0).getTime();
    merged[card.id] = remoteTime > localTime ? card : existing;
  }
  writeProfile(profileId, merged);
  return loadMathDrillCards(profileId);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function normalizeAnswer(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[$,%]/g, '')
    .replace(/\bper\s*share\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/,/g, '')
    .trim();
}

function extractNumericValue(value: string): number | null {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/[$]/g, '')
    .trim();
  const match = normalized.match(/-?\d*\.?\d+/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function gradeAnswer(card: MathDrillCard, userAnswer: string): { correct: boolean; normalizedInput: string } {
  // Multi-blank grading: userAnswer is JSON-encoded array of strings.
  if (Array.isArray(card.blanks) && card.blanks.length > 0 && userAnswer.startsWith('[') && userAnswer.endsWith(']')) {
    let parts: string[] = [];
    try {
      const parsed = JSON.parse(userAnswer);
      if (Array.isArray(parsed)) parts = parsed.map((p) => String(p ?? ''));
    } catch {
      parts = [];
    }
    if (parts.length !== card.blanks.length) {
      return { correct: false, normalizedInput: userAnswer };
    }
    let allCorrect = true;
    for (let i = 0; i < card.blanks.length; i += 1) {
      const blank = card.blanks[i];
      const input = parts[i];
      const normalizedInput = normalizeAnswer(input);
      if (!normalizedInput) { allCorrect = false; break; }
      const accepted = new Set<string>([
        ...(blank.acceptableAnswers || []).map((entry) => normalizeAnswer(entry)),
      ]);
      if (accepted.has(normalizedInput)) continue;
      if (typeof blank.numericAnswer === 'number') {
        const parsed = extractNumericValue(input);
        const tolerance = typeof blank.tolerance === 'number' ? Math.max(blank.tolerance, 0.0001) : 0.01;
        if (parsed !== null && Math.abs(parsed - blank.numericAnswer) <= tolerance) continue;
      }
      allCorrect = false;
      break;
    }
    return { correct: allCorrect, normalizedInput: userAnswer };
  }

  const normalizedInput = normalizeAnswer(userAnswer);
  if (!normalizedInput) {
    return { correct: false, normalizedInput };
  }

  const accepted = new Set<string>([
    normalizeAnswer(card.canonicalAnswer),
    ...card.acceptableAnswers.map((entry) => normalizeAnswer(entry)),
  ]);

  if (accepted.has(normalizedInput)) {
    return { correct: true, normalizedInput };
  }

  if (typeof card.numericAnswer === 'number') {
    const parsed = extractNumericValue(userAnswer);
    const tolerance = typeof card.tolerance === 'number' ? Math.max(card.tolerance, 0.0001) : 0.01;
    if (parsed !== null && Math.abs(parsed - card.numericAnswer) <= tolerance) {
      return { correct: true, normalizedInput };
    }
  }

  return { correct: false, normalizedInput };
}

function toInitialCard(question: MathDrillQuestion): MathDrillCard {
  const now = new Date().toISOString();
  return {
    ...question,
    generatedAt: now,
    attempts: 0,
    correctCount: 0,
    ease: 2.3,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    dueAt: now,
    lastOutcome: 'needsWork',
    lastReviewedAt: now,
  };
}

export function loadMathDrillCards(profileId: string): MathDrillCard[] {
  return Object.values(readAll()[profileId] || {}).sort((a, b) => {
    const dueDiff = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    if (dueDiff !== 0) return dueDiff;
    return a.formulaTitle.localeCompare(b.formulaTitle);
  });
}

export function upsertMathDrillQuestions(profileId: string, questions: MathDrillQuestion[]): MathDrillCard[] {
  const all = readAll();
  const byId = all[profileId] || {};

  for (const question of questions) {
    const prev = byId[question.id];
    byId[question.id] = prev
      ? {
          ...prev,
          ...question,
        }
      : toInitialCard(question);
  }

  all[profileId] = byId;
  writeAll(all);
  return loadMathDrillCards(profileId);
}

export function getDueMathDrillCards(profileId: string, limit = 10): MathDrillCard[] {
  const nowMs = Date.now();
  return loadMathDrillCards(profileId)
    .filter((card) => new Date(card.dueAt).getTime() <= nowMs)
    .slice(0, limit);
}

export function getMathDrillSummary(profileId: string): MathDrillSummary {
  const cards = loadMathDrillCards(profileId);
  const attempts = cards.reduce((sum, card) => sum + card.attempts, 0);
  const correct = cards.reduce((sum, card) => sum + card.correctCount, 0);
  const dueNow = cards.filter((card) => new Date(card.dueAt).getTime() <= Date.now()).length;
  const mastered = cards.filter((card) => card.reps >= 2).length;
  return {
    tracked: cards.length,
    dueNow,
    mastered,
    attempts,
    accuracyPct: attempts ? Math.round((correct / attempts) * 100) : 0,
  };
}

export function getWeakMathFormulaIds(profileId: string, limit = 3): string[] {
  const byFormula = new Map<string, { score: number; formulaId: string }>();
  for (const card of loadMathDrillCards(profileId)) {
    const current = byFormula.get(card.formulaId) || { formulaId: card.formulaId, score: 0 };
    current.score += card.lapses * 3 + (card.lastOutcome === 'needsWork' ? 2 : 0) + Math.max(0, 2 - card.reps);
    byFormula.set(card.formulaId, current);
  }

  return [...byFormula.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.formulaId);
}

export function reviewMathDrill(profileId: string, questionId: string, userAnswer: string): MathDrillReviewResult | null {
  const all = readAll();
  const byId = all[profileId] || {};
  const card = byId[questionId];
  if (!card) return null;

  const now = new Date().toISOString();
  const { correct, normalizedInput } = gradeAnswer(card, userAnswer);

  let next: MathDrillCard;
  if (correct) {
    const reps = card.reps + 1;
    const ease = clamp(card.ease + 0.08, 1.3, 2.8);
    const intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.max(4, Math.round(card.intervalDays * ease));
    next = {
      ...card,
      attempts: card.attempts + 1,
      correctCount: card.correctCount + 1,
      reps,
      ease,
      intervalDays,
      dueAt: addDays(now, intervalDays),
      lastOutcome: 'correct',
      lastReviewedAt: now,
      lastUserAnswer: userAnswer.trim(),
    };
  } else {
    const ease = clamp(card.ease - 0.2, 1.3, 2.8);
    next = {
      ...card,
      attempts: card.attempts + 1,
      reps: 0,
      ease,
      intervalDays: 0,
      lapses: card.lapses + 1,
      dueAt: now,
      lastOutcome: 'needsWork',
      lastReviewedAt: now,
      lastUserAnswer: userAnswer.trim(),
    };
  }

  byId[questionId] = next;
  all[profileId] = byId;
  writeAll(all);

  return {
    card: next,
    correct,
    normalizedInput,
    expectedAnswer: card.canonicalAnswer,
  };
}

export function clearMathDrills(profileId: string): void {
  const all = readAll();
  all[profileId] = {};
  writeAll(all);
}