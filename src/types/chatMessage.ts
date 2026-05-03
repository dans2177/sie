export type ChatOutcome = 'correct' | 'needsWork' | 'neutral';

export interface McqOption {
  label: string;
  text: string;
}

export interface ChatAnswerMeta {
  /** Question prompt that the user is answering (snapshot of the assistant's MCQ stem). */
  questionPrompt?: string;
  /** Multiple-choice options presented to the user, in order. */
  options?: McqOption[];
  /** Label the user picked, e.g. "A". */
  userAnswerLabel?: string;
  /** Full text of the option the user picked. */
  userAnswerText?: string;
  /** Label of the correct option, e.g. "C". Filled in when known. */
  correctAnswerLabel?: string;
  /** Full text of the correct option. */
  correctAnswerText?: string;
  /** Whether the user's pick matches the correct answer. */
  isCorrect?: boolean;
  /** Tutor's outcome classification for this turn. */
  outcome?: ChatOutcome;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Optional structured metadata for grading and analytics. Backwards compatible. */
  meta?: ChatAnswerMeta;
}

