import React from 'react';
import { QUICK_PHRASES } from '../constants';

interface QuickPhrasesProps {
  onPhraseClick: (text: string) => void;
}

export const QuickPhrases: React.FC<QuickPhrasesProps> = ({ onPhraseClick }) => {
  return (
    <div className="flex flex-col space-y-3">
      <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
        Quick Phrases
      </label>
      <div className="flex flex-wrap gap-2">
        {QUICK_PHRASES.map((phrase, index) => (
          <button
            key={index}
            onClick={() => onPhraseClick(phrase)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-slate-200 text-sm font-medium hover:bg-slate-700 hover:border-slate-600 hover:text-indigo-400 transition-colors shadow-sm active:scale-95"
          >
            {phrase}
          </button>
        ))}
      </div>
    </div>
  );
};
