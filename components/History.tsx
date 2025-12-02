import React from 'react';
import { HistoryItem } from '../types';

interface HistoryProps {
  history: HistoryItem[];
  onHistoryItemClick: (text: string) => void;
  onClear: () => void;
}

export const History: React.FC<HistoryProps> = ({ history, onHistoryItemClick, onClear }) => {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col space-y-3 mt-8 pt-6 border-t border-slate-700">
      <div className="flex justify-between items-end">
        <label className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
          Recent History
        </label>
        <button 
          onClick={onClear}
          className="text-xs text-red-400 hover:text-red-300 hover:underline"
        >
          Clear
        </button>
      </div>
      <div className="space-y-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onHistoryItemClick(item.text)}
            className="w-full text-left p-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm hover:bg-slate-700 hover:border-slate-600 hover:text-indigo-400 transition-all group flex items-center justify-between"
          >
            <span className="truncate mr-4">{item.text}</span>
            <span className="opacity-0 group-hover:opacity-100 text-indigo-400 text-xs font-semibold uppercase tracking-wider transition-opacity">
              Speak
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
