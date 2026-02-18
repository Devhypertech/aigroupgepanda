/**
 * AI Vision Service
 * Handles image upload, OCR, and AI analysis
 */

import { callZhipuAI, type ZhipuMessage } from './zhipu.js';

const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const ZHIPU_VISION_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

export interface VisionAnalysisResult {
  ocrText?: string;
  analysis: string;
  insights?: string[];
  extractedData?: Record<string, any>;
}

/**
 * Analyze image with OCR and AI
 * Supports: base64 images, image URLs, or file buffers
 */
export async function analyzeImage(
  imageData: string | Buffer,
  prompt?: string
): Promise<VisionAnalysisResult> {
  if (!ZHIPU_API_KEY) {
    throw new Error('ZHIPU_API_KEY not configured');
  }

  try {
    // Convert image to base64 if it's a buffer
    let imageBase64: string;
    if (Buffer.isBuffer(imageData)) {
      imageBase64 = imageData.toString('base64');
    } else if (imageData.startsWith('data:image')) {
      // Extract base64 from data URL
      imageBase64 = imageData.split(',')[1];
    } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      // Fetch image from URL and convert to base64
      const response = await fetch(imageData);
      const buffer = Buffer.from(await response.arrayBuffer());
      imageBase64 = buffer.toString('base64');
    } else {
      // Assume it's already base64
      imageBase64 = imageData;
    }

    // Build messages for Zhipu Vision API
    const messages: any[] = [
      {
        role: 'system',
        content: prompt || `You are a helpful travel assistant. Analyze this image and provide:
1. Extract all text from the image (OCR)
2. Identify what type of document or image this is (passport, visa, ticket, receipt, etc.)
3. Provide key insights and information
4. If it's a travel document, extract relevant details (dates, locations, names, etc.)
5. Provide actionable recommendations based on the content

Return your response as JSON with:
- ocrText: All extracted text
- documentType: Type of document
- extractedData: Key-value pairs of extracted information
- insights: Array of insights
- analysis: Overall analysis`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt || 'Please analyze this image and extract all relevant information.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      },
    ];

    // Call Zhipu Vision API (GLM-4V model supports vision)
    const response = await fetch(ZHIPU_VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4v-9b', // Zhipu's vision model
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zhipu Vision API error:', response.status, errorText);
      throw new Error(`Zhipu Vision API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const aiResponse = data.choices?.[0]?.message?.content || 'Could not analyze image.';

    // Try to parse JSON response
    try {
      // Extract JSON from response (might be wrapped in markdown)
      let jsonString = aiResponse.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(jsonString);
      return {
        ocrText: parsed.ocrText || '',
        analysis: parsed.analysis || aiResponse,
        insights: parsed.insights || [],
        extractedData: parsed.extractedData || {},
      };
    } catch {
      // If not JSON, return as plain analysis
      return {
        analysis: aiResponse,
        insights: [],
        extractedData: {},
      };
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

/**
 * Extract text from image (OCR only, no AI analysis)
 */
export async function extractTextFromImage(imageData: string | Buffer): Promise<string> {
  const result = await analyzeImage(imageData, 'Extract all text from this image. Return only the extracted text, no analysis.');
  return result.ocrText || result.analysis;
}

