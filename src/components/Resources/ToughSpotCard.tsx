import { useState } from 'react';
import type { ToughSpot } from '../../types/index';

interface ToughSpotCardProps {
  toughSpot: ToughSpot;
}

export function ToughSpotCard({ toughSpot }: ToughSpotCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const frequencyColor = {
    'very common': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    common: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    occasional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };

  return (
    <div
      className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
            {toughSpot.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {toughSpot.problem}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 whitespace-nowrap ${frequencyColor[toughSpot.frequency]}`}>
          {toughSpot.frequency}
        </span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-2 text-sm">
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">💡 Explanation:</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {toughSpot.explanation}
            </p>
          </div>

          {toughSpot.relatedEquations.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">📐 Related Equations:</h4>
              <div className="flex flex-wrap gap-1">
                {toughSpot.relatedEquations.map((eq) => (
                  <span
                    key={eq}
                    className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                  >
                    {eq}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expand Indicator */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
        {isExpanded ? '▼' : '▶'}
      </div>
    </div>
  );
}
