import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from '@/types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice } = body;

    if (!text || !voice) {
      return NextResponse.json(
        { error: 'Text and voice are required' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API Key is missing on server' },
        { status: 500 }
      );
    }

    // Validate voice is a valid VoiceName
    if (!Object.values(VoiceName).includes(voice as VoiceName)) {
      return NextResponse.json(
        { error: 'Invalid voice name' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: 'No audio data received from Gemini API' },
        { status: 500 }
      );
    }

    return NextResponse.json({ audio: base64Audio });
  } catch (error: any) {
    console.error('Error generating speech:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate speech' },
      { status: 500 }
    );
  }
}

