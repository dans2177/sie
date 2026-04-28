export interface Topic {
  id: string;
  code: string;
  title: string;
  subtopics: string[];
}

export interface Domain {
  id: string;
  label: string;
  weight: string;
  items: number;
  color: string;
  title: string;
  topics: Topic[];
}

export interface MathFormula {
  id: string;
  title: string;
  color: string;
  formula: string;
  parts: { label: string; desc: string }[];
  example: { q: string; a: string };
  rule: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PdfState {
  b64: string | null;
  name: string | null;
}

export interface SelectedTopic {
  topic: Topic;
  domain: Domain;
}

export type View = 'dashboard' | 'topics' | 'chat' | 'math' | 'cheatsheet';
