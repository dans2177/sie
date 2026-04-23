import { useState, useEffect } from 'react';
import type { ResourcesPanelProps } from '../../types/index';
import { toughSpots } from '../../lib/content/sieContent';
import { ToughSpotCard } from './ToughSpotCard';

interface QuizRecord {
  id: string;
  date: number;
  score: number;
  total: number;
  topicsFailed: string[];
}

interface StoredData {
  quizHistory?: QuizRecord[];
  progress?: Record<string, { attempts: number; correct: number; lastReview: number }>;
}

function loadStoredData(): StoredData {
  try {
    const raw = localStorage.getItem('sie-tutor-data');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function ResourcesPanel({ userStats, toughSpots: providedToughSpots }: ResourcesPanelProps) {
  const [activeTab, setActiveTab] = useState<'tough' | 'tips' | 'progress'>('tough');
  const [quizHistory, setQuizHistory] = useState<QuizRecord[]>([]);
  const [topicStats, setTopicStats] = useState<Record<string, { attempts: number; correct: number }>>({});
  const spotsToShow = providedToughSpots.length > 0 ? providedToughSpots : toughSpots;

  useEffect(() => {
    const data = loadStoredData();
    setQuizHistory(data.quizHistory ?? []);
    setTopicStats(data.progress ?? {});
  }, []);

  // Refresh when switching to progress tab
  const handleTabClick = (tab: 'tough' | 'tips' | 'progress') => {
    if (tab === 'progress') {
      const data = loadStoredData();
      setQuizHistory(data.quizHistory ?? []);
      setTopicStats(data.progress ?? {});
    }
    setActiveTab(tab);
  };

  const totalQuizzes = quizHistory.length;
  const overallScore = totalQuizzes > 0
    ? Math.round(quizHistory.reduce((sum, q) => sum + (q.score / q.total) * 100, 0) / totalQuizzes)
    : null;

  const failCounts: Record<string, number> = {};
  quizHistory.forEach((q) => {
    q.topicsFailed.forEach((t) => {
      failCounts[t] = (failCounts[t] ?? 0) + 1;
    });
  });
  const weakTopics = Object.entries(failCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t);

  const masteredTopics = Object.entries(topicStats)
    .filter(([, s]) => s.attempts >= 5 && s.correct / s.attempts >= 0.8)
    .map(([t]) => t);

  const recentQuizzes = quizHistory.slice(-5).reverse();

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-600 px-4 pt-3">
        {(['tough', 'tips', 'progress'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            {tab === 'tough' ? '🎯 Tough Spots' : tab === 'tips' ? '💡 Tips' : '📊 Progress'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'tough' && (
          <div className="space-y-3">
            {spotsToShow.slice(0, 5).map((spot) => (
              <ToughSpotCard key={spot.id} toughSpot={spot} />
            ))}
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">✅ Study Tips</h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>• Focus on the tough spots first - they're commonly tested</li>
                <li>• Learn the "why" behind formulas, not just how to use them</li>
                <li>• Practice with real exam-style questions</li>
                <li>• Create your own examples and mnemonics</li>
                <li>• Review concepts before taking practice exams</li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">⚠️ Common Pitfalls</h3>
              <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                <li>• Confusing YTM with coupon rate</li>
                <li>• Forgetting about compound interest frequency</li>
                <li>• Mixing up call vs put option mechanics</li>
                <li>• Not understanding fiduciary vs suitability</li>
                <li>• Overlooking reinvestment rate assumptions</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🎓 Study Strategy</h3>
              <ol className="space-y-2 text-sm text-green-800 dark:text-green-200 list-decimal list-inside">
                <li>Master equations and their variables</li>
                <li>Understand regulations and ethics rules</li>
                <li>Learn market structure and products</li>
                <li>Practice with realistic scenarios</li>
                <li>Take full-length practice exams</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-3">
            {/* Session stats */}
            <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">📈 Session Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Questions Asked:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{userStats.questionsAsked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Quizzes Taken:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{totalQuizzes}</span>
                </div>
                {overallScore !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Avg Quiz Score:</span>
                    <span className={`font-bold ${overallScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {overallScore}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent quizzes */}
            {recentQuizzes.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">🕒 Recent Quizzes</h4>
                <div className="space-y-2">
                  {recentQuizzes.map((q) => {
                    const pct = Math.round((q.score / q.total) * 100);
                    return (
                      <div key={q.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {new Date(q.date).toLocaleDateString()}
                        </span>
                        <span className={`font-bold ${pct >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {q.score}/{q.total} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weak topics */}
            {weakTopics.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">📍 Focus Areas</h4>
                <div className="space-y-1 text-sm text-red-800 dark:text-red-200">
                  {weakTopics.map((topic) => (
                    <div key={topic} className="flex items-center gap-2">
                      <span>⚠️</span>
                      <span className="capitalize">{topic.replace('_', ' ')}</span>
                      <span className="text-xs text-red-600 dark:text-red-400">
                        ({failCounts[topic]} missed)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mastered topics */}
            {masteredTopics.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">✨ Mastered</h4>
                <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                  {masteredTopics.map((topic) => (
                    <div key={topic} className="flex items-center gap-2">
                      <span>✅</span>
                      <span className="capitalize">{topic.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalQuizzes === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                <p className="text-3xl mb-2">🎯</p>
                <p>Take a quiz to start tracking your progress!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
