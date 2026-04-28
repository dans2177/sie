export interface DailyQuestion {
  id: string;
  topicId: string;
  topicTitle: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}
