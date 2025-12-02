import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates speech from text using the Gemini 2.5 Flash TTS model.
 * Returns the base64 encoded audio string.
 */
export async function generateSpeech(text: string, voice: VoiceName): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }

  try {
    // Prepend instruction to speed up the voice
    const textWithInstruction = 
      `Read the following text in a faster and slightly deeper voice than normal. Use downwards inflection at the end of each sentence: ${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: textWithInstruction }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data received from Gemini API.");
    }

    return base64Audio;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
}