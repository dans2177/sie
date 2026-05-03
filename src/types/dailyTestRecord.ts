import type { DailyQuestion } from './dailyQuestion';

export interface DailyTestRecord {
  date: string;
  score: number;
  total: number;
  completedAt: string;
  payload: {
    questions: DailyQuestion[];
    selectedAnswers: number[];
  };
  weakTopicIds: string[];
}
