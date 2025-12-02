import { VoiceName } from "../types";

/**
 * Generates speech from text using the Gemini 2.5 Flash TTS model via API route.
 * Returns the base64 encoded audio string.
 */
export async function generateSpeech(text: string, voice: VoiceName): Promise<string> {
  const response = await fetch('/api/generate-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate speech');
  }

  const data = await response.json();
  return data.audio;
}