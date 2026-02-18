/**
 * Vision API Routes
 * POST /api/vision/analyze - Upload image, OCR, and AI analysis
 * POST /api/vision/ocr - Extract text from image (OCR only)
 */

import { Router } from 'express';
import multer from 'multer';
import { analyzeImage, extractTextFromImage } from '../services/ai/vision.js';
import { getCurrentUser } from '../middleware/auth.js';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /api/vision/analyze
 * Upload image, perform OCR, and get AI analysis
 * 
 * Body (multipart/form-data):
 * - image: Image file
 * - prompt: Optional custom prompt for analysis
 * 
 * OR Body (JSON):
 * - imageUrl: URL to image
 * - imageBase64: Base64 encoded image
 * - prompt: Optional custom prompt
 */
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    // Get current user (optional - can work for guests too)
    const currentUser = await getCurrentUser(req, res);

    let imageData: string | Buffer;
    const prompt = req.body.prompt;

    // Handle file upload
    if (req.file) {
      imageData = req.file.buffer;
    } 
    // Handle JSON body with imageUrl or imageBase64
    else if (req.body.imageUrl) {
      imageData = req.body.imageUrl;
    } else if (req.body.imageBase64) {
      imageData = req.body.imageBase64;
    } else {
      return res.status(400).json({
        error: 'Missing image',
        message: 'Please provide an image file, imageUrl, or imageBase64',
      });
    }

    // Analyze image
    const result = await analyzeImage(imageData, prompt);

    res.json({
      success: true,
      result,
      userId: currentUser?.id,
    });
  } catch (error) {
    console.error('[Vision] Error analyzing image:', error);
    res.status(500).json({
      error: 'Failed to analyze image',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/vision/ocr
 * Extract text from image (OCR only, no AI analysis)
 * 
 * Body (multipart/form-data):
 * - image: Image file
 * 
 * OR Body (JSON):
 * - imageUrl: URL to image
 * - imageBase64: Base64 encoded image
 */
router.post('/ocr', upload.single('image'), async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);

    let imageData: string | Buffer;

    // Handle file upload
    if (req.file) {
      imageData = req.file.buffer;
    } 
    // Handle JSON body
    else if (req.body.imageUrl) {
      imageData = req.body.imageUrl;
    } else if (req.body.imageBase64) {
      imageData = req.body.imageBase64;
    } else {
      return res.status(400).json({
        error: 'Missing image',
        message: 'Please provide an image file, imageUrl, or imageBase64',
      });
    }

    // Extract text
    const text = await extractTextFromImage(imageData);

    res.json({
      success: true,
      text,
      userId: currentUser?.id,
    });
  } catch (error) {
    console.error('[Vision] Error extracting text:', error);
    res.status(500).json({
      error: 'Failed to extract text from image',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

