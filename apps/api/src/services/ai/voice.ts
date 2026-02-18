/**
 * AI Voice Service
 * Handles speech-to-text, text-to-speech, and translation
 */

import { callZhipuAI, type ZhipuMessage } from './zhipu.js';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
// For speech-to-text, we'll use a fallback service if Zhipu doesn't support it
// Options: Google Cloud Speech-to-Text, Whisper API, or Azure Speech Services
const SPEECH_TO_TEXT_API = process.env.SPEECH_TO_TEXT_API || 'zhipu'; // 'zhipu' | 'google' | 'whisper' | 'azure'
const GOOGLE_SPEECH_API_KEY = process.env.GOOGLE_SPEECH_API_KEY;
const WHISPER_API_KEY = process.env.WHISPER_API_KEY;
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

export interface TranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Convert speech to text
 * Supports: audio file buffer, base64 audio, or audio URL
 */
export async function speechToText(
  audioData: Buffer | string,
  language?: string
): Promise<TranscriptionResult> {
  try {
    if (SPEECH_TO_TEXT_API === 'google' && GOOGLE_SPEECH_API_KEY) {
      return await transcribeWithGoogle(audioData, language);
    } else if (SPEECH_TO_TEXT_API === 'whisper' && WHISPER_API_KEY) {
      return await transcribeWithWhisper(audioData, language);
    } else if (SPEECH_TO_TEXT_API === 'azure' && AZURE_SPEECH_KEY) {
      return await transcribeWithAzure(audioData, language);
    } else {
      // Fallback: Use Zhipu AI with audio description (if Zhipu doesn't support audio directly)
      // Or use a simple mock for development
      return await transcribeWithZhipu(audioData, language);
    }
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    throw error;
  }
}

/**
 * Transcribe using Google Cloud Speech-to-Text
 */
async function transcribeWithGoogle(
  audioData: Buffer | string,
  language?: string
): Promise<TranscriptionResult> {
  // Convert to base64 if needed
  let audioBase64: string;
  if (Buffer.isBuffer(audioData)) {
    audioBase64 = audioData.toString('base64');
  } else if (audioData.startsWith('data:audio')) {
    audioBase64 = audioData.split(',')[1];
  } else {
    audioBase64 = audioData;
  }

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          encoding: 'WEBM_OPUS', // Adjust based on actual format
          sampleRateHertz: 16000,
          languageCode: language || 'en-US',
        },
        audio: {
          content: audioBase64,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Speech API error: ${response.status}`);
  }

    const data = await response.json() as any;
    const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || '';

    return {
      text: transcript,
      language: language || 'en-US',
      confidence: data.results?.[0]?.alternatives?.[0]?.confidence,
    };
}

/**
 * Transcribe using OpenAI Whisper API
 */
async function transcribeWithWhisper(
  audioData: Buffer | string,
  language?: string
): Promise<TranscriptionResult> {
  // Convert to buffer if needed
  let audioBuffer: Buffer;
  if (Buffer.isBuffer(audioData)) {
    audioBuffer = audioData;
  } else if (audioData.startsWith('data:audio')) {
    const base64 = audioData.split(',')[1];
    audioBuffer = Buffer.from(base64, 'base64');
  } else {
    // Assume URL - fetch it
    const response = await fetch(audioData);
    audioBuffer = Buffer.from(await response.arrayBuffer());
  }

  // Use multipart/form-data for Whisper API
  const FormData = (await import('form-data')).default;
  const formData = new FormData();
  formData.append('file', audioBuffer, {
    filename: 'audio.webm',
    contentType: 'audio/webm',
  });
  formData.append('model', 'whisper-1');
  if (language) {
    formData.append('language', language);
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHISPER_API_KEY}`,
      ...formData.getHeaders(),
    },
    body: formData as any,
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status}`);
  }

    const data = await response.json() as any;
    return {
      text: data.text || '',
      language: data.language || language || 'en',
    };
}

/**
 * Transcribe using Azure Speech Services
 */
async function transcribeWithAzure(
  audioData: Buffer | string,
  language?: string
): Promise<TranscriptionResult> {
  // Azure Speech Services implementation
  // This is a placeholder - full implementation would require Azure SDK
  throw new Error('Azure Speech Services not yet implemented');
}

/**
 * Transcribe using Zhipu AI (fallback - describes audio if direct audio not supported)
 */
async function transcribeWithZhipu(
  audioData: Buffer | string,
  language?: string
): Promise<TranscriptionResult> {
  // If Zhipu doesn't support audio directly, we can describe the audio
  // For now, return a mock response indicating audio processing is needed
  // In production, you'd want to use a dedicated speech-to-text service
  
  if (!ZHIPU_API_KEY) {
    throw new Error('ZHIPU_API_KEY not configured and no speech-to-text service available');
  }

  // Mock response for development
  // In production, integrate with a real speech-to-text service
  return {
    text: '[Audio transcription requires a speech-to-text service. Please configure GOOGLE_SPEECH_API_KEY, WHISPER_API_KEY, or AZURE_SPEECH_KEY]',
    language: language || 'en',
    confidence: 0.0,
  };
}

/**
 * Translate text to another language
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> {
  if (!ZHIPU_API_KEY) {
    throw new Error('ZHIPU_API_KEY not configured');
  }

  const messages: ZhipuMessage[] = [
    {
      role: 'system',
      content: `You are a translation assistant. Translate the user's text to ${targetLanguage}. Return only the translated text, no explanations.`,
    },
    {
      role: 'user',
      content: `Translate this text to ${targetLanguage}${sourceLanguage ? ` (from ${sourceLanguage})` : ''}: ${text}`,
    },
  ];

  const translatedText = await callZhipuAI(messages);

  return {
    translatedText: translatedText.trim(),
    sourceLanguage: sourceLanguage || 'auto',
    targetLanguage,
  };
}

/**
 * Convert text to speech (for voice responses)
 * Returns audio data as base64 or URL
 */
export async function textToSpeech(
  text: string,
  language: string = 'en',
  voice?: string
): Promise<{ audioData: string; format: string }> {
  // For text-to-speech, we can use:
  // 1. Google Cloud Text-to-Speech
  // 2. Azure Cognitive Services Speech
  // 3. Amazon Polly
  // 4. ElevenLabs
  
  // Placeholder - in production, integrate with a TTS service
  throw new Error('Text-to-speech not yet implemented. Please configure a TTS service.');
}

