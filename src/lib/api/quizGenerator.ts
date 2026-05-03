export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  mistakes: Array<{ question: QuizQuestion; userAnswer: number }>;
}

export async function generateQuizQuestions(
  topic: string,
  difficulty: 'basic' | 'intermediate' | 'advanced',
  count: number = 5,
): Promise<QuizQuestion[]> {
  try {
    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, difficulty, count }),
    });

    if (!response.ok) throw new Error(`Quiz API error: ${response.status}`);

    const questions = (await response.json()) as QuizQuestion[];
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
      difficulty: difficulty as QuizQuestion['difficulty'],
    });
  }

  return questions;
}

export function scoringQuiz(questions: QuizQuestion[], answers: number[]): QuizResult {
  let correct = 0;
  const mistakes: QuizResult['mistakes'] = [];

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
