import { useState } from 'react';
import { generateQuizQuestions, scoringQuiz } from '../../lib/api/quizGenerator';
import { addQuizResult, updateProgress } from '../../lib/storage/blobStorage';
import type { QuizQuestion } from '../../lib/api/quizGenerator';

interface QuizModeProps {
  onBackToStudy: () => void;
}

export function QuizMode({ onBackToStudy }: QuizModeProps) {
  const [stage, setStage] = useState<'setup' | 'loading' | 'quiz' | 'results'>('setup');
  const [selectedTopic, setSelectedTopic] = useState('bonds');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'basic' | 'intermediate' | 'advanced'>('intermediate');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const topics = [
    'bonds',
    'npv_irr',
    'yields',
    'options',
    'regulations',
    'ethics',
    'market_structure',
    'derivatives',
  ];

  const startQuiz = async () => {
    setStage('loading');
    setError('');
    try {
      const q = await generateQuizQuestions(selectedTopic, selectedDifficulty, 10);
      setQuestions(q);
      setAnswers(new Array(q.length).fill(-1));
      setCurrentQuestion(0);
      setStage('quiz');
    } catch (err) {
      setError('Failed to generate quiz. Try again.');
      setStage('setup');
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishQuiz();
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const finishQuiz = async () => {
    const scoring = await scoringQuiz(questions, answers);
    setResults(scoring);

    const failedTopics = scoring.mistakes.map((m) => m.question.topic);
    await addQuizResult(scoring.score, scoring.total, failedTopics);

    // Track per-question topic progress
    for (let i = 0; i < questions.length; i++) {
      await updateProgress(questions[i].topic, answers[i] === questions[i].correctAnswer);
    }

    setStage('results');
  };

  if (stage === 'setup') {
    return (
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">🎯 Quiz Mode</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Test your knowledge with AI-generated questions</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['basic', 'intermediate', 'advanced'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setSelectedDifficulty(level)}
                    className={`py-2 px-4 rounded-lg font-medium transition-all ${
                      selectedDifficulty === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg text-sm">{error}</div>}

            <button
              onClick={startQuiz}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg"
            >
              Start Quiz (10 Questions)
            </button>

            <button
              onClick={onBackToStudy}
              className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-medium py-2 px-6 rounded-lg transition-all"
            >
              Back to Study
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'loading') {
    return (
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
            <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Generating quiz...</p>
        </div>
      </div>
    );
  }

  if (stage === 'quiz') {
    const q = questions[currentQuestion];
    return (
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-300 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-full mb-3">
                {q.topic.replace('_', ' ').toUpperCase()} • {q.difficulty}
              </span>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-3">{q.question}</h3>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-8">
              {q.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`w-full p-4 text-left rounded-lg border-2 font-medium transition-all ${
                    answers[currentQuestion] === i
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-slate-900 dark:text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:border-blue-400'
                  }`}
                >
                  <span className="font-bold text-blue-600 dark:text-blue-400 mr-3">{String.fromCharCode(65 + i)}</span>
                  {option}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-900 dark:text-slate-100 font-bold rounded-lg transition-all"
              >
                ← Previous
              </button>
              <button
                onClick={nextQuestion}
                disabled={answers[currentQuestion] === -1}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-bold rounded-lg transition-all"
              >
                {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'results') {
    return (
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
            {/* Score */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-4">
                <span className="text-4xl font-bold text-white">{results.percentage}%</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Quiz Complete! 🎉</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                You got <span className="font-bold text-blue-600 dark:text-blue-400">{results.score}</span> out of{' '}
                <span className="font-bold text-blue-600 dark:text-blue-400">{results.total}</span> questions correct
              </p>
            </div>

            {/* Score Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 mb-8">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Correct Answers</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{results.score}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Incorrect Answers</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{results.total - results.score}</p>
                </div>
              </div>
            </div>

            {/* Mistakes */}
            {results.mistakes.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Review Mistakes</h3>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {results.mistakes.map((m: any, i: number) => (
                    <div key={i} className="bg-red-50 dark:bg-red-900 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="font-semibold text-slate-900 dark:text-white mb-3">{m.question.question}</p>
                      <div className="space-y-1 mb-3">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          ❌ Your answer: <span className="font-medium">{m.question.options[m.userAnswer] ?? 'Not answered'}</span>
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          ✅ Correct: <span className="font-medium">{m.question.options[m.question.correctAnswer]}</span>
                        </p>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 border-t border-red-200 dark:border-red-700 pt-2">
                        📝 {m.question.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStage('setup')}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
              >
                Take Another Quiz
              </button>
              <button
                onClick={onBackToStudy}
                className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-bold rounded-lg transition-all"
              >
                Back to Study
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
