import type { ReviewOutcome } from './reviewOutcome';

export type ObjectiveRecord = {
  topicId: string;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: string;
  lastOutcome: ReviewOutcome;
  lastReviewedAt: string;
};
