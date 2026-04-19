// SIE Exam Content Types
export interface Equation {
  id: string;
  name: string;
  category: string;
  formula: string; // LaTeX
  description: string;
  variables: Array<{ symbol: string; meaning: string; units?: string }>;
  example: { values: Record<string, number>; solution: number; explanation: string };
  commonMistakes: string[];
  mnemonicOrTip?: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export interface ConceptCard {
  id: string;
  title: string;
  category: string;
  content: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  relatedConcepts: string[];
  keyPoints: string[];
  commonMistakes: string[];
  examples?: string[];
}

export interface ToughSpot {
  id: string;
  title: string;
  problem: string;
  explanation: string;
  relatedEquations: string[];
  relatedConcepts: string[];
  frequency: 'very common' | 'common' | 'occasional';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokensUsed?: number;
}

export interface ContextWindowState {
  currentTokens: number;
  maxTokens: number;
  chatHistory: ChatMessage[];
  cachedContent: CachedContextSection[];
}

export interface CachedContextSection {
  id: string;
  type: 'equations' | 'concepts' | 'toughSpots' | 'systemPrompt';
  tokens: number;
  lastAccessed: number;
}

export interface UserStats {
  topicsStudied: Record<string, { count: number; lastReviewed: number }>;
  questionsAsked: number;
  difficultTopics: string[];
  mastered: string[];
  sessionStartTime: number;
}

export type ExamCategory =
  | 'bonds'
  | 'npv_irr'
  | 'yields'
  | 'options'
  | 'regulations'
  | 'products'
  | 'market_structure'
  | 'ethics'
  | 'tax'
  | 'risk';

// API Types
export interface ClaudeRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system: string;
  model: string;
  max_tokens: number;
  temperature?: number;
}

export interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

// UI Component Props
export interface LayoutProps {
  children?: React.ReactNode;
}

export interface CheatsheetProps {
  searchQuery: string;
  selectedCategory: ExamCategory | 'all';
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
}

export interface ResourcesPanelProps {
  userStats: UserStats;
  toughSpots: ToughSpot[];
}
