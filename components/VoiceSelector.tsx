import React, { useState } from 'react';
import { AVAILABLE_VOICES } from '../constants';
import { VoiceName } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between text-sm font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-300 transition-colors"
      >
        <span>Choose Your Voice</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AVAILABLE_VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => onSelect(voice.id)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                ${selectedVoice === voice.id 
                  ? 'border-indigo-500 bg-indigo-900/30 shadow-md' 
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-700'}
              `}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-bold ${selectedVoice === voice.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                  {voice.name}
                </span>
              </div>
              <p className={`text-sm ${selectedVoice === voice.id ? 'text-indigo-400' : 'text-slate-400'}`}>
                {voice.description}
              </p>
              
              {/* Selection indicator */}
              {selectedVoice === voice.id && (
                <div className="absolute top-4 right-4 h-3 w-3 bg-indigo-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
