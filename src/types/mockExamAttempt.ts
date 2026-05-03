import type { DailyQuestion } from './dailyQuestion';

export type MockExamAttempt = {
  profileId: string;
  startedAt: string;
  questions: DailyQuestion[];
  answers: number[];
  flags: number[];
  idx: number;
  timeLeftSec: number;
};
