import { useEffect } from 'react';
import { useStore } from '../store';
import { Suggestion } from '../types';

const typeIcons: Record<Suggestion['type'], string> = {
  swap: '🔄',
  balance: '⚖️',
  cluster: '📍',
};

export default function SuggestionPanel() {
  const { suggestions, dismissSuggestion, refreshSuggestions, updateVisit, setView } = useStore();

  useEffect(() => {
    refreshSuggestions();
  }, []);

  const handleAccept = (suggestion: Suggestion) => {
    if (suggestion.targetDate) {
      suggestion.visitIds.forEach((id) => {
        const updates: Record<string, string> = { date: suggestion.targetDate! };
        if (suggestion.targetTimeBlock) updates.timeBlock = suggestion.targetTimeBlock;
        updateVisit(id, updates);
      });
    } else if (suggestion.targetTimeBlock) {
      suggestion.visitIds.forEach((id) => {
        updateVisit(id, { timeBlock: suggestion.targetTimeBlock! });
      });
    }
    dismissSuggestion(suggestion.id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setView('week')} className="text-blue-600 text-xs">
          ← Back
        </button>
        <h1 className="text-lg font-bold text-gray-800">Suggestions</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <span className="text-3xl mb-2">✓</span>
            <p className="text-sm">No suggestions right now.</p>
            <p className="text-xs mt-1">Your schedule looks great!</p>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl flex-shrink-0">{typeIcons[suggestion.type]}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800 capitalize mb-0.5">
                    {suggestion.type} suggestion
                  </div>
                  <div className="text-sm text-gray-600">{suggestion.message}</div>
                  {suggestion.estimatedSavingMinutes && (
                    <div className="text-xs text-green-600 mt-1 font-medium">
                      ⏱ Save ~{suggestion.estimatedSavingMinutes} min
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(suggestion)}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold"
                >
                  Accept
                </button>
                <button
                  onClick={() => dismissSuggestion(suggestion.id)}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-sm font-semibold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
