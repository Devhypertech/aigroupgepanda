/**
 * Voice API Routes
 * POST /api/voice/transcribe - Upload voice, convert to text
 * POST /api/voice/translate - Translate text to another language
 * POST /api/voice/speak - Convert text to speech (future)
 */

import { Router } from 'express';
import multer from 'multer';
import { speechToText, translateText } from '../services/ai/voice.js';
import { getCurrentUser } from '../middleware/auth.js';

const router = Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || 
        file.mimetype === 'audio/webm' ||
        file.mimetype === 'audio/mpeg' ||
        file.mimetype === 'audio/wav' ||
        file.mimetype === 'audio/mp4') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

/**
 * POST /api/voice/transcribe
 * Upload voice/audio file and convert to text (speech-to-text)
 * 
 * Body (multipart/form-data):
 * - audio: Audio file
 * - language: Optional language code (e.g., 'en-US', 'zh-CN')
 * 
 * OR Body (JSON):
 * - audioUrl: URL to audio file
 * - audioBase64: Base64 encoded audio
 * - language: Optional language code
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const language = req.body.language;

    let audioData: Buffer | string;

    // Handle file upload
    if (req.file) {
      audioData = req.file.buffer;
    } 
    // Handle JSON body
    else if (req.body.audioUrl) {
      audioData = req.body.audioUrl;
    } else if (req.body.audioBase64) {
      audioData = Buffer.from(req.body.audioBase64, 'base64');
    } else {
      return res.status(400).json({
        error: 'Missing audio',
        message: 'Please provide an audio file, audioUrl, or audioBase64',
      });
    }

    // Transcribe audio
    const result = await speechToText(audioData, language);

    res.json({
      success: true,
      transcription: result,
      userId: currentUser?.id,
    });
  } catch (error) {
    console.error('[Voice] Error transcribing audio:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/voice/translate
 * Translate text to another language
 * 
 * Body (JSON):
 * - text: Text to translate
 * - targetLanguage: Target language code (e.g., 'en', 'zh', 'es', 'fr')
 * - sourceLanguage: Optional source language code (auto-detect if not provided)
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Missing text',
        message: 'Please provide text to translate',
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        error: 'Missing targetLanguage',
        message: 'Please provide target language code (e.g., "en", "zh", "es")',
      });
    }

    // Translate text
    const result = await translateText(text, targetLanguage, sourceLanguage);

    res.json({
      success: true,
      translation: result,
    });
  } catch (error) {
    console.error('[Voice] Error translating text:', error);
    res.status(500).json({
      error: 'Failed to translate text',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/voice/speak
 * Convert text to speech (future implementation)
 * 
 * Body (JSON):
 * - text: Text to convert to speech
 * - language: Language code (e.g., 'en-US', 'zh-CN')
 * - voice: Optional voice name
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, language, voice } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Missing text',
        message: 'Please provide text to convert to speech',
      });
    }

    // TODO: Implement text-to-speech
    res.status(501).json({
      error: 'Not implemented',
      message: 'Text-to-speech is not yet implemented. Please configure a TTS service.',
    });
  } catch (error) {
    console.error('[Voice] Error converting text to speech:', error);
    res.status(500).json({
      error: 'Failed to convert text to speech',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

