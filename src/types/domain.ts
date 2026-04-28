import type { Topic } from './topic';

export interface Domain {
  id: string;
  label: string;
  weight: string;
  items: number;
  color: string;
  title: string;
  topics: Topic[];
}
