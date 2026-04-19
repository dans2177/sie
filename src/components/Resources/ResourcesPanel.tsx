import { useState } from 'react';
import type { ResourcesPanelProps } from '../../types/index';
import { toughSpots } from '../../lib/content/sieContent';
import { ToughSpotCard } from './ToughSpotCard';

export function ResourcesPanel({ userStats, toughSpots: providedToughSpots }: ResourcesPanelProps) {
  const [activeTab, setActiveTab] = useState<'tough' | 'tips' | 'progress'>('tough');
  const spotsToShow = providedToughSpots.length > 0 ? providedToughSpots : toughSpots;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-600 px-4 pt-3">
        <button
          onClick={() => setActiveTab('tough')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'tough'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          🎯 Tough Spots
        </button>
        <button
          onClick={() => setActiveTab('tips')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'tips'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          💡 Tips
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'progress'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          📊 Progress
        </button>
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
            <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">📈 Session Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Questions Asked:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {userStats.questionsAsked}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Topics Studied:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {Object.keys(userStats.topicsStudied).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Difficult Topics:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {userStats.difficultTopics.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Mastered:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {userStats.mastered.length}
                  </span>
                </div>
              </div>
            </div>

            {userStats.difficultTopics.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  Focus Areas (Needs Review)
                </h4>
                <div className="space-y-1 text-sm text-red-800 dark:text-red-200">
                  {userStats.difficultTopics.map((topic) => (
                    <div key={topic} className="flex items-center">
                      <span className="text-lg mr-2">📍</span>
                      {topic}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userStats.mastered.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  ✨ Mastered Topics
                </h4>
                <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                  {userStats.mastered.map((topic) => (
                    <div key={topic} className="flex items-center">
                      <span className="text-lg mr-2">✅</span>
                      {topic}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
