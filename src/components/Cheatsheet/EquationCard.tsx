import { useState } from 'react';
import type { Equation } from '../../types/index';

interface EquationCardProps {
  equation: Equation;
}

export function EquationCard({ equation }: EquationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const difficultyColor = {
    basic: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-start justify-between gap-2"
      >
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
            {equation.name}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
            {equation.description}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${difficultyColor[equation.difficulty]}`}>
          {equation.difficulty}
        </span>
      </div>

      {/* Formula Display */}
      <div className="mt-3 p-2 bg-white dark:bg-slate-600 rounded border border-slate-200 dark:border-slate-500 font-mono text-xs text-slate-700 dark:text-slate-200 overflow-x-auto">
        <code>${equation.formula}$</code>
      </div>

      {/* Copy Button */}
      <button
        onClick={() => copyToClipboard(equation.formula)}
        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
      >
        📋 Copy Formula
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-2 text-sm">
          {/* Variables */}
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Variables:</h4>
            <div className="space-y-1 text-xs">
              {equation.variables.map((v, i) => (
                <div key={i} className="text-slate-600 dark:text-slate-400">
                  <span className="font-mono text-blue-600 dark:text-blue-400">{v.symbol}</span> = {v.meaning}
                  {v.units && ` (${v.units})`}
                </div>
              ))}
            </div>
          </div>

          {/* Example */}
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Example:</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {equation.example.explanation}
            </p>
            <p className="text-xs font-mono text-green-700 dark:text-green-400 mt-1">
              Answer: {equation.example.solution}
            </p>
          </div>

          {/* Tip */}
          {equation.mnemonicOrTip && (
            <div className="bg-blue-50 dark:bg-blue-900 p-2 rounded">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <span className="font-semibold">💡 Tip:</span> {equation.mnemonicOrTip}
              </p>
            </div>
          )}

          {/* Common Mistakes */}
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">⚠️ Common Mistakes:</h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {equation.commonMistakes.map((mistake, i) => (
                <li key={i}>{mistake}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Expand Indicator */}
      <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        {isExpanded ? '▼ Less' : '▶ More'}
      </div>
    </div>
  );
}
