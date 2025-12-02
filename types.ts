export enum VoiceName {
  Orus = 'Orus',
  Umbriel = 'Umbriel',
  Algenib = 'Algenib',
  Sadaltager = 'Sadaltager',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Puck = 'Puck',
}

export interface VoiceOption {
  id: VoiceName;
  name: string;
  description: string;
  gender: 'Male' | 'Female' | 'Neutral';
}

export interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
}