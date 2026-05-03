import type { RecentScore } from './recentScore';

export interface MemorySummary {
  adaptiveBrief: string;
  weakTopicIds: string[];
  recentScores: RecentScore[];
}
