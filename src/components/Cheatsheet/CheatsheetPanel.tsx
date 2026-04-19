import { useMemo } from 'react';
import { equations } from '../../lib/content/sieContent';
import type { CheatsheetProps } from '../../types/index';
import { EquationCard } from './EquationCard';

export function CheatsheetPanel({ searchQuery, selectedCategory }: CheatsheetProps) {
  const filteredEquations = useMemo(() => {
    return equations.filter((eq) => {
      const matchesSearch =
        !searchQuery ||
        eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || eq.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const categories = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'bonds', label: 'Bonds', icon: '💰' },
    { id: 'npv_irr', label: 'NPV/IRR', icon: '📊' },
    { id: 'yields', label: 'Yields', icon: '📈' },
    { id: 'options', label: 'Options', icon: '📉' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="px-4 py-3 border-b space-y-2 flex-shrink-0">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Categories</div>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`py-2 px-3 rounded text-sm font-medium transition-colors text-center ${
                selectedCategory === cat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
              onClick={() => {
                // This will need to be connected to parent state
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
        {filteredEquations.length} equation{filteredEquations.length !== 1 ? 's' : ''}
      </div>

      {/* Scrollable Equations List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-3">
          {filteredEquations.length > 0 ? (
            filteredEquations.map((eq) => <EquationCard key={eq.id} equation={eq} />)
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No equations match your search
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
