import { VoiceName, VoiceOption } from './types';

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: VoiceName.Orus,
    name: 'Orus',
    description: 'Default voice option.',
    gender: 'Male',
  },
  {
    id: VoiceName.Umbriel,
    name: 'Umbriel',
    description: 'Deep, calm, male tone. Natural and composed.',
    gender: 'Male',
  },
  {
    id: VoiceName.Algenib,
    name: 'Algenib',
    description: 'Resonant, clear, professional male voice.',
    gender: 'Male',
  },
  {
    id: VoiceName.Sadaltager,
    name: 'Sadaltager',
    description: 'Steady, authoritative conversation. Clear articulation.',
    gender: 'Male',
  },
  {
    id: VoiceName.Charon,
    name: 'Charon',
    description: 'Deeper, resonant voice. Authoritative yet calm.',
    gender: 'Male',
  },
  {
    id: VoiceName.Fenrir,
    name: 'Fenrir',
    description: 'Energetic and crisp. Good for louder environments.',
    gender: 'Male',
  },
  {
    id: VoiceName.Puck,
    name: 'Puck',
    description: 'Soft, mid-range tone. Good for casual conversation.',
    gender: 'Male',
  },
];

export const QUICK_PHRASES = [
  "Thank you.",
  "Yes, please.",
  "No, thanks.",
  "Hi! I have laryngitis and shouldn't really talk.",
  "Could you repeat that?",
  "Just a sec.",
  "I made this app to talk for me :)",
];