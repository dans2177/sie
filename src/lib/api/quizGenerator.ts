import { sendMessage } from './claudeClient';
import type { ChatMessage } from '../../types/index';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export async function generateQuizQuestions(
  topic: string,
  difficulty: 'basic' | 'intermediate' | 'advanced',
  count: number = 5,
): Promise<QuizQuestion[]> {
  const prompt = `Generate ${count} multiple-choice SIE exam questions about "${topic}" at ${difficulty} difficulty level.

Format as JSON array with this structure:
[
  {
    "id": "unique-id",
    "question": "Question text?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct and why others are wrong",
    "topic": "${topic}",
    "difficulty": "${difficulty}"
  }
]

Make questions realistic for the SIE exam. Include math calculations when relevant.`;

  const messages: ChatMessage[] = [
    {
      id: '0',
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    },
  ];

  try {
    const response = await sendMessage(prompt, messages);
    const jsonMatch = response.response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const questions = JSON.parse(jsonMatch[0]) as QuizQuestion[];
    return questions;
  } catch (error) {
    console.error('Failed to generate quiz questions:', error);
    return generateFallbackQuestions(topic, difficulty, count);
  }
}

function generateFallbackQuestions(
  topic: string,
  difficulty: string,
  count: number,
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const baseId = Math.random().toString(36).substring(7);

  for (let i = 0; i < count; i++) {
    questions.push({
      id: `${baseId}-${i}`,
      question: `What is a key concept about ${topic}? (Question ${i + 1})`,
      options: [
        'Option A - Incorrect',
        'Option B - Correct Answer',
        'Option C - Incorrect',
        'Option D - Incorrect',
      ],
      correctAnswer: 1,
      explanation: `This tests your understanding of ${topic}. The correct answer is B because...`,
      topic,
      difficulty: difficulty as any,
    });
  }

  return questions;
}

export async function scoringQuiz(
  questions: QuizQuestion[],
  answers: number[],
): Promise<{
  score: number;
  total: number;
  percentage: number;
  mistakes: Array<{ question: QuizQuestion; userAnswer: number }>;
}> {
  let correct = 0;
  const mistakes = [];

  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correctAnswer) {
      correct += 1;
    } else {
      mistakes.push({ question: questions[i], userAnswer: answers[i] });
    }
  }

  return {
    score: correct,
    total: questions.length,
    percentage: Math.round((correct / questions.length) * 100),
    mistakes,
  };
}
