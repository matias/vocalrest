'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceName, HistoryItem } from '@/types';
import { VoiceSelector } from '@/components/VoiceSelector';
import { QuickPhrases } from '@/components/QuickPhrases';
import { History } from '@/components/History';
import { decode, decodeAudioData } from '@/services/audioUtils';
import { normalizeText, getCachedAudio, cacheAudio, getAllCachedEntries, clearCache } from '@/services/audioCache';

export default function Home() {
  // State
  const [inputText, setInputText] = useState('');
  // Set default to Orus
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Orus);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [debugLogs, setDebugLogs] = useState<Array<{ time: string; message: string; type: 'log' | 'error' | 'warn' }>>([]);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const debugLogRef = useRef<HTMLDivElement>(null);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Store original console methods
  const originalConsoleRef = useRef({
    log: console.log,
    error: console.error,
    warn: console.warn,
  });

  // Debug logging function
  const addDebugLog = useCallback((message: string, type: 'log' | 'error' | 'warn' = 'log') => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-49), { time, message, type }]); // Keep last 50 logs
  }, []);

  // Auto-scroll debug log to bottom
  useEffect(() => {
    if (debugLogRef.current) {
      debugLogRef.current.scrollTop = debugLogRef.current.scrollHeight;
    }
  }, [debugLogs]);

  // Intercept console messages for debug panel
  useEffect(() => {
    const originalLog = originalConsoleRef.current.log;
    const originalError = originalConsoleRef.current.error;
    const originalWarn = originalConsoleRef.current.warn;

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      addDebugLog(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '), 'log');
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      addDebugLog(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '), 'error');
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addDebugLog(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '), 'warn');
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [addDebugLog]);

  // Load persistence
  useEffect(() => {
    const savedVoice = localStorage.getItem('vocalrest_voice');
    // Ensure the saved voice is still valid in our (now strictly male) enum
    if (savedVoice && Object.values(VoiceName).includes(savedVoice as VoiceName)) {
      setSelectedVoice(savedVoice as VoiceName);
    }
    
    // Load history from IndexedDB
    const loadHistory = async () => {
      try {
        const cachedEntries = await getAllCachedEntries();
        const historyItems: HistoryItem[] = cachedEntries
          .slice(0, 30) // Keep last 30
          .map(entry => ({
            id: entry.timestamp.toString(),
            text: entry.originalText,
            timestamp: entry.timestamp,
          }));
        setHistory(historyItems);
      } catch (e) {
        console.error("Failed to load history from IndexedDB", e);
      }
    };
    
    loadHistory();
  }, []);

  // Save voice preference
  const handleVoiceSelect = (voice: VoiceName) => {
    setSelectedVoice(voice);
    localStorage.setItem('vocalrest_voice', voice);
  };

  // Add to history helper (history is now managed via IndexedDB)
  const addToHistory = async (text: string, base64Audio: string) => {
    const normalized = normalizeText(text);
    
    // Update history state
    setHistory(prev => {
      // Check if an entry with the same normalized text already exists
      const existingIndex = prev.findIndex(item => normalizeText(item.text) === normalized);
      
      let newHistory: HistoryItem[];
      const timestamp = Date.now();
      
      if (existingIndex !== -1) {
        // Move existing entry to top
        const existingItem = prev[existingIndex];
        const updatedItem = {
          ...existingItem,
          timestamp, // Update timestamp
        };
        newHistory = [
          updatedItem,
          ...prev.slice(0, existingIndex),
          ...prev.slice(existingIndex + 1)
        ];
      } else {
        // Add new entry
        const newItem: HistoryItem = {
          id: timestamp.toString(),
          text,
          timestamp,
        };
        newHistory = [newItem, ...prev].slice(0, 30); // Keep last 30
      }
      
      return newHistory;
    });
  };

  const handleClearHistory = async () => {
    setHistory([]);
    await clearCache();
  };

  // Stop current playback
  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Helper function to play audio from base64
  const playAudioFromBase64 = useCallback(async (base64Audio: string) => {
    // Initialize AudioContext if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000 // Match Gemini TTS typical sample rate
      });
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Decode Audio
    const audioBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);

    // Play Audio
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      setIsPlaying(false);
      sourceNodeRef.current = null;
    };

    sourceNodeRef.current = source;
    setIsPlaying(true);
    source.start();
  }, []);

  // Main Speak Function
  const speakText = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;
    
    // Stop any existing playback
    stopPlayback();
    setError(null);
    
    const normalized = normalizeText(textToSpeak);
    addDebugLog(`Speaking text, normalized: ${normalized}`);
    
    // Check cache first (only if IndexedDB is available)
    if (typeof indexedDB !== 'undefined') {
      try {
        const cached = await getCachedAudio(normalized);
        
        if (cached) {
          addDebugLog('✓ Cache HIT - Using cached audio');
          // Use cached audio
          setIsGenerating(false);
          await playAudioFromBase64(cached.base64Audio);
          
          // Update cache with new timestamp and potentially new originalText
          await cacheAudio(normalized, textToSpeak, cached.base64Audio, cached.voice);
          
          // Update history (move to top) - use the text that was actually typed
          await addToHistory(textToSpeak, cached.base64Audio);
          
          // Clear the input text
          setInputText('');
          return;
        } else {
          addDebugLog('✗ Cache MISS - Generating new audio');
        }
      } catch (error: any) {
        addDebugLog(`Error checking cache, will generate new audio: ${error.message}`, 'error');
        // Continue to generate new audio if cache check fails
      }
    } else {
      addDebugLog('IndexedDB not available, skipping cache check', 'warn');
    }

    // Not in cache, generate new audio
    setIsGenerating(true);

    try {
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000 // Match Gemini TTS typical sample rate
        });
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Call API route
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToSpeak,
          voice: selectedVoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const data = await response.json();
      const base64Audio = data.audio;
      
      addDebugLog('Audio generated, caching...');
      // Cache the audio
      await cacheAudio(normalized, textToSpeak, base64Audio, selectedVoice);
      addDebugLog('Audio cached successfully');
      
      // Play the audio
      await playAudioFromBase64(base64Audio);
      
      setIsGenerating(false);

      // Add to history
      await addToHistory(textToSpeak, base64Audio);
      
      // Clear the input text
      setInputText('');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate speech. Please try again.");
      setIsGenerating(false);
      setIsPlaying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    speakText(inputText);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Input Area */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What would you like to say?"
              className="w-full h-32 p-4 text-lg text-slate-100 placeholder:text-slate-400 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  speakText(inputText);
                }
              }}
            />
            
            {/* Action Bar */}
            <div className="mt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-sm font-medium text-slate-400 hover:text-slate-200 px-2 py-1"
                disabled={isGenerating || isPlaying}
              >
                Clear Text
              </button>

              <button
                type="submit"
                disabled={isGenerating || !inputText.trim()}
                className={`
                  flex items-center justify-center px-4 py-2 rounded-xl font-bold text-white transition-all transform active:scale-95
                  ${isGenerating 
                    ? 'bg-indigo-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'}
                `}
              >
                {isGenerating ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    Speak
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 text-red-300 text-sm rounded-lg border border-red-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Quick Phrases */}
        <QuickPhrases onPhraseClick={speakText} />

        {/* Voice Selection */}
        <VoiceSelector selectedVoice={selectedVoice} onSelect={handleVoiceSelect} />

        {/* History */}
        <History history={history} onHistoryItemClick={speakText} onClear={handleClearHistory} />
      
      </div>

      {/* Debug Log Panel */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t-2 border-slate-600 flex flex-col z-50"
        style={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1e293b',
          borderTop: '2px solid #475569',
          maxHeight: isDebugExpanded ? '12rem' : 'auto',
          zIndex: 9999
        }}
      >
        <div 
          className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-700 transition-colors"
          onClick={() => setIsDebugExpanded(!isDebugExpanded)}
          style={{ 
            cursor: 'pointer',
            borderBottom: isDebugExpanded ? '1px solid #334155' : 'none'
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 transition-transform ${isDebugExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: '#cbd5e1' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-300" style={{ color: '#cbd5e1', fontWeight: 600 }}>
              Debug Log {debugLogs.length > 0 && `(${debugLogs.length})`}
            </h3>
          </div>
          {isDebugExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDebugLogs([]);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
              style={{ color: '#94a3b8' }}
            >
              Clear
            </button>
          )}
        </div>
        {isDebugExpanded && (
          <div
            ref={debugLogRef}
            className="flex-1 overflow-y-auto px-4 py-2 text-xs font-mono space-y-1"
            style={{ 
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              fontFamily: 'monospace'
            }}
          >
            {debugLogs.length === 0 ? (
              <div className="text-slate-500" style={{ color: '#64748b' }}>No logs yet...</div>
            ) : (
              debugLogs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    color: log.type === 'error' ? '#f87171' : log.type === 'warn' ? '#fbbf24' : '#cbd5e1'
                  }}
                >
                  <span style={{ color: '#64748b' }}>[{log.time}]</span> {log.message}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

