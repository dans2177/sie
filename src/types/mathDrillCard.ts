import type { MathDrillQuestion } from './mathDrillQuestion';
import type { ReviewOutcome } from './reviewOutcome';

export interface MathDrillCard extends MathDrillQuestion {
  generatedAt: string;
  attempts: number;
  correctCount: number;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: string;
  lastOutcome: ReviewOutcome;
  lastReviewedAt: string;
  lastUserAnswer?: string;
}

export interface MathDrillSummary {
  tracked: number;
  dueNow: number;
  mastered: number;
  attempts: number;
  accuracyPct: number;
}

export interface MathDrillReviewResult {
  card: MathDrillCard;
  correct: boolean;
  normalizedInput: string;
  expectedAnswer: string;
}