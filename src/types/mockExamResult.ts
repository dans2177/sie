import type { MockDomainBreakdown } from './mockDomainBreakdown';

export type MockExamResult = {
  id: string;
  date: string;
  score: number;
  total: number;
  pct: number;
  completedAt: string;
  domainBreakdown: MockDomainBreakdown[];
};
