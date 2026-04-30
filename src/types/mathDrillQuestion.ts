export type MathDrillDifficulty = 'easy' | 'medium' | 'hard';

export type MathDrillUnit = 'plain' | 'percent' | 'dollars' | 'ratio';

export interface MathDrillBlank {
  label?: string;
  acceptableAnswers: string[];
  numericAnswer?: number;
  tolerance?: number;
  unit?: MathDrillUnit;
}

export interface MathDrillQuestion {
  id: string;
  formulaId: string;
  formulaTitle: string;
  difficulty: MathDrillDifficulty;
  prompt: string;
  /** Optional fill-in template with `___` placeholders for each blank. If present, blanks must also be provided. */
  template?: string;
  /** Ordered list of blanks corresponding to each `___` in `template`. */
  blanks?: MathDrillBlank[];
  hint: string;
  answerFormat: string;
  canonicalAnswer: string;
  acceptableAnswers: string[];
  numericAnswer?: number;
  tolerance?: number;
  unit?: MathDrillUnit;
  explanation: string;
  steps: string[];
}
