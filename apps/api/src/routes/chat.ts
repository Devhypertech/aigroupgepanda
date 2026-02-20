/**
 * Chat API Routes
 * POST /api/chat/respond - Get AI response with optional UI spec
 * POST /api/chat/ui/event - Handle UI interaction events
 */

import { Router } from 'express';
import { z } from 'zod';
import { UiSpecSchema, type UiSpec } from '@gepanda/shared';
import { generateChatResponse, shouldActivateUIMode } from '../chat/respond.js';
import { streamServerClient, AI_COMPANION_USER_ID } from '../services/stream/streamClient.js';
import { detectIntent, routeToAgent } from '../services/aiRouter.js';
import { extractProductQuery } from '../services/productSearch.js';
import { searchProducts } from '../services/productSearch/index.js';
import { createCheckoutLink } from '../services/crossmint.js';
import { searchHotels, searchFlights } from '../services/travel/travelpayouts.js';
import { saveChatMessage, getChatHistory } from '../services/chatHistory.js';
import { saveProductContext, findProductById } from '../services/productContext.js';
import { searchProducts as shopSearchProducts } from '../services/shop/searchProducts.js';
import { searchHotels as searchHotelsService, type SearchHotelsOptions } from '../services/hotels/searchHotels.js';
import { generateAssistantReply } from '../services/ai/respond.js';

const router = Router();

/** Extract product information from conversation messages */
function extractProductInfoFromMessages(allMessages: string, currentMessage: string): {
  productUrl?: string;
  productId?: string;
  productTitle?: string;
  price?: number;
  image?: string;
  quantity?: number;
  currency?: string;
  shippingCountry?: string;
} {
  const info: {
    productUrl?: string;
    productId?: string;
    productTitle?: string;
    price?: number;
    image?: string;
    quantity?: number;
    currency?: string;
    shippingCountry?: string;
  } = {};

  // Extract URL (product link)
  const urlPattern = /(https?:\/\/[^\s\)]+|www\.[^\s\)]+)/gi;
  const urlMatch = allMessages.match(urlPattern);
  if (urlMatch && urlMatch.length > 0) {
    info.productUrl = urlMatch[urlMatch.length - 1]; // Use last URL found
    if (!info.productUrl.startsWith('http')) {
      info.productUrl = `https://${info.productUrl}`;
    }
  }

  // Extract product title (look for product names, model numbers, etc.)
  // Common patterns: "Amazfit Active 2", "iPhone 15 Pro", "Product Name - Description"
  const titlePatterns = [
    /([A-Z][a-zA-Z0-9\s&]+(?:\s+(?:Pro|Max|Plus|Active|Sport|Premium|Deluxe|Standard))?)/g,
    /([A-Z][a-zA-Z0-9\s&]+(?:\s+\d+[a-zA-Z]*)?)/g,
  ];
  
  for (const pattern of titlePatterns) {
    const matches = allMessages.match(pattern);
    if (matches && matches.length > 0) {
      // Filter out common false positives
      const validTitle = matches.find(m => 
        m.length > 5 && 
        m.length < 100 && 
        !m.includes('http') && 
        !m.match(/^(USD|EUR|GBP|CAD)$/i)
      );
      if (validTitle) {
        info.productTitle = validTitle.trim();
        break;
      }
    }
  }

  // Extract price (look for $XX.XX or XX.XX USD patterns)
  const pricePatterns = [
    /\$(\d+(?:\.\d{2})?)/g,
    /(\d+(?:\.\d{2})?)\s*(?:USD|dollars?)/gi,
  ];
  
  for (const pattern of pricePatterns) {
    const matches = allMessages.match(pattern);
    if (matches && matches.length > 0) {
      const priceStr = matches[matches.length - 1].replace(/[^0-9.]/g, '');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        info.price = price;
        break;
      }
    }
  }

  // Extract quantity
  const quantityMatch = currentMessage.match(/\b(\d+)\s*(?:x|×|quantity|qty|pieces?|units?)\b/i)
    || currentMessage.match(/\b(?:buy|purchase|get|order)\s+(\d+)\b/i);
  if (quantityMatch) {
    const qty = parseInt(quantityMatch[1], 10);
    if (!isNaN(qty) && qty > 0) {
      info.quantity = qty;
    }
  }

  // Default currency
  info.currency = 'USD';

  // Extract image URL if present
  const imagePattern = /(https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|gif|webp))/gi;
  const imageMatch = allMessages.match(imagePattern);
  if (imageMatch && imageMatch.length > 0) {
    info.image = imageMatch[imageMatch.length - 1];
  }

  // Extract shipping country
  const countryPattern = /(?:ship|shipping|deliver|delivery|send)\s+(?:to|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const countryMatch = allMessages.match(countryPattern);
  if (countryMatch && countryMatch[1]) {
    info.shippingCountry = countryMatch[1].trim();
  }

  // Extract product ID if present (e.g., "product-123" or "id: abc123")
  const idPattern = /(?:product[_\s-]?id|id)[\s:]+([a-zA-Z0-9_-]+)/i;
  const idMatch = allMessages.match(idPattern);
  if (idMatch && idMatch[1]) {
    info.productId = idMatch[1].trim();
  }

  return info;
}

/** Parse trip preferences from user message (regex-based) */
function parseTripPreferencesFromMessage(message: string): {
  partySize?: number;
  audienceType?: 'adults' | 'family';
  ageRange?: string;
} {
  const lower = message.toLowerCase().trim();
  const out: { partySize?: number; audienceType?: 'adults' | 'family'; ageRange?: string } = {};

  // partySize: "4 people", "3 travelers", "2 of us", "party of 5", "5 adults", "family of 4"
  const partyMatch = lower.match(/(?:party of|group of|family of|we are|we're)\s*(\d+)/i)
    || lower.match(/\b(\d+)\s*(?:people|travelers?|adults?|guests?|of us|in our group)\b/i);
  if (partyMatch) {
    const n = parseInt(partyMatch[1] || partyMatch[0], 10);
    if (!isNaN(n) && n >= 1 && n <= 20) out.partySize = n;
  }

  // audienceType: "family", "adults only", "with kids"
  if (/\b(family|with kids?|children|kids?)\b/i.test(lower)) out.audienceType = 'family';
  else if (/\b(adults? only|adults?|couple|solo)\b/i.test(lower)) out.audienceType = 'adults';

  // ageRange: "25-35", "18-25", "kids 5-10", "adults 30-40"
  const ageMatch = lower.match(/(?:age[s]?\s*)?(\d+)\s*[-–]\s*(\d+)/i)
    || lower.match(/(?:kids?|children)\s*(\d+)\s*[-–]\s*(\d+)\s*(?:\+|\band\b)?\s*(?:adults?)?\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (ageMatch) {
    if (ageMatch[3]) {
      out.ageRange = `kids ${ageMatch[1]}-${ageMatch[2]} + adults ${ageMatch[3]}-${ageMatch[4]}`;
    } else {
      out.ageRange = `${ageMatch[1]}-${ageMatch[2]}`;
    }
  } else if (/\b(18-25|26-35|36-50|51\+)\b/i.test(lower)) {
    const m = lower.match(/\b(18-25|26-35|36-50|51\+)\b/i);
    if (m) out.ageRange = m[1];
  }

  return out;
}

/** Extract destination, dates, and other trip details from user message */
function extractTripDetailsFromMessage(message: string): {
  destination?: string;
  startDate?: string;
  endDate?: string;
  guests?: number;
  duration?: number;
} {
  const out: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    guests?: number;
    duration?: number;
  } = {};

  // Extract destination - look for common patterns like "in Tokyo", "to Japan", "Tokyo Japan", "Tokyo, Japan"
  // Try to match city + country patterns first, then just city names
  const countryNames = ['Japan', 'USA', 'UK', 'United States', 'United Kingdom', 'France', 'Italy', 'Spain', 'Germany', 'China', 'India', 'Thailand', 'Singapore', 'Malaysia', 'Indonesia', 'Australia', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Vietnam', 'Philippines', 'South Korea', 'Taiwan', 'Hong Kong', 'Dubai', 'UAE', 'Qatar', 'Saudi Arabia', 'Egypt', 'Morocco', 'Turkey', 'Greece', 'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Croatia', 'Iceland', 'New Zealand'];
  
  // Pattern 1: "Tokyo Japan" or "Tokyo, Japan"
  const cityCountryPattern = new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\s*[,]?\\s*(${countryNames.join('|')})`, 'i');
  const cityCountryMatch = message.match(cityCountryPattern);
  if (cityCountryMatch && cityCountryMatch[1]) {
    out.destination = cityCountryMatch[1].trim();
  } else {
    // Pattern 2: "in Tokyo", "to Tokyo", "for Tokyo", "at Tokyo"
    const inToPattern = /(?:in|to|at|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
    const inToMatch = message.match(inToPattern);
    if (inToMatch && inToMatch[1]) {
      const dest = inToMatch[1].trim();
      // Filter out common non-destination words
      const stopWords = ['the', 'a', 'an', 'for', 'on', 'at', 'in', 'to', 'from', 'with', 'and', 'or', 'but', 'hotel', 'hotels', 'flight', 'flights', 'trip', 'travel', 'booking', 'book'];
      if (!stopWords.includes(dest.toLowerCase()) && dest.length > 2) {
        out.destination = dest;
      }
    }
    
    // Pattern 3: Just country name
    if (!out.destination) {
      const countryPattern = new RegExp(`\\b(${countryNames.join('|')})\\b`, 'i');
      const countryMatch = message.match(countryPattern);
      if (countryMatch && countryMatch[1]) {
        out.destination = countryMatch[1].trim();
      }
    }
  }
  
  // Clean destination: remove any remaining prepositions or extra words
  if (out.destination) {
    out.destination = out.destination
      .replace(/^(in|to|at|for|from|with)\s+/i, '')
      .trim();
  }

  // Extract dates - look for patterns like "22feb", "22 feb", "February 22", "22/02", "22-02-2024", "between 22feb till 25feb"
  const datePatterns = [
    /(?:between|from)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:till|to|until|-)\s*(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i,
    /(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:till|to|until|-)\s*(\d{1,2})(?:st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i,
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:till|to|until|-)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i,
  ];

  const monthMap: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12,
  };

  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      const currentYear = new Date().getFullYear();
      
      if (match[2] && match[4]) {
        // Pattern: "22feb till 25feb" or "22 feb to 25 feb"
        const day1 = parseInt(match[1], 10);
        const month1 = monthMap[match[2].toLowerCase()];
        const day2 = parseInt(match[3] || match[4], 10);
        const month2 = monthMap[(match[4] || match[5]).toLowerCase()];
        
        if (month1 && month2 && day1 && day2) {
          const year = currentYear;
          out.startDate = `${year}-${String(month1).padStart(2, '0')}-${String(day1).padStart(2, '0')}`;
          out.endDate = `${year}-${String(month2).padStart(2, '0')}-${String(day2).padStart(2, '0')}`;
          break;
        }
      } else if (match[1] && match[2] && match[4] && match[5]) {
        // Pattern: "22/02 to 25/02" or "22/02/2024 to 25/02/2024"
        const day1 = parseInt(match[1], 10);
        const month1 = parseInt(match[2], 10);
        const year1 = match[3] ? parseInt(match[3], 10) : currentYear;
        const day2 = parseInt(match[4], 10);
        const month2 = parseInt(match[5], 10);
        const year2 = match[6] ? parseInt(match[6], 10) : currentYear;
        
        if (day1 && month1 && day2 && month2) {
          out.startDate = `${year1}-${String(month1).padStart(2, '0')}-${String(day1).padStart(2, '0')}`;
          out.endDate = `${year2}-${String(month2).padStart(2, '0')}-${String(day2).padStart(2, '0')}`;
          break;
        }
      }
    }
  }

  // Extract duration - "3 days", "5 nights", etc.
  const durationMatch = message.match(/\b(\d+)\s*(?:days?|nights?)\b/i);
  if (durationMatch) {
    out.duration = parseInt(durationMatch[1], 10);
  }

  // Extract guests - "2 guests", "for 2", etc.
  const guestsMatch = message.match(/\b(\d+)\s*(?:guests?|people|persons?|travelers?)\b/i)
    || message.match(/\bfor\s+(\d+)\b/i);
  if (guestsMatch) {
    out.guests = parseInt(guestsMatch[1], 10);
  }

  return out;
}

/** Check if tripState has required preferences for itinerary */
function hasRequiredTripPreferences(ts: { peopleCount?: number; partySize?: number; audienceType?: string; ageRange?: string } | undefined): boolean {
  if (!ts) return false;
  const partySize = ts.peopleCount ?? ts.partySize;
  const hasParty = typeof partySize === 'number' && partySize >= 1 && partySize <= 20;
  const hasAudience = ts.audienceType === 'adults' || ts.audienceType === 'family';
  const hasAge = typeof ts.ageRange === 'string' && ts.ageRange.trim().length > 0;
  return !!hasParty && !!hasAudience && !!hasAge;
}

/** Merge parsed preferences into tripState */
function mergeTripPreferences(
  ts: Record<string, unknown> | undefined,
  parsed: { partySize?: number; audienceType?: 'adults' | 'family'; ageRange?: string }
): Record<string, unknown> {
  const merged = { ...(ts || {}) };
  if (parsed.partySize != null) {
    merged.peopleCount = parsed.partySize;
    merged.partySize = parsed.partySize;
  }
  if (parsed.audienceType) merged.audienceType = parsed.audienceType;
  if (parsed.ageRange) merged.ageRange = parsed.ageRange;
  return merged;
}

// Helper functions for UI event handlers
function generatePackingList(destination?: string, tripType?: string, duration?: number): Array<{ id: string; label: string; checked: boolean }> {
  const baseItems = [
    { id: 'passport', label: 'Passport & ID', checked: false },
    { id: 'visa', label: 'Visa (if required)', checked: false },
    { id: 'insurance', label: 'Travel Insurance Documents', checked: false },
    { id: 'phone', label: 'Phone & Charger', checked: false },
    { id: 'adapter', label: 'Travel Adapter', checked: false },
    { id: 'medications', label: 'Medications & First Aid', checked: false },
  ];

  const clothingItems = [
    { id: 'clothes', label: 'Clothes (appropriate for destination)', checked: false },
    { id: 'underwear', label: 'Underwear & Socks', checked: false },
    { id: 'shoes', label: 'Comfortable Walking Shoes', checked: false },
    { id: 'jacket', label: 'Jacket or Outerwear', checked: false },
  ];

  const tripSpecificItems = tripType === 'adventure' ? [
    { id: 'hiking_boots', label: 'Hiking Boots', checked: false },
    { id: 'backpack', label: 'Daypack', checked: false },
  ] : tripType === 'beach' ? [
    { id: 'swimsuit', label: 'Swimsuit', checked: false },
    { id: 'sunscreen', label: 'Sunscreen', checked: false },
    { id: 'sunglasses', label: 'Sunglasses', checked: false },
  ] : [];

  return [...baseItems, ...clothingItems, ...tripSpecificItems];
}

function calculateBudgetBreakdown(destination?: string, duration?: number, totalBudget?: number, categories?: string[]): Array<{ category: string; amount: number; percentage: number }> {
  const budget = totalBudget || 5000;
  const days = duration || 7;
  
  // Default budget allocation percentages
  const defaultAllocation: Record<string, number> = {
    'Flights': 0.35,
    'Hotels': 0.30,
    'Food': 0.20,
    'Activities': 0.10,
    'Transport': 0.03,
    'Shopping': 0.02,
  };

  const selectedCategories = categories && categories.length > 0 
    ? categories 
    : Object.keys(defaultAllocation);

  return selectedCategories.map(category => ({
    category,
    amount: Math.round(budget * (defaultAllocation[category] || 0.1)),
    percentage: Math.round((defaultAllocation[category] || 0.1) * 100),
  }));
}

// Request validation schemas
const chatRespondSchema = z.object({
  message: z.string().min(1).optional(), // Optional if messages array is provided
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    createdAt: z.string().optional(),
  })).optional(), // Optional array of messages for context (history)
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(), // Alternative history format
  tripState: z.object({
    destination: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    budget: z.number().optional(),
    travelStyle: z.array(z.string()).optional(),
    peopleCount: z.number().optional(),
    partySize: z.number().optional(),
    audienceType: z.enum(['adults', 'family']).optional(),
    ageRange: z.string().optional(),
  }).optional(), // Optional trip planning state
  sessionId: z.string().min(1).optional(), // Optional - will be generated if missing
  userId: z.string().min(1), // Required
  action: z.object({
    type: z.string(),
    payload: z.any().optional(),
  }).optional(),
});

const uiEventSchema = z.object({
  sessionId: z.string().min(1),
  uiId: z.string().min(1),
  userId: z.string().optional(), // Optional but recommended
  eventId: z.string().min(1), // Action ID (e.g., "submit_plan")
  payload: z.any().optional(), // Form data or event payload
});

// Response validation schema
// Structured response with reply, panel, and data
const chatResponseSchema = z.object({
  reply: z.string(), // Assistant reply text
  panel: z.enum(['itinerary', 'hotels', 'flights', 'tripForm']).optional(), // Panel to show
  data: z.any().optional(), // Panel data (itinerary, hotels list, flights list, etc.)
  ui: z.any().optional().nullable(), // UI widgets (for backward compatibility)
  // Legacy fields for backward compatibility
  text: z.string().optional(),
});

/**
 * POST /api/chat/respond
 * Get AI response with optional UI spec
 * Uses Zhipu AI to generate responses with optional UI widgets
 */
router.post('/respond', async (req, res) => {
  // Ensure Content-Type is always application/json
  res.setHeader('Content-Type', 'application/json');
  const requestStartTime = Date.now();
  
  // Generate UUID for request tracking
  const { randomUUID } = await import('crypto');
  const requestId = randomUUID();
  
  // Log request with [CHAT_RESPOND] prefix
  const logPrefix = `[CHAT_RESPOND] [${requestId}]`;
  console.log(`${logPrefix} ========================================`);
  console.log(`${logPrefix} Request received`);
  console.log(`${logPrefix} Method: ${req.method}`);
  console.log(`${logPrefix} Path: ${req.path}`);
  
  // Redact secrets from request body
  const sanitizedBody = req.body ? JSON.parse(JSON.stringify(req.body)) : {};
  if (sanitizedBody.apiKey) sanitizedBody.apiKey = '***REDACTED***';
  if (sanitizedBody.token) sanitizedBody.token = '***REDACTED***';
  if (sanitizedBody.secret) sanitizedBody.secret = '***REDACTED***';
  
  try {
    const validationResult = chatRespondSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error(`${logPrefix} ❌ Validation failed:`, validationResult.error.issues);
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.issues,
        },
      });
    }

    let { message, messages: messagesArray, history: historyArray, tripState, sessionId, userId, action } = validationResult.data;
    
    // Generate sessionId if missing
    if (!sessionId) {
      sessionId = `ai-${userId}`;
      console.log(`${logPrefix} Generated sessionId: ${sessionId}`);
    }
    
    // Determine the user's message: use message field or last message from array
    let userMessage = message || (messagesArray && messagesArray.length > 0 
      ? messagesArray[messagesArray.length - 1].content 
      : '');
    
    if (!userMessage && !action) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either "message" or "messages" array with content is required',
        },
      });
    }
    
    // Log validated input with [CHAT_RESPOND] prefix
    console.log(`${logPrefix} Validated input:`, {
      userId: userId ? `${userId.substring(0, 8)}...` : 'MISSING',
      sessionId: sessionId ? `${sessionId.substring(0, 20)}...` : 'MISSING',
      messageLength: userMessage?.length || 0,
      messagesCount: messagesArray?.length || 0,
      historyCount: historyArray?.length || 0,
      hasTripState: !!tripState,
      actionType: action?.type,
    });
    
    // Detect shopping intent - must be STRICT to avoid false positives
    // Only trigger on clear shopping-related queries, not general questions
    const lowerUserMessage = userMessage.toLowerCase().trim();
    
    // Strong shopping indicators (require at least one)
    const strongShoppingKeywords = [
      'buy', 'purchase', 'shop', 'shopping', 'store', 'amazon', 'ebay', 'walmart', 'target',
      'want to buy', 'looking to buy', 'need to buy', 'where to buy', 'where can i buy',
      'add to cart', 'checkout', 'order', 'place an order'
    ];
    
    // Product-specific keywords (must be combined with shopping context)
    const productKeywords = [
      'laptop', 'phone', 'headphones', 'watch', 'shoes', 'shirt', 'bag', 'jacket', 'dress',
      'cover', 'case', 'charger', 'cable', 'product', 'item'
    ];
    
    // Negative patterns - exclude these from shopping detection
    // These patterns indicate informational/educational queries, not shopping
    const negativePatterns = [
      /^what (is|are|was|were|does|do|did|can|will|would|should|could)/i,  // "what is/are..." questions
      /^how (to|do|does|can|will|would|should|did|was|is|are)/i,  // "how to/do..." questions
      /^why (is|are|do|does|did|was|were|can|will|would|should)/i,       // "why..." questions
      /^tell me (about|what|how|why)/i,     // informational queries
      /^explain/i,           // explanation requests
      /^describe/i,          // description requests
      /^is (an?|the|this|that|it|there)/i,     // "is a..." questions
      /^are (you|they|we|these|those|there)/i, // "are you..." questions
      /\b(color|colour|taste|flavor|flavour|sweet|sour|bitter|sweetness|tartness)\b/i, // food/fruit descriptors
      /\b(apple|orange|banana|fruit|vegetable|grape|berry|cherry|peach|pear)\b/i, // fruit/vegetable names (unless clearly shopping)
      /\b(what|which|who|when|where)\s+(is|are|was|were|does|do|did|can|will|would|should|could)\s+/i, // question words
    ];
    
    // Check for negative patterns first - if found, skip shopping detection
    const hasNegativePattern = negativePatterns.some(pattern => pattern.test(userMessage));
    
    // Check for strong shopping keywords
    const hasStrongShoppingKeyword = strongShoppingKeywords.some(keyword => lowerUserMessage.includes(keyword));
    
    // Check for product keywords combined with shopping context
    const hasProductKeyword = productKeywords.some(keyword => lowerUserMessage.includes(keyword));
    const hasShoppingContext = lowerUserMessage.includes('price') || 
                               lowerUserMessage.includes('cost') || 
                               lowerUserMessage.includes('affordable') ||
                               lowerUserMessage.includes('cheap') ||
                               lowerUserMessage.includes('expensive') ||
                               lowerUserMessage.includes('deal') ||
                               lowerUserMessage.includes('discount') ||
                               lowerUserMessage.includes('sale') ||
                               lowerUserMessage.includes('compare') ||
                               lowerUserMessage.includes('recommend') && hasProductKeyword ||
                               lowerUserMessage.includes('suggest') && hasProductKeyword;
    
    // Only trigger shopping if:
    // 1. Has strong shopping keyword, OR
    // 2. Has product keyword + shopping context
    // AND no negative patterns
    const hasShoppingIntent = !hasNegativePattern && (
      hasStrongShoppingKeyword || 
      (hasProductKeyword && hasShoppingContext)
    );
    
    // Log intent detection for debugging
    console.log(`${logPrefix} Intent detection:`, {
      hasNegativePattern,
      hasStrongShoppingKeyword,
      hasProductKeyword,
      hasShoppingContext,
      hasShoppingIntent,
      messagePreview: userMessage.substring(0, 50),
    });
    
    // Generate AI response using reusable service
    if (!action && userMessage) {
      try {
        // If shopping intent detected, search for products first
        if (hasShoppingIntent) {
          console.log(`${logPrefix} 🛒 Shopping intent detected, searching products...`);
          
          try {
            const products = await shopSearchProducts({
              query: userMessage,
              userId,
              limit: 5,
            });

            console.log(`${logPrefix} [SHOP_SEARCH] Found ${products.length} products`);

            if (products.length > 0) {
              // Return products with rich UI
              const productListUI = {
                type: 'product_list',
                items: products.map(product => ({
                  id: product.id,
                  title: product.title,
                  subtitle: product.subtitle,
                  imageUrl: product.imageUrl,
                  price: typeof product.price === 'number' ? product.price.toString() : product.price,
                  currency: product.currency,
                  provider: product.provider,
                  merchant: product.merchant,
                  url: product.url,
                  source: product.source,
                  action: {
                    type: 'open_url',
                    payload: {
                      url: product.url,
                      label: 'View',
                    },
                  },
                })),
                buttons: [
                  {
                    label: 'Ask Follow-up',
                    action: {
                      type: 'send_message',
                      payload: {
                        message: 'Tell me more about these products',
                      },
                    },
                  },
                ],
              };

              // Generate contextual AI response
              const aiResult = await generateAssistantReply({
                message: `User asked about shopping: "${userMessage}". I found ${products.length} products. Provide a brief response asking about preferences (budget, style, etc.) and mention the products are shown below.`,
                userId,
                sessionId,
                history: [],
              });

              return res.json({
                text: aiResult.text || `Here are ${products.length} options I found. Want to know more about any of these? What's your budget?`,
                reply: aiResult.text || `Here are ${products.length} options I found. Want to know more about any of these? What's your budget?`,
                ui: productListUI,
                sessionId: sessionId,
              });
            } else {
              // No products found - ask clarifying questions
              console.log(`${logPrefix} [SHOP_SEARCH] No products found, asking clarifying questions`);
              
              const clarifyingQuestions = {
                type: 'cta_buttons',
                buttons: [
                  {
                    label: 'Set Budget',
                    action: {
                      type: 'send_message',
                      payload: {
                        message: 'My budget is $100-200',
                      },
                    },
                  },
                  {
                    label: 'Preferred Store',
                    action: {
                      type: 'send_message',
                      payload: {
                        message: 'I prefer Amazon',
                      },
                    },
                  },
                ],
              };

              return res.json({
                text: `I couldn't find specific products for "${userMessage}". To help you better, could you tell me:\n\n1. What's your budget range?\n2. Do you have a preferred store or country?`,
                reply: `I couldn't find specific products for "${userMessage}". To help you better, could you tell me:\n\n1. What's your budget range?\n2. Do you have a preferred store or country?`,
                ui: clarifyingQuestions,
                sessionId: sessionId,
              });
            }
          } catch (searchError) {
            console.error(`${logPrefix} [SHOP_SEARCH] Error searching products:`, searchError);
            // Fall through to normal AI response if search fails
          }
        }

        // Detect hotel intent
        const hotelKeywords = ['hotel', 'hotels', 'stay', 'accommodation', 'book a room', 'where to stay', 'lodging'];
        const hasHotelIntent = hotelKeywords.some(keyword => lowerUserMessage.includes(keyword));

        if (hasHotelIntent) {
          console.log(`${logPrefix} 🏨 Hotel intent detected, processing hotel search...`);

          try {
            // Extract city, dates, and budget from message or tripState
            let city = tripState?.destination || '';
            let checkIn = tripState?.startDate || '';
            let checkOut = tripState?.endDate || '';
            let budget = tripState?.budget;

            // Try to extract from user message if not in tripState
            if (!city) {
              // Look for city patterns: "hotels in [city]", "stay in [city]", etc.
              const cityMatch = userMessage.match(/(?:in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
              if (cityMatch && cityMatch[1]) {
                city = cityMatch[1].trim();
              }
            }

            // Try to extract dates from message
            if (!checkIn || !checkOut) {
              // Look for date patterns: "from [date] to [date]", "check in [date]", etc.
              const datePattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/g;
              const dates = userMessage.match(datePattern);
              if (dates && dates.length >= 2) {
                checkIn = dates[0];
                checkOut = dates[1];
              }
            }

            // Check if required fields are missing
            const missingFields: string[] = [];
            if (!city || city.trim().length === 0) {
              missingFields.push('city');
            }
            if (!checkIn || checkIn.trim().length === 0) {
              missingFields.push('check-in date');
            }
            if (!checkOut || checkOut.trim().length === 0) {
              missingFields.push('check-out date');
            }

            if (missingFields.length > 0) {
              // Ask for missing fields
              console.log(`${logPrefix} [HOTEL_SEARCH] Missing required fields:`, missingFields);
              
              const missingFieldsUI = {
                type: 'cta_buttons',
                buttons: [
                  {
                    label: 'Set City',
                    action: {
                      type: 'open_modal',
                      payload: {
                        modalType: 'city',
                      },
                    },
                  },
                  {
                    label: 'Set Dates',
                    action: {
                      type: 'open_modal',
                      payload: {
                        modalType: 'dates',
                      },
                    },
                  },
                  {
                    label: 'Set Budget',
                    action: {
                      type: 'open_modal',
                      payload: {
                        modalType: 'budget',
                      },
                    },
                  },
                ],
              };

              return res.json({
                text: `To find the best hotels for you, I need a few details:\n\n${missingFields.map(f => `- ${f}`).join('\n')}\n\nCould you please provide these?`,
                reply: `To find the best hotels for you, I need a few details:\n\n${missingFields.map(f => `- ${f}`).join('\n')}\n\nCould you please provide these?`,
                ui: missingFieldsUI,
                sessionId: sessionId,
              });
            }

            // All required fields present - search for hotels
            console.log(`${logPrefix} [HOTEL_SEARCH] Searching hotels:`, {
              city,
              checkIn,
              checkOut,
              budget,
            });

            const hotels = await searchHotelsService({
              city: city.trim(),
              checkIn,
              checkOut,
              adults: tripState?.peopleCount || 2,
              rooms: 1,
              budget,
            });

            console.log(`${logPrefix} [HOTEL_SEARCH] Found ${hotels.length} hotels`);

            if (hotels.length > 0) {
              // Return hotels with preference questions
              const hotelListUI = {
                type: 'hotel_list',
                items: hotels.map(hotel => ({
                  id: hotel.id,
                  title: hotel.name,
                  name: hotel.name,
                  neighborhood: hotel.neighborhood,
                  area: hotel.area,
                  pricePerNight: hotel.pricePerNight,
                  price: hotel.pricePerNight,
                  currency: hotel.currency,
                  rating: hotel.rating,
                  imageUrl: hotel.imageUrl,
                  url: hotel.url,
                  source: hotel.source,
                })),
                buttons: [
                  {
                    label: 'Refine Filters',
                    action: {
                      type: 'send_message',
                      payload: {
                        message: 'Show cheaper options',
                      },
                    },
                  },
                  {
                    label: 'City Center',
                    action: {
                      type: 'send_message',
                      payload: {
                        message: 'I prefer city center hotels',
                      },
                    },
                  },
                  {
                    label: 'Quieter Area',
                    action: {
                      type: 'send_message',
                      payload: {
                        message: 'I prefer a quieter area',
                      },
                    },
                  },
                ],
              };

              // Generate contextual AI response with preference questions
              const preferenceText = `Do you want to stay in the city center or a quieter part of town? And do you prefer being near restaurants/shopping, or nightlife/entertainment?`;

              return res.json({
                text: `Here are ${hotels.length} hotel options I found in ${city}. ${preferenceText}`,
                reply: `Here are ${hotels.length} hotel options I found in ${city}. ${preferenceText}`,
                ui: hotelListUI,
                sessionId: sessionId,
              });
            } else {
              // No hotels found
              console.log(`${logPrefix} [HOTEL_SEARCH] No hotels found`);
              
              return res.json({
                text: `I couldn't find hotels in ${city} for those dates. Could you try a different city or date range?`,
                reply: `I couldn't find hotels in ${city} for those dates. Could you try a different city or date range?`,
                sessionId: sessionId,
              });
            }
          } catch (hotelError) {
            console.error(`${logPrefix} [HOTEL_SEARCH] Error searching hotels:`, hotelError);
            // Fall through to normal AI response if search fails
          }
        }

        // Build history from either history array or messages array
        let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        
        if (historyArray && historyArray.length > 0) {
          // Use history array directly if provided
          history = historyArray;
        } else if (messagesArray && messagesArray.length > 0) {
          // Convert messages array to history format
          history = messagesArray.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }));
        }

        console.log(`${logPrefix} Calling generateAssistantReply with history:`, {
          historyLength: history.length,
          messageLength: userMessage.length,
        });

        const aiResult = await generateAssistantReply({
          message: userMessage,
          userId,
          sessionId,
          history,
        });

        console.log(`${logPrefix} ✅ AI response generated:`, {
          textLength: aiResult.text.length,
          preview: aiResult.text.substring(0, 100),
        });

        return res.json({
          text: aiResult.text,
          reply: aiResult.text,
          sessionId: sessionId,
        });
      } catch (error) {
        console.error(`[CHAT_RESPOND_ERROR] Failed to generate AI response:`, error);
        console.error(`[CHAT_RESPOND_ERROR] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        console.error(`[CHAT_RESPOND_ERROR] Error message: ${error instanceof Error ? error.message : String(error)}`);
        
        if (error instanceof Error) {
          console.error(`[CHAT_RESPOND_ERROR] Error stack:`, error.stack);
        }

        return res.status(500).json({
          error: {
            code: 'AI_RESPONSE_FAILED',
            message: 'Failed to generate AI response',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }
    
    // Handle widget actions first (e.g., search_product)
    if (action && action.type === 'search_product') {
      try {
        const query = action.payload?.query || action.payload?.searchQuery || '';
        
        if (!query || query.trim().length === 0) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Product search query is required',
          });
        }

        console.log('[Chat Respond] Handling search_product action:', { query, userId, sessionId });

        // Search for products using SerpAPI
        const products = await searchProducts(query);

        // Save product context to database (non-blocking)
        if (userId && sessionId && products.length > 0) {
          saveProductContext(sessionId, userId, query, products).catch(error => {
            console.error('[Chat UI] Failed to save product context:', error);
          });
        }

        // Return top 6-10 items
        const topProducts = products.slice(0, 10);

        const productResultsUI = {
          type: 'product_results',
          items: topProducts.map(product => ({
            id: product.id,
            title: product.title,
            price: product.price.toString(),
            currency: product.currency,
            image: product.image,
            merchant: product.merchant,
            url: product.url,
            source: product.source,
          })),
        };

        const responseText = products.length === 0
          ? `I couldn't find any products matching "${query}". Please try a different search term.`
          : `Here are the best results I found for "${query}":`;

        // Save assistant message to Postgres (non-blocking)
        if (userId && sessionId) {
          saveChatMessage({
            userId,
            conversationId: sessionId,
            role: 'assistant',
            message: responseText,
            ui: products.length > 0 ? productResultsUI : null,
          }).catch(error => {
            console.error('[Chat Respond] Failed to save assistant message to Postgres:', error);
          });
        }

        // Return product results UI with top 6-10 items
        return res.json({
          reply: responseText,
          panel: undefined,
          data: undefined,
          ui: products.length > 0 ? productResultsUI : null,
          text: responseText,
        });
      } catch (error) {
        console.error(`${logPrefix} ❌ Error handling search_product action:`, error);
        console.error(`${logPrefix} Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        console.error(`${logPrefix} Error message: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`${logPrefix} Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        
        // Fallback: Return text response instead of error
        const fallbackText = 'I can help you search for products, but the product search tool is temporarily unavailable. Please try again in a moment, or ask me something else.';
        return res.json({
          text: fallbackText,
          reply: fallbackText,
          panel: undefined,
          data: undefined,
          ui: null,
        });
      }
    }

    // Handle buy_now action
    if (action && action.type === 'buy_now') {
      try {
        let product = action.payload?.product;
        const productId = action.payload?.productId;

        // If productId is provided but product is not, load from context
        if (productId && !product && sessionId) {
          console.log('[Chat Respond] Loading product from context:', { productId, sessionId });
          const contextProduct = await findProductById(sessionId, productId);
          if (contextProduct) {
            product = {
              title: contextProduct.title,
              image: contextProduct.image,
              price: contextProduct.price.toString(),
              currency: contextProduct.currency,
              url: contextProduct.url,
              merchant: contextProduct.merchant,
              source: contextProduct.source,
            };
            console.log('[Chat Respond] Found product in context:', product.title);
          }
        }
        
        if (!product || !product.url) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Product object with url is required for buy_now action. Product not found in context.',
          });
        }

        console.log('[Chat Respond] Handling buy_now action:', { product: product.title, userId, sessionId });

        // Call POST /api/checkout/link with product object
        const checkoutResponse = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/checkout/link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId || '',
          },
          body: JSON.stringify({
            userId,
            product: {
              title: product.title,
              image: product.image || '',
              price: parseFloat(product.price) || 0,
              currency: product.currency || 'USD',
              url: product.url,
              merchant: product.merchant,
              source: product.source,
            },
          }),
        });

        if (!checkoutResponse.ok) {
          const errorData = await checkoutResponse.json().catch(() => ({})) as any;
          throw new Error(errorData.message || 'Failed to create checkout link');
        }

        const checkoutData = await checkoutResponse.json() as { checkoutUrl: string; checkoutId?: string };
        const { checkoutUrl, checkoutId } = checkoutData;

        if (!checkoutUrl) {
          throw new Error('Checkout URL not returned');
        }

        // Return checkout_card UI
        const checkoutCardUI = {
          type: 'checkout_card',
          data: {
            title: product.title,
            price: product.price.toString(),
            currency: product.currency || 'USD',
            image: product.image || '',
            merchant: product.merchant,
            checkoutUrl,
          },
        };

        const responseText = `Ready to complete your purchase of ${product.title}! Click the button below to proceed.`;

        // Save assistant message to Postgres (non-blocking)
        if (userId && sessionId) {
          saveChatMessage({
            userId,
            conversationId: sessionId,
            role: 'assistant',
            message: responseText,
            ui: checkoutCardUI,
          }).catch(error => {
            console.error('[Chat Respond] Failed to save assistant message to Postgres:', error);
          });
        }

        return res.json({
          reply: responseText,
          panel: undefined,
          data: undefined,
          ui: checkoutCardUI,
          text: responseText,
        });
      } catch (error) {
        console.error(`${logPrefix} ❌ Error handling buy_now action:`, error);
        console.error(`${logPrefix} Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        console.error(`${logPrefix} Error message: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`${logPrefix} Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        
        // Fallback: Return text response instead of error
        const fallbackText = 'I can help you complete your purchase, but the checkout tool is temporarily unavailable. Please try again in a moment, or contact support if the issue persists.';
        return res.json({
          text: fallbackText,
          reply: fallbackText,
          panel: undefined,
          data: undefined,
          ui: null,
        });
      }
    }
    
    // userMessage already determined above

    // Save user message to Postgres (non-blocking)
    if (userId && sessionId) {
      saveChatMessage({
        userId,
        conversationId: sessionId,
        role: 'user',
        message: userMessage,
      }).catch(error => {
        console.error('[Chat Respond] Failed to save user message to Postgres:', error);
      });
    }
    
    const lowerMessage = userMessage.toLowerCase().trim();

    // Check for purchase intent - more specific patterns to avoid false positives
    // Only trigger on clear purchase intent phrases, not just single words
    const purchasePatterns = [
      /\b(proceed\s+with\s+(?:the\s+)?(?:purchase|buy|order))\b/i,
      /\b(buy\s+(?:it|this|that|now|the))\b/i,
      /\b(purchase\s+(?:it|this|that|now|the))\b/i,
      /\b(checkout|check\s+out)\b/i,
      /\b(order\s+(?:it|this|that|now|the))\b/i,
      /\b(place\s+an?\s+order)\b/i,
      /\b(complete\s+(?:the\s+)?(?:purchase|order|checkout))\b/i,
    ];
    const hasPurchaseIntent = purchasePatterns.some(pattern => pattern.test(userMessage));

    // Check for UI mode trigger
    const uiModeHeader = req.headers['x-ui-mode'] as string | undefined;
    const uiMode = shouldActivateUIMode(userMessage, uiModeHeader);
    
    // Heuristics to detect user intent for panel navigation
    const detectPanelIntent = (message: string): 'itinerary' | 'hotels' | 'flights' | 'tripForm' | null => {
      const lower = message.toLowerCase();
      
      // Itinerary detection
      if (lower.includes('itinerary') || lower.includes('plan') || lower.includes('schedule') || 
          lower.includes('trip plan') || lower.includes('travel plan') || lower.includes('day by day')) {
        return 'itinerary';
      }
      
      // Hotels detection
      if (lower.includes('hotel') || lower.includes('accommodation') || lower.includes('stay') || 
          lower.includes('lodging') || lower.includes('book hotel') || lower.includes('find hotel')) {
        return 'hotels';
      }
      
      // Flights detection
      if (lower.includes('flight') || lower.includes('airline') || lower.includes('fly') || 
          lower.includes('book flight') || lower.includes('find flight') || lower.includes('search flight')) {
        return 'flights';
      }
      
      // Trip form detection
      if (lower.includes('plan trip') || lower.includes('create trip') || lower.includes('new trip')) {
        return 'tripForm';
      }
      
      return null;
    };
    
    const detectedPanel = detectPanelIntent(userMessage);
    const isItineraryIntent = detectedPanel === 'itinerary' || lowerMessage.includes('plan') || lowerMessage.includes('itinerary') || lowerMessage.includes('generate itinerary');

    // Trip preferences guard: if itinerary intent and required fields missing, ask for them
    let effectiveTripState = tripState as Record<string, unknown> | undefined;
    if (isItineraryIntent) {
      const parsed = parseTripPreferencesFromMessage(userMessage);
      effectiveTripState = mergeTripPreferences(effectiveTripState, parsed) as typeof tripState;
      if (!hasRequiredTripPreferences(effectiveTripState as any)) {
        const missing: string[] = [];
        const partySize = (effectiveTripState?.peopleCount ?? effectiveTripState?.partySize) as number | undefined;
        if (typeof partySize !== 'number' || partySize < 1 || partySize > 20) missing.push('party size (how many travelers?)');
        const at = effectiveTripState?.audienceType as string | undefined;
        if (at !== 'adults' && at !== 'family') missing.push('group type (adults or family?)');
        const ar = effectiveTripState?.ageRange as string | undefined;
        if (!ar || !String(ar).trim()) missing.push('age range (e.g. 25-35 or kids 5-10 + adults 30-40)');
        const askReply = `To generate your itinerary, I need a few details: ${missing.join(', ')}. Please tell me.`;
        return res.json({
          reply: askReply,
          panel: 'tripForm' as const,
          data: { tripState: effectiveTripState },
          ui: null,
          text: askReply,
        });
      }
    }

    console.log('[Chat Respond] Received request:', { 
      hasMessage: !!message,
      hasMessagesArray: !!messagesArray,
      messagesCount: messagesArray?.length || 0,
      hasTripState: !!tripState,
      sessionId, 
      userId,
      uiMode,
    });

    // Use messages from request if provided, otherwise fetch from Stream channel
    let recentMessages: Array<{ text: string; role: 'user' | 'assistant' }> = [];
    
    if (messagesArray && messagesArray.length > 0) {
      // Convert store messages format to AI format
      recentMessages = messagesArray.map((msg) => ({
        text: msg.content,
        role: msg.role,
      }));
    } else {
      // Fallback: Get recent messages from Stream channel for context
      try {
        const channelType = 'messaging';
        const channelInstance = streamServerClient.channel(channelType, sessionId);
        const messagesResponse = await channelInstance.query({
          messages: { limit: 10 },
        });
        
        recentMessages = (messagesResponse.messages || []).map((msg: any) => ({
          text: msg.text || '',
          role: msg.user?.id === AI_COMPANION_USER_ID ? 'assistant' : 'user',
        }));
      } catch (error) {
        console.warn('[Chat Respond] Could not fetch recent messages for context:', error);
        // Continue without context
      }
    }

    // Use AI Router for intent detection and routing (after recentMessages is loaded)
    const intentResult = detectIntent(userMessage, recentMessages);
    console.log('[Chat Respond] Intent detected:', intentResult);

    // Route to appropriate agent if intent is detected with sufficient confidence
    // Only route to agents for EXPLICIT intents (shopping, travel, tracking, esim)
    // General messages should NOT trigger agents
    const explicitIntents = ['shopping', 'travel', 'tracking', 'esim'];
    const hasExplicitIntent = explicitIntents.includes(intentResult.intent) && intentResult.confidence > 0.5;
    
    if (hasExplicitIntent) {
      try {
        console.log(`${logPrefix} Routing to agent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);
        
        const agentResponse = await routeToAgent(
          intentResult.intent,
          userMessage,
          intentResult.context,
          recentMessages,
          userId,
          sessionId
        );

        // Convert agent response to chat response format
        // Ensure text field is always present (required by frontend)
        const response = {
          text: agentResponse.text || 'I received your message.',
          reply: agentResponse.text || 'I received your message.',
          panel: undefined,
          data: undefined,
          ui: agentResponse.ui || null,
        };

        // Save assistant message to Postgres
        if (userId && sessionId) {
          saveChatMessage({
            userId,
            conversationId: sessionId,
            role: 'assistant',
            message: agentResponse.text,
            ui: agentResponse.ui || null,
          }).catch(error => {
            console.error(`${logPrefix} Failed to save assistant message to Postgres:`, error);
          });
        }

        console.log(`${logPrefix} ✅ Agent response received successfully`);
        return res.json(response);
      } catch (error) {
        console.error(`${logPrefix} ❌ Error routing to agent:`, error);
        console.error(`${logPrefix} Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        console.error(`${logPrefix} Error message: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`${logPrefix} Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        
        // Fallback: Return text response instead of failing
        const fallbackText = 'I can help, but that tool is temporarily unavailable. Try a different request or ask me something else.';
        const fallbackResponse = {
          text: fallbackText,
          reply: fallbackText,
          panel: undefined,
          data: undefined,
          ui: null,
        };
        
        // Save fallback message
        if (userId && sessionId) {
          saveChatMessage({
            userId,
            conversationId: sessionId,
            role: 'assistant',
            message: fallbackText,
            ui: null,
          }).catch(() => {
            // Ignore save errors for fallback messages
          });
        }
        
        console.log(`${logPrefix} ⚠️  Returning fallback response due to agent error`);
        return res.json(fallbackResponse);
      }
    }

    // Legacy product search handling (keep for backward compatibility)
    // Only trigger on EXPLICIT shopping queries, not general messages like "Hi"
    // This prevents unnecessary API calls and errors when shopping keys are missing
    const productQuery = extractProductQuery(userMessage);
    const hasProductQuery = !!(productQuery.query || productQuery.url);
    
    // More specific keywords to avoid false positives on general messages
    // Only trigger on clear shopping intent, not just "want" or "need" in general conversation
    const explicitShoppingKeywords = [
      'buy', 'purchase', 'shop', 'shopping', 'find product', 'search product',
      'show me products', 'recommend product', 'product search', 'where to buy',
      'best price', 'compare prices', 'product review', 'buy now', 'add to cart'
    ];
    const hasExplicitShoppingIntent = hasProductQuery || 
      explicitShoppingKeywords.some(kw => lowerMessage.includes(kw)) ||
      (lowerMessage.includes('product') && (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('buy')));
    
    // Check if shopping APIs are available
    const hasShoppingAPIs = !!(process.env.SERPAPI_API_KEY || (process.env.DOBA_PUBLIC_KEY && process.env.DOBA_PRIVATE_KEY));
    
    // Handle product search: search for products and show cards
    // Only if explicit shopping intent AND shopping APIs are available
    if (hasExplicitShoppingIntent && !hasPurchaseIntent && hasShoppingAPIs) {
      try {
        const searchQuery = productQuery.query || productQuery.url || userMessage;
        
        if (searchQuery && searchQuery.length > 2) {
          console.log(`${logPrefix} Product search detected (explicit intent), searching for:`, searchQuery);
          
          // Search products using SerpAPI
          const products = await searchProducts(searchQuery);

          if (products.length > 0) {
            // Return product cards with Compare, Add to cart, Buy now buttons
            return res.json({
              reply: `I found ${products.length} product${products.length > 1 ? 's' : ''} for you:`,
              panel: undefined,
              data: undefined,
              ui: {
                type: 'cards',
                title: 'Product Search Results',
                cards: products.map((product, idx) => ({
                  id: product.id || `product_${idx}`,
                  title: product.title,
                  subtitle: product.merchant || product.source,
                  description: product.price ? `${product.currency || 'USD'} ${product.price}` : undefined,
                  imageUrl: product.image,
                  actions: [
                    {
                      label: 'Compare',
                      action: 'compare_product',
                      value: product.id,
                      url: product.url,
                    },
                    {
                      label: 'Add to Cart',
                      action: 'add_to_cart',
                      value: product.id,
                      url: product.url,
                    },
                    {
                      label: 'Buy Now',
                      action: 'buy_now',
                      value: product.id,
                      url: product.url,
                    },
                  ],
                  metadata: {
                    productId: product.id,
                    productUrl: product.url,
                    price: product.price,
                    currency: product.currency,
                    source: product.source,
                  },
                })),
              },
              text: `I found ${products.length} product${products.length > 1 ? 's' : ''} for you.`,
            });
          }
        }
      } catch (error) {
        console.error(`${logPrefix} ❌ Error searching products:`, error);
        console.error(`${logPrefix} Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        console.error(`${logPrefix} Error message: ${error instanceof Error ? error.message : String(error)}`);
        // Fall through to normal AI response (don't fail chat if shopping fails)
      }
    } else if (hasExplicitShoppingIntent && !hasShoppingAPIs) {
      // User wants to shop but APIs not configured - let AI handle it
      console.log(`${logPrefix} Shopping intent detected but shopping APIs not configured - letting AI handle normally`);
    }

    // Handle purchase intent: extract product info and create checkout
    // Only process if purchase intent is detected AND we can find product info
    if (hasPurchaseIntent) {
      try {
        console.log(`${logPrefix} 💳 Purchase intent detected, processing checkout...`);
        
        // Extract product information from recent messages or product context
        const allMessages = messagesArray ? messagesArray.map(m => m.content).join(' ') : userMessage;
        const productInfo = extractProductInfoFromMessages(allMessages, userMessage);
        
        // Try to find product from saved context if not in messages
        let productUrl = productInfo.productUrl;
        let productId = productInfo.productId;
        let quantity = productInfo.quantity || 1;
        let currency = productInfo.currency || 'USD';
        let shippingCountry = productInfo.shippingCountry;

        // If no product URL, try to find from saved product context
        if (!productUrl && sessionId && userId) {
          try {
            const contextProduct = await findProductById(sessionId, userId);
            if (contextProduct && contextProduct.url) {
              productUrl = contextProduct.url;
              productId = contextProduct.id;
              console.log(`${logPrefix} Found product from context:`, productId);
            }
          } catch (contextError) {
            console.warn(`${logPrefix} Could not load product context:`, contextError);
          }
        }

        // If we have productUrl or productId, create checkout intent
        if (productUrl || productId) {
          console.log(`${logPrefix} Creating checkout intent:`, {
            productUrl,
            productId,
            quantity,
            currency,
            shippingCountry,
          });

          try {
            // Call POST /api/checkout/intent
            const API_BASE = process.env.API_URL || 'http://localhost:3001';
            const checkoutResponse = await fetch(`${API_BASE}/api/checkout/intent`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(userId ? { 'X-User-Id': userId } : {}),
              },
              body: JSON.stringify({
                userId,
                productUrl,
                productId,
                quantity,
                currencyPreference: currency,
                shippingCountry,
              }),
            });

            if (!checkoutResponse.ok) {
              const errorData = await checkoutResponse.json().catch(() => ({})) as any;
              throw new Error(errorData.message || errorData.error?.message || 'Failed to create checkout intent');
            }

            const checkoutData = await checkoutResponse.json() as { checkoutUrl: string; expiresAt?: string };
            const { checkoutUrl, expiresAt } = checkoutData;

            if (!checkoutUrl) {
              throw new Error('Checkout URL not returned');
            }

            console.log(`${logPrefix} ✅ Checkout intent created:`, { checkoutUrl, expiresAt });

            // Return cta_buttons UI with Purchase Link button
            const purchaseButtonUI = {
              type: 'cta_buttons',
              buttons: [
                {
                  label: 'Purchase Link',
                  action: {
                    type: 'open_url',
                    payload: {
                      url: checkoutUrl,
                    },
                  },
                },
              ],
            };

            return res.json({
              text: 'Ready. Click Purchase Link to complete checkout.',
              reply: 'Ready. Click Purchase Link to complete checkout.',
              ui: purchaseButtonUI,
              sessionId: sessionId,
            });
          } catch (checkoutError) {
            console.error(`${logPrefix} ❌ Error creating checkout intent:`, checkoutError);
            // Fall through to normal AI response instead of showing error
          }
        } else {
          // No product URL/ID found - ask AI to confirm item details
          console.log(`${logPrefix} Purchase intent detected but no product found - asking AI to confirm`);
          
          // Generate AI response asking for confirmation
          const aiResult = await generateAssistantReply({
            message: `User wants to buy something but I need to confirm: item name, quantity, and shipping country. Ask them to confirm these details.`,
            userId,
            sessionId,
            history: [],
          });

          return res.json({
            text: aiResult.text || 'I\'d be happy to help you complete your purchase! Could you please confirm:\n\n1. Which item would you like to buy?\n2. What quantity?\n3. What country should I ship to?',
            reply: aiResult.text || 'I\'d be happy to help you complete your purchase! Could you please confirm:\n\n1. Which item would you like to buy?\n2. What quantity?\n3. What country should I ship to?',
            sessionId: sessionId,
          });
        }
      } catch (error) {
        console.error(`${logPrefix} ❌ Error handling purchase intent:`, error);
        // Fall through to normal AI response
      }
    }

    // userMessage already determined above - this code path should not be reached
    // if echo response was returned earlier
    
    /* LLM integration (commented out for now - uncomment when ZHIPU_API_KEY is configured)
    // Validate ZHIPU_API_KEY before calling
    const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
    if (!ZHIPU_API_KEY) {
      console.warn(`${logPrefix} ⚠️  ZHIPU_API_KEY not set - returning fallback response`);
      const fallbackText = 'AI is not configured yet on the server. Please set ZHIPU_API_KEY.';
      
      if (userId && sessionId) {
        saveChatMessage({
          userId,
          conversationId: sessionId,
          role: 'assistant',
          message: fallbackText,
          ui: null,
        }).catch(() => {});
      }
      
      return res.json({
        text: fallbackText,
        ui: null,
      });
    }
    */
    
    let aiResponse;
    try {
      aiResponse = await generateChatResponse(userMessage, recentMessages, uiMode, effectiveTripState as any);
      console.log(`${logPrefix} ✅ AI response generated successfully`);
      console.log(`${logPrefix} Response details:`, {
        hasUI: !!aiResponse.ui,
        uiType: aiResponse.ui?.type,
        uiMode,
        textLength: aiResponse.text?.length || 0,
        detectedPanel,
      });
    } catch (aiError) {
      console.error(`${logPrefix} ❌ Error calling generateChatResponse:`);
      console.error(`${logPrefix} Error type: ${aiError instanceof Error ? aiError.constructor.name : typeof aiError}`);
      console.error(`${logPrefix} Error message: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
      console.error(`${logPrefix} Error stack:`, aiError instanceof Error ? aiError.stack : 'No stack trace');
      
      // Determine fallback message based on error type
      let fallbackText = 'I can help, but the AI service is temporarily unavailable. Please try again in a moment, or ask me something else.';
      
      if (aiError instanceof Error) {
        if (aiError.message.includes('API key') || aiError.message.includes('ZHIPU') || aiError.message.includes('authentication')) {
          console.error(`${logPrefix} 🔑 Authentication error - ZHIPU_API_KEY may be missing or invalid`);
          fallbackText = 'I can help, but AI features are not currently available. Please configure ZHIPU_API_KEY to enable AI responses.';
        } else if (aiError.message.includes('rate limit') || aiError.message.includes('429')) {
          console.error(`${logPrefix} ⚠️  Rate limit error`);
          fallbackText = 'I can help, but the AI service is currently rate-limited. Please try again in a moment.';
        } else if (aiError.message.includes('fetch') || aiError.message.includes('network') || aiError.message.includes('ECONNREFUSED')) {
          console.error(`${logPrefix} 🌐 Network error`);
          fallbackText = 'I can help, but the AI service is temporarily unavailable. Please try again in a moment.';
        }
      }
      
      // Return fallback text response instead of error
      const fallbackResponse = {
        text: fallbackText,
        reply: fallbackText,
        panel: undefined,
        data: undefined,
        ui: null,
      };
      
      // Save fallback message to Postgres (non-blocking)
      if (userId && sessionId) {
        saveChatMessage({
          userId,
          conversationId: sessionId,
          role: 'assistant',
          message: fallbackText,
          ui: null,
        }).catch(() => {
          // Ignore save errors for fallback messages
        });
      }
      
      console.log(`${logPrefix} ⚠️  Returning fallback response due to AI error`);
      return res.json(fallbackResponse);
    }
    
    // Prepare panel data based on detected intent
    let panelData: any = undefined;
    let finalPanel: 'itinerary' | 'hotels' | 'flights' | 'tripForm' | undefined = detectedPanel || undefined;
    
    // Extract trip details from message if not in tripState
    const extractedDetails = extractTripDetailsFromMessage(userMessage);
    
    const ts = effectiveTripState as { destination?: string; startDate?: string; endDate?: string; budget?: number; travelStyle?: string[]; peopleCount?: number; partySize?: number } | undefined;
    
    // Use destination from tripState, extracted message, or fallback
    const destination = ts?.destination || extractedDetails.destination;
    
    if (detectedPanel === 'hotels' && destination) {
      // Clean destination: remove any prepositions or extra words that might have been extracted
      const cleanDestination = destination
        .replace(/^(in|to|at|for|from|with)\s+/i, '')
        .trim();
      
      // Search for hotels - use extracted dates if tripState doesn't have them
      const checkIn = ts?.startDate || extractedDetails.startDate || new Date().toISOString().split('T')[0];
      const checkOut = ts?.endDate || extractedDetails.endDate || (() => {
        const date = new Date(checkIn);
        // Use extracted duration if available, otherwise default to 3 days
        const duration = extractedDetails.duration || 3;
        date.setDate(date.getDate() + duration);
        return date.toISOString().split('T')[0];
      })();
      const guests = (ts?.peopleCount ?? ts?.partySize ?? extractedDetails.guests) || 2;
      
      try {
        // Add timeout to hotel search (10 seconds) to prevent blocking
        const hotelSearchPromise = searchHotels({
          destination: cleanDestination, // Use cleaned destination
          checkIn,
          checkOut,
          guests,
          maxPrice: ts?.budget,
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Hotel search timeout after 10s')), 10000)
        );
        
        const hotelResults = await Promise.race([hotelSearchPromise, timeoutPromise]) as any[];
        panelData = { hotels: hotelResults };
        console.log('[Chat Respond] Found hotels:', hotelResults.length, 'for', cleanDestination);
      } catch (error) {
        console.error('[Chat Respond] Error searching hotels:', error);
        // Don't fail the entire request if hotel search fails - just log and continue
        // The AI response will still be returned, just without hotel data
      }
    } else if (detectedPanel === 'flights') {
      // Search for flights when we have a destination (tripState or extracted from message)
      const flightDestination = ts?.destination || extractedDetails.destination;
      const flightOrigin = (ts as any)?.origin || 'NYC';
      if (flightDestination) {
        try {
          const flightResults = await searchFlights({
            origin: flightOrigin,
            destination: flightDestination,
            departureDate: ts?.startDate || extractedDetails.startDate || new Date().toISOString().split('T')[0],
            returnDate: ts?.endDate || extractedDetails.endDate,
            passengers: (ts?.peopleCount ?? (ts as any)?.partySize) || 1,
            class: 'economy',
          });
          panelData = { flights: flightResults };
          console.log('[Chat Respond] Found flights:', flightResults.length, 'for', flightOrigin, '->', flightDestination);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : '';
          if (errMsg.includes('provider auth failed')) {
            console.error('[Chat Respond] Flight search provider auth failed');
            return res.json({
              reply: 'Flight search temporarily unavailable (provider auth failed). Please check that TRAVELPAYOUTS_TOKEN is set in the API environment.',
              panel: undefined,
              data: {},
              ui: null,
              text: 'Flight search temporarily unavailable (provider auth failed). Please check that TRAVELPAYOUTS_TOKEN is set in the API environment.',
            });
          }
          console.error('[Chat Respond] Error searching flights:', error);
        }
      }
    } else if (detectedPanel === 'itinerary' && ts?.destination) {
      // Generate itinerary using dynamic destination and user inputs
      const destination = ts.destination; // Use actual user input
      const numDays = ts.startDate && ts.endDate
        ? Math.ceil((new Date(ts.endDate).getTime() - new Date(ts.startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 5;
      
      // Generate activities based on travel style
      const getActivitiesForDay = (day: number, dest: string, style?: string[]) => {
        const isAdventure = style?.some(s => s.toLowerCase().includes('adventure'));
        const isCultural = style?.some(s => s.toLowerCase().includes('cultural'));
        const isFoodie = style?.some(s => s.toLowerCase().includes('foodie'));
        const isLuxury = style?.some(s => s.toLowerCase().includes('luxury'));
        
        if (day === 1) {
          return [
            `Morning: Arrive in ${dest} and check into accommodation`,
            `Afternoon: Get oriented with the city and explore the local area`,
            `Evening: ${isFoodie ? 'Enjoy a welcome dinner at a local restaurant' : 'Rest and prepare for your adventure'}`,
          ];
        }
        
        const activities = [];
        
        if (isAdventure) {
          activities.push(`Morning: ${dest} adventure activity (hiking, water sports, or outdoor exploration)`);
        } else if (isCultural) {
          activities.push(`Morning: Visit ${dest} cultural sites, museums, or historical landmarks`);
        } else {
          activities.push(`Morning: Explore ${dest} and discover local attractions`);
        }
        
        if (isFoodie) {
          activities.push(`Afternoon: Food tour or cooking class in ${dest}`);
        } else if (isLuxury) {
          activities.push(`Afternoon: Relaxing spa experience or premium ${dest} activity`);
        } else {
          activities.push(`Afternoon: Visit local attractions and experience ${dest} culture`);
        }
        
        activities.push(`Evening: ${isFoodie ? 'Dine at a renowned restaurant' : isLuxury ? 'Fine dining experience' : 'Enjoy local cuisine and entertainment'}`);
        
        return activities;
      };
      
      const itinerary = {
        destination: destination, // Use actual user input, not default
        startDate: ts.startDate,
        endDate: ts.endDate,
        budget: ts.budget,
        travelStyle: ts.travelStyle,
        days: Array.from({ length: Math.min(numDays, 7) }, (_, i) => ({
          day: i + 1,
          date: ts.startDate ? (() => {
            const date = new Date(ts.startDate!);
            date.setDate(date.getDate() + i);
            return date.toISOString().split('T')[0];
          })() : undefined,
          activities: getActivitiesForDay(i + 1, destination, ts.travelStyle),
        })),
      };
      panelData = { itinerary };
      console.log('[Chat Respond] Generated itinerary for', destination, 'for', numDays, 'days');
    }

    // Convert AI response UI to shared UiSpec format
    let uiSpec: UiSpec | undefined;
    if (aiResponse.ui) {
      try {
        // The AI should return widgets in the correct format, but we may need to normalize
        const aiUI = aiResponse.ui as any; // Type assertion since AI may return flexible format
        
        // Map AI response type to UiSpec type
        let uiSpecType: 'trip_planner' | 'trip_profile' | 'cards' | 'form' | 'slider' | 'checklist' = 'form';
        const aiType = aiUI.type;
        if (aiType === 'trip_profile') {
          uiSpecType = 'trip_profile';
        } else if (aiType === 'trip_plan' || aiType === 'trip_planner') {
          uiSpecType = 'trip_planner';
        } else if (aiType === 'product_list' || aiType === 'cards') {
          uiSpecType = 'cards';
        } else if (aiType === 'flight_search' || aiType === 'summary' || aiType === 'weather') {
          uiSpecType = 'form';
        }

        // Normalize widgets to ensure they match the shared schema
        const normalizedWidgets: any[] = [];
        
        if (aiUI.widgets && Array.isArray(aiUI.widgets)) {
          for (const widget of aiUI.widgets) {
            // Ensure widget has required fields
            const normalized: any = {
              kind: widget.kind,
              id: widget.id || `widget_${Date.now()}_${Math.random()}`,
              label: widget.label || '',
            };

            // Add kind-specific fields
            if (widget.kind === 'button') {
              normalized.action = widget.action || { type: 'event', name: 'button_click' };
            } else if (widget.kind === 'chips') {
              normalized.options = widget.options || [];
              if (widget.selected) normalized.selected = widget.selected;
            } else if (widget.kind === 'slider') {
              normalized.min = widget.min ?? 0;
              normalized.max = widget.max ?? 100;
              normalized.value = widget.value ?? widget.min ?? 0;
            } else if (widget.kind === 'input') {
              if (widget.placeholder) normalized.placeholder = widget.placeholder;
              if (widget.value) normalized.value = widget.value;
            } else if (widget.kind === 'number') {
              normalized.min = widget.min ?? 1;
              normalized.max = widget.max ?? 20;
              normalized.value = widget.value ?? widget.min ?? 1;
            } else if (widget.kind === 'select') {
              normalized.options = widget.options || [];
              if (widget.value) normalized.value = widget.value;
            } else if (widget.kind === 'datepicker') {
              normalized.mode = widget.mode || 'single';
              if (widget.value) normalized.value = widget.value;
              if (widget.placeholder) normalized.placeholder = widget.placeholder;
            } else if (widget.kind === 'card') {
              normalized.title = widget.title || '';
              if (widget.description) normalized.description = widget.description;
              if (widget.imageUrl) normalized.imageUrl = widget.imageUrl;
              if (widget.actions) normalized.actions = widget.actions;
            } else if (widget.kind === 'checklist') {
              normalized.items = widget.items || [];
            }

            normalizedWidgets.push(normalized);
          }
        }

        // If cards array exists separately, convert to card widgets
        if (aiUI.cards && Array.isArray(aiUI.cards)) {
          for (const card of aiUI.cards) {
            normalizedWidgets.push({
              kind: 'card' as const,
              id: card.id || `card_${Date.now()}_${Math.random()}`,
              title: card.title || 'Untitled',
              description: card.description,
              imageUrl: card.imageUrl,
              actions: card.actions || [],
            });
          }
        }

        // Create UiSpec
        uiSpec = {
          id: (aiUI.id as string) || `ui_${Date.now()}`,
          type: uiSpecType as UiSpec['type'],
          title: (aiUI.title as string) || undefined,
          state: (aiUI.state as Record<string, any>) || {},
          widgets: normalizedWidgets,
        };

        // Validate with shared schema
        uiSpec = UiSpecSchema.parse(uiSpec);
        
        console.log('[Chat Respond] ✅ Converted AI UI to UiSpec:', {
          type: uiSpec.type,
          widgetCount: uiSpec.widgets.length,
        });
      } catch (error) {
        console.warn('[Chat Respond] Failed to convert/validate UI spec:', error);
        console.warn('[Chat Respond] AI UI data:', JSON.stringify(aiResponse.ui, null, 2));
        uiSpec = undefined;
      }
    }

    // When we have real flight results, return flight_list UI so chat shows flights with Book buttons
    let flightListUi: { type: 'flight_list'; items: any[] } | null = null;
    if (panelData?.flights && Array.isArray(panelData.flights) && panelData.flights.length > 0) {
      flightListUi = {
        type: 'flight_list',
        items: panelData.flights.map((f: any) => ({
          id: f.id,
          airline: f.airline,
          flightNumber: f.flightNumber,
          price: f.price,
          currency: f.currency || 'USD',
          stops: f.stops,
          duration: f.duration,
          departure: f.departure,
          arrival: f.arrival,
          deeplinkUrl: f.deeplinkUrl || f.bookingUrl,
          bookingUrl: f.bookingUrl || f.deeplinkUrl,
        })),
      };
    }

    // When we have hotel results, return hotel_list UI so chat shows hotel cards with links
    let hotelListUi: { type: 'hotel_list'; items: any[]; buttons?: any[] } | null = null;
    if (panelData?.hotels && Array.isArray(panelData.hotels) && panelData.hotels.length > 0) {
      hotelListUi = {
        type: 'hotel_list',
        items: panelData.hotels.slice(0, 5).map((h: any) => ({
          id: h.id,
          title: h.name || h.title,
          name: h.name || h.title,
          neighborhood: h.neighborhood,
          area: h.area,
          price: h.price ?? h.pricePerNight,
          pricePerNight: h.pricePerNight ?? h.price,
          currency: h.currency || 'USD',
          rating: h.rating,
          imageUrl: h.imageUrl,
          url: h.url || h.bookingUrl,
        })),
        buttons: [
          { label: 'Set City', action: { type: 'open_modal', payload: { modalType: 'city' } } },
          { label: 'Set Dates', action: { type: 'open_modal', payload: { modalType: 'dates' } } },
          { label: 'Set Budget', action: { type: 'open_modal', payload: { modalType: 'budget' } } },
        ],
      };
    }

    // When user asked for hotels/flights/itinerary but destination (or details) is missing, show Set City/Dates/Budget buttons
    const needsTripDetails = (detectedPanel === 'hotels' || detectedPanel === 'flights' || detectedPanel === 'itinerary') && !destination;
    const tripDetailsUi = needsTripDetails
      ? {
          type: 'cta_buttons' as const,
          buttons: [
            { id: 'set_city', label: 'Set City', action: { type: 'open_modal', payload: { modalType: 'city', modal: 'city' } } },
            { id: 'set_dates', label: 'Set Dates', action: { type: 'open_modal', payload: { modalType: 'dates', modal: 'dates' } } },
            { id: 'set_budget', label: 'Set Budget', action: { type: 'open_modal', payload: { modalType: 'budget', modal: 'budget' } } },
          ],
        }
      : null;

    // Prefer structured UI: flight_list > hotel_list > tripDetails cta_buttons > AI uiSpec
    const responseUi = flightListUi || hotelListUi || tripDetailsUi || uiSpec || null;
    const replyText = flightListUi
      ? `I found ${flightListUi.items.length} flight option${flightListUi.items.length === 1 ? '' : 's'} for you. Check the options below and use "Book Now" to continue.`
      : hotelListUi
        ? `I found ${hotelListUi.items.length} hotel option${hotelListUi.items.length === 1 ? '' : 's'} for you. Check the options below.`
        : tripDetailsUi
          ? (aiResponse.text || 'To get started, tell me your destination and dates. You can use the buttons below.')
          : (aiResponse.text || 'I received your message.');

    // Build structured response
    const response = {
      reply: replyText,
      panel: finalPanel,
      data: panelData,
      ui: responseUi,
      text: replyText,
    };

    // Validate response structure
    const validated = chatResponseSchema.safeParse(response);
    if (!validated.success) {
      console.error('[Chat Respond] Response validation failed:', validated.error);
      // Return response anyway, but log the error
      // Ensure we always return valid JSON with text field
      const fallbackResponse = {
        text: response.reply || response.text || 'I received your message.',
        reply: response.reply || response.text || 'I received your message.',
        panel: response.panel,
        data: response.data,
        ui: response.ui || null,
      };
      return res.json(fallbackResponse);
    }

    console.log('[Chat Respond] ✅ Returning structured response:', {
      hasPanel: !!validated.data.panel,
      panel: validated.data.panel,
      hasData: !!validated.data.data,
      hasUI: !!validated.data.ui,
      uiType: validated.data.ui?.type,
    });
    
    // Ensure response always has text field (required by frontend)
    const finalResponse = {
      ...validated.data,
      text: validated.data.text || validated.data.reply || 'I received your message.',
    };

    // Save messages to Stream Chat (non-blocking - don't fail request if Stream save fails)
    if (userId && sessionId) {
      try {
        const channelType = 'messaging';
        const channel = streamServerClient.channel(channelType, sessionId);

        // Ensure channel exists and has members
        await channel.query({ state: false, watch: false });
        
        // Ensure user and AI are members
        try {
          await channel.addMembers([userId, AI_COMPANION_USER_ID]);
        } catch (memberError: any) {
          // Ignore "already member" errors
          if (!memberError?.message?.includes('already') && !memberError?.message?.includes('member')) {
            console.warn('[Chat Respond] Could not add members (may already exist):', memberError);
          }
        }

        // Post user message to Stream
        await channel.sendMessage({
          text: userMessage,
          user: { id: userId },
        });

        // Post assistant message to Stream with UI if available (use final response ui so flight_list/hotel_list/cta_buttons are included)
        const assistantMessage: any = {
          text: validated.data.reply,
          user: { id: AI_COMPANION_USER_ID },
        };

        const uiToAttach = validated.data.ui || null;
        if (uiToAttach) {
          assistantMessage.attachments = [
            {
              type: 'ui_spec',
              ui_spec: uiToAttach,
            },
          ];
        }

        await channel.sendMessage(assistantMessage);

        console.log('[Chat Respond] Saved messages to Stream Chat for session:', sessionId);
      } catch (streamError) {
        // Log but don't fail the request if Stream save fails
        console.error('[Chat Respond] Failed to save messages to Stream Chat:', streamError);
      }
    }

    // Save assistant message to Postgres (non-blocking)
    if (userId && sessionId) {
      saveChatMessage({
        userId,
        conversationId: sessionId,
        role: 'assistant',
        message: validated.data.reply,
        ui: validated.data.ui || null,
      }).catch(error => {
        console.error('[Chat Respond] Failed to save assistant message to Postgres:', error);
      });
    }

    const responseTime = Date.now() - requestStartTime;
    console.log(`${logPrefix} ✅ Request completed successfully in ${responseTime}ms`);
    console.log(`${logPrefix} ========================================`);
    
    return res.json(finalResponse);
  } catch (error) {
    const responseTime = Date.now() - requestStartTime;
    console.error(`${logPrefix} ❌ ERROR in /respond (${responseTime}ms):`);
    console.error(`${logPrefix} Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`${logPrefix} Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`${logPrefix} Full error object:`, error);
    
    if (error instanceof Error) {
      // Log full stack trace
      console.error(`${logPrefix} Error stack trace:`);
      console.error(error.stack);
      
      // Log upstream response if available (from fetch calls) - redact secrets
      if ((error as any).response) {
        const upstreamResponse = (error as any).response;
        console.error(`${logPrefix} Upstream response status:`, upstreamResponse.status);
        let upstreamBody = upstreamResponse.body || {};
        // Redact secrets from upstream response
        if (typeof upstreamBody === 'object') {
          upstreamBody = JSON.parse(JSON.stringify(upstreamBody));
          if (upstreamBody.api_key) upstreamBody.api_key = '***REDACTED***';
          if (upstreamBody.token) upstreamBody.token = '***REDACTED***';
          if (upstreamBody.secret) upstreamBody.secret = '***REDACTED***';
        }
        console.error(`${logPrefix} Upstream response body:`, JSON.stringify(upstreamBody));
      }
    }
    
    console.error(`${logPrefix} ========================================`);
    
    // Extract userId and sessionId from request body for fallback
    const { userId, sessionId } = req.body || {};
    
    // Check if ZHIPU_API_KEY is missing
    const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
    if (!ZHIPU_API_KEY) {
      const fallbackText = 'AI is not configured yet on the server. Please set ZHIPU_API_KEY.';
      console.log(`${logPrefix} ⚠️  Returning fallback response - ZHIPU_API_KEY missing`);
      
      if (userId && sessionId) {
        saveChatMessage({
          userId,
          conversationId: sessionId,
          role: 'assistant',
          message: fallbackText,
          ui: null,
        }).catch(() => {});
      }
      
      return res.json({
        text: fallbackText,
        ui: null,
      });
    }
    
    // Determine error code and message
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let errorDetails: any = undefined;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Authentication errors
      if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('401')) {
        statusCode = 401;
        errorCode = 'AUTH_ERROR';
        errorDetails = 'AI service authentication failed';
      }
      // Rate limit errors
      else if (error.message.includes('rate limit') || error.message.includes('429')) {
        statusCode = 429;
        errorCode = 'RATE_LIMIT';
        errorDetails = 'AI service rate limit exceeded';
      }
      // Network/connection errors
      else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        statusCode = 503;
        errorCode = 'SERVICE_UNAVAILABLE';
        errorDetails = 'AI service is temporarily unavailable';
      }
      // Validation errors
      else if (error.message.includes('validation') || error.message.includes('invalid')) {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        errorDetails = error.message;
      }
    }
    
    // Return structured JSON error response
    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message: errorMessage,
        ...(errorDetails && { details: errorDetails }),
      },
    });
  }
});

/**
 * GET /api/chat/health
 * Health probe for chat endpoint
 * Returns: { ok: true, provider: "...", hasKey: boolean }
 */
router.get('/health', async (req, res) => {
  try {
    const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
    const provider = 'Zhipu GLM-4 Flash';
    
    res.json({
      ok: true,
      provider,
      hasKey: !!ZHIPU_API_KEY,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/chat/history
 * Get chat history for a user
 * Query params: userId (required), conversationId (optional), limit (optional, default: 50)
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const conversationId = req.query.conversationId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    if (!userId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'userId query parameter is required',
      });
    }

    const history = await getChatHistory(userId, conversationId, limit);

    res.json({
      messages: history,
      count: history.length,
      userId,
      conversationId: conversationId || null,
    });
  } catch (error) {
    console.error('[Chat] Error getting chat history:', error);
    res.status(500).json({
      error: 'Failed to get chat history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/chat/ui/event
 * Handle UI interaction events
 */
router.post('/ui/event', async (req, res) => {
  try {
    const validationResult = uiEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { sessionId, uiId, userId, eventId, payload } = validationResult.data;

    console.log('[Chat UI] Event received:', { sessionId, uiId, userId, eventId, payload });

    // Route search_product events to product search handler
    if (eventId === 'search_product') {
      try {
        const query = payload?.query || payload?.searchQuery || '';
        
        if (!query || query.trim().length === 0) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Product search query is required',
          });
        }

        console.log('[Chat UI] Handling search_product event:', { query, userId, sessionId });

        // Search for products using SerpAPI
        const products = await searchProducts(query);

        // Save product context to database (non-blocking)
        if (userId && sessionId && products.length > 0) {
          saveProductContext(sessionId, userId, query, products).catch(error => {
            console.error('[Chat UI] Failed to save product context:', error);
          });
        }

        // Return top 6-10 items
        const topProducts = products.slice(0, 10);

        const productResultsUI = {
          type: 'product_results',
          items: topProducts.map(product => ({
            id: product.id,
            title: product.title,
            price: product.price.toString(),
            currency: product.currency,
            image: product.image,
            merchant: product.merchant,
            url: product.url,
            source: product.source,
          })),
        };

        const responseText = products.length === 0
          ? `I couldn't find any products matching "${query}". Please try a different search term.`
          : `Here are the best results I found for "${query}":`;

        // Save assistant message to Postgres (non-blocking)
        if (userId && sessionId) {
          saveChatMessage({
            userId,
            conversationId: sessionId,
            role: 'assistant',
            message: responseText,
            ui: products.length > 0 ? productResultsUI : null,
          }).catch(error => {
            console.error('[Chat UI] Failed to save assistant message to Postgres:', error);
          });
        }

        return res.json({
          text: responseText,
          ui: products.length > 0 ? productResultsUI : null,
        });
      } catch (error) {
        console.error('[Chat UI] Error handling search_product event:', error);
        return res.status(500).json({
          error: 'Failed to search products',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Handle submit_plan event (new simplified structure)
    if (eventId === 'submit_plan') {
      const { destination, startDate, endDate, budget } = payload || {};
      
      // Generate itinerary cards
      const numDays = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 5;
      
      const cards = [];
      for (let day = 1; day <= Math.min(numDays, 7); day++) {
        cards.push({
          id: `day_${day}`,
          title: `Day ${day} in ${destination || 'Your Destination'}`,
          description: `Explore ${destination || 'the destination'} with activities, dining, and local experiences.`,
          imageUrl: `https://picsum.photos/seed/${destination || 'travel'}${day}/400/200`,
        });
      }

      // Add CTA cards
      cards.push({
        id: 'find_flights',
        title: 'Find Flights',
        description: `Search for flights to ${destination || 'your destination'}`,
        imageUrl: 'https://picsum.photos/seed/flights/400/200',
      });
      cards.push({
        id: 'find_hotels',
        title: 'Find Hotels',
        description: `Book accommodation in ${destination || 'your destination'}`,
        imageUrl: 'https://picsum.photos/seed/hotels/400/200',
      });

      const uiSpec: UiSpec = {
        id: `ui_${Date.now()}`,
        type: 'cards',
        title: `Your ${destination || 'Trip'} Itinerary`,
        state: {},
        widgets: cards.map((card) => ({
          kind: 'card' as const,
          id: card.id,
          title: card.title,
          description: card.description,
          imageUrl: card.imageUrl,
          actions: [],
        })),
      };

      const response = {
        text: `Here's your ${numDays}-day itinerary for ${destination || 'your trip'}!`,
        ui: UiSpecSchema.parse(uiSpec),
      };

      console.log('[Chat UI] ✅ Returning cards UI:', { cardCount: cards.length });
      chatResponseSchema.parse(response);
      return res.json(response);
    }

    // Handle packing checklist
    if (eventId === 'get_packing_list' || eventId === 'packing_checklist') {
      const { from, to, departureDate, returnDate, passengers, class: flightClass } = payload || {};
      
      try {
        const { searchFlights } = await import('../services/travel/travelpayouts.js');
        const flights = await searchFlights({
          origin: from || 'NYC',
          destination: to || 'LAX',
          departureDate: departureDate || new Date().toISOString().split('T')[0],
          returnDate,
          passengers: passengers || 1,
          class: flightClass || 'economy',
        });

        const uiSpec: UiSpec = {
          id: `ui_${Date.now()}`,
          type: 'cards',
          title: `Flights from ${from || 'Origin'} to ${to || 'Destination'}`,
          state: {},
          widgets: flights.map((flight, idx) => ({
            kind: 'card' as const,
            id: `flight_${idx}`,
            title: `${flight.airline} ${flight.flightNumber} - $${flight.price}`,
            description: `${flight.departure.time} → ${flight.arrival.time} | ${flight.duration} | ${flight.stops} stop(s)`,
            imageUrl: `https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800`,
            actions: [{
              type: 'event',
              name: 'book_flight',
              payload: { flightId: flight.flightNumber, bookingUrl: flight.bookingUrl },
            }],
          })),
        };

        const response = {
          text: `Found ${flights.length} flight options from ${from || 'your origin'} to ${to || 'your destination'}:`,
          ui: UiSpecSchema.parse(uiSpec),
        };

        chatResponseSchema.parse(response);
        return res.json(response);
      } catch (error) {
        console.error('[Chat UI] Error searching flights:', error);
        return res.json({
          text: 'Sorry, I encountered an error searching for flights. Please try again later.',
        });
      }
    }

    if (eventId === 'show_summary' || eventId === 'why_this_matters') {
      const uiSpec: UiSpec = {
        id: `ui_${Date.now()}`,
        type: 'form',
        title: 'Why This Matters',
        state: {},
        widgets: [
          {
            kind: 'button',
            id: 'close_summary',
            label: 'Close',
            action: {
              type: 'event',
              name: 'close_summary',
            },
          },
        ],
      };

      const response = {
        text: 'Here\'s why this matters:\n\n• Key insights and implications\n• Actionable recommendations\n• What you should know',
        ui: UiSpecSchema.parse(uiSpec),
      };

      chatResponseSchema.parse(response);
      return res.json(response);
    }

    // Handle packing checklist
    if (eventId === 'get_packing_list' || eventId === 'packing_checklist') {
      const { destination, tripType, duration } = payload || {};
      
      // Generate packing checklist based on destination and trip type
      const checklistItems = generatePackingList(destination, tripType, duration);
      
      const uiSpec: UiSpec = {
        id: `ui_${Date.now()}`,
        type: 'checklist',
        title: `Packing List for ${destination || 'Your Trip'}`,
        state: {},
        widgets: [
          {
            kind: 'checklist',
            id: 'packing_checklist',
            label: 'Travel Essentials',
            items: checklistItems,
          },
          {
            kind: 'button',
            id: 'save_checklist',
            label: 'Save Checklist',
            action: {
              type: 'event',
              name: 'save_packing_list',
            },
          },
        ],
      };

      const response = {
        text: `Here's your personalized packing list for ${destination || 'your trip'}!`,
        ui: UiSpecSchema.parse(uiSpec),
      };

      chatResponseSchema.parse(response);
      return res.json(response);
    }

    // Handle budget calculation
    if (eventId === 'calculate_budget' || eventId === 'budget_planner') {
      const { destination, duration, totalBudget, categories } = payload || {};
      
      // Calculate budget breakdown
      const budgetBreakdown = calculateBudgetBreakdown(destination, duration, totalBudget, categories);
      
      const uiSpec: UiSpec = {
        id: `ui_${Date.now()}`,
        type: 'form',
        title: `Budget Breakdown for ${destination || 'Your Trip'}`,
        state: {},
        widgets: [
          {
            kind: 'card',
            id: 'budget_summary',
            title: `Total Budget: $${totalBudget || 5000}`,
            description: `Estimated breakdown for ${duration || 7} days in ${destination || 'your destination'}`,
          },
          ...budgetBreakdown.map((item, idx) => ({
            kind: 'card' as const,
            id: `budget_${idx}`,
            title: item.category,
            description: `$${item.amount} (${item.percentage}%)`,
          })),
        ],
      };

      const response = {
        text: `Here's your budget breakdown for ${destination || 'your trip'}:`,
        ui: UiSpecSchema.parse(uiSpec),
      };

      chatResponseSchema.parse(response);
      return res.json(response);
    }

    // Handle flight search (action type "search_flights" from AI or UI)
    if (eventId === 'search_flights') {
      const { from, to, departureDate, returnDate, passengers, class: flightClass } = payload || {};
      const origin = from || 'NYC';
      const destination = to || 'LAX';
      const depDate = departureDate || new Date().toISOString().split('T')[0];

      try {
        const { searchFlights } = await import('../services/travel/travelpayouts.js');
        const flights = await searchFlights({
          origin,
          destination,
          departureDate: depDate,
          returnDate,
          passengers: passengers || 1,
          class: flightClass || 'economy',
        });

        const flightListUi = {
          type: 'flight_list' as const,
          items: flights.map((f: any) => ({
            id: f.id,
            airline: f.airline,
            flightNumber: f.flightNumber,
            price: f.price,
            currency: f.currency || 'USD',
            stops: f.stops,
            duration: f.duration,
            departure: f.departure,
            arrival: f.arrival,
            deeplinkUrl: f.deeplinkUrl || f.bookingUrl,
            bookingUrl: f.bookingUrl || f.deeplinkUrl,
          })),
        };

        const response = {
          reply: `I found ${flights.length} flight option${flights.length === 1 ? '' : 's'} from ${origin} to ${destination}. Use "Book Now" to continue.`,
          text: `I found ${flights.length} flight option${flights.length === 1 ? '' : 's'} from ${origin} to ${destination}. Use "Book Now" to continue.`,
          panel: 'flights' as const,
          data: { flights },
          ui: flightListUi,
        };

        chatResponseSchema.parse(response);
        return res.json(response);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : '';
        console.error('[Chat UI] Error searching flights:', error);
        if (errMsg.includes('provider auth failed')) {
          return res.json({
            reply: 'Flight search temporarily unavailable (provider auth failed). Please check that TRAVELPAYOUTS_TOKEN is set in the API environment.',
            text: 'Flight search temporarily unavailable (provider auth failed).',
            panel: undefined,
            data: {},
            ui: null,
          });
        }
        return res.json({
          reply: 'Sorry, I encountered an error searching for flights. Please try again later.',
          text: 'Sorry, I encountered an error searching for flights. Please try again later.',
          panel: undefined,
          data: {},
          ui: null,
        });
      }
    }

    // Handle hotel search
    if (eventId === 'search_hotels') {
      const { destination, checkIn, checkOut, guests, hotelType, maxPrice } = payload || {};
      
      try {
        const { searchHotels } = await import('../services/travel/travelpayouts.js');
        const hotels = await searchHotels({
          destination: destination || 'Unknown',
          checkIn: checkIn || new Date().toISOString().split('T')[0],
          checkOut: checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0],
          guests: guests || 2,
          maxPrice,
        });

        const uiSpec: UiSpec = {
          id: `ui_${Date.now()}`,
          type: 'cards',
          title: `Hotels in ${destination || 'Destination'}`,
          state: {},
          widgets: hotels.map((hotel: any, idx: number) => ({
            kind: 'card' as const,
            id: `hotel_${idx}`,
            title: `${hotel.name} - $${hotel.price}/night`,
            description: `Rating: ${hotel.rating}/5`,
            imageUrl: hotel.imageUrl,
            actions: [{
              type: 'event',
              name: 'book_hotel',
              payload: { hotelId: hotel.id, bookingUrl: hotel.bookingUrl },
            }],
          })),
        };

        const response = {
          text: `Found ${hotels.length} hotel options in ${destination || 'your destination'}:`,
          ui: UiSpecSchema.parse(uiSpec),
        };

        chatResponseSchema.parse(response);
        return res.json(response);
      } catch (error) {
        console.error('[Chat UI] Error searching hotels:', error);
        return res.json({
          text: 'Sorry, I encountered an error searching for hotels. Please try again later.',
        });
      }
    }

    // Handle product recommendations
    if (eventId === 'get_product_recommendations' || eventId === 'recommend_products') {
      const { destination, tripType } = payload || {};
      
      try {
        const { getProductRecommendations } = await import('../services/travel/doba.js');
        const products = await getProductRecommendations(destination || 'Unknown', tripType);

        const uiSpec: UiSpec = {
          id: `ui_${Date.now()}`,
          type: 'cards',
          title: `Recommended Travel Products for ${destination || 'Your Trip'}`,
          state: {},
          widgets: products.map((product, idx) => ({
            kind: 'card' as const,
            id: `product_${idx}`,
            title: `${product.name} - $${product.price}`,
            description: product.description,
            imageUrl: product.imageUrl,
            actions: [{
              type: 'event',
              name: 'view_product',
              payload: { productId: product.id, affiliateUrl: product.affiliateUrl },
            }],
          })),
        };

        const response = {
          text: `Here are some recommended travel products for ${destination || 'your trip'}:`,
          ui: UiSpecSchema.parse(uiSpec),
        };

        chatResponseSchema.parse(response);
        return res.json(response);
      } catch (error) {
        console.error('[Chat UI] Error getting product recommendations:', error);
        return res.json({
          text: 'Sorry, I encountered an error getting product recommendations. Please try again later.',
        });
      }
    }

    // Handle safety guidance
    if (eventId === 'get_safety_alerts' || eventId === 'safety_guidance') {
      const { destination } = payload || {};
      
      const safetyTips = [
        { id: 'tip_1', label: 'Check travel advisories from your government', checked: false },
        { id: 'tip_2', label: 'Register with your embassy or consulate', checked: false },
        { id: 'tip_3', label: 'Get comprehensive travel insurance', checked: false },
        { id: 'tip_4', label: 'Share your itinerary with family/friends', checked: false },
        { id: 'tip_5', label: 'Keep copies of important documents', checked: false },
        { id: 'tip_6', label: 'Know emergency contact numbers', checked: false },
      ];

      const uiSpec: UiSpec = {
        id: `ui_${Date.now()}`,
        type: 'checklist',
        title: `Safety Checklist for ${destination || 'Your Trip'}`,
        state: {},
        widgets: [
          {
            kind: 'checklist',
            id: 'safety_checklist',
            label: 'Safety Essentials',
            items: safetyTips,
          },
          {
            kind: 'button',
            id: 'get_alerts',
            label: 'Get Safety Alerts',
            action: {
              type: 'event',
              name: 'subscribe_safety_alerts',
              payload: { destination },
            },
          },
        ],
      };

      const response = {
        text: `Here's a safety checklist for ${destination || 'your trip'}. Stay safe and informed!`,
        ui: UiSpecSchema.parse(uiSpec),
      };

      chatResponseSchema.parse(response);
      return res.json(response);
    }

    // Handle weather request
    if (eventId === 'get_weather' || eventId === 'weather_forecast') {
      const { destination, date } = payload || {};
      
      try {
        const { getWeather } = await import('../services/travel/weather.js');
        const weather = await getWeather({
          destination: destination || 'Unknown',
          date,
          days: 7,
        });

        const weatherCards = [
          {
            kind: 'card' as const,
            id: 'current_weather',
            title: `Current Weather in ${weather.location.name}`,
            description: `${weather.current.temperature}°C, ${weather.current.condition}. Feels like ${weather.current.feelsLike}°C. Humidity: ${weather.current.humidity}%`,
          },
        ];

        if (weather.forecast && weather.forecast.length > 0) {
          weather.forecast.slice(0, 5).forEach((day, idx) => {
            weatherCards.push({
              kind: 'card' as const,
              id: `forecast_${idx}`,
              title: `${day.date}: ${day.high}°C / ${day.low}°C`,
              description: `${day.condition}${day.chanceOfRain ? ` | ${day.chanceOfRain}% chance of rain` : ''}`,
            });
          });
        }

        if (weather.alerts && weather.alerts.length > 0) {
          weather.alerts.forEach((alert, idx) => {
            weatherCards.push({
              kind: 'card' as const,
              id: `alert_${idx}`,
              title: `⚠️ ${alert.title}`,
              description: alert.description,
            });
          });
        }

        const uiSpec: UiSpec = {
          id: `ui_${Date.now()}`,
          type: 'cards',
          title: `Weather for ${weather.location.name}`,
          state: {},
          widgets: weatherCards,
        };

        const response = {
          text: `Here's the weather forecast for ${weather.location.name}:`,
          ui: UiSpecSchema.parse(uiSpec),
        };

        chatResponseSchema.parse(response);
        return res.json(response);
      } catch (error) {
        console.error('[Chat UI] Error getting weather:', error);
        return res.json({
          text: 'Sorry, I encountered an error getting weather information. Please try again later.',
        });
      }
    }

    if (eventId === 'generate_itinerary' || eventId === 'create_itinerary') {
      const { destination, startDate, endDate, budget, travelStyle } = payload || {};
      
      // Generate itinerary cards
      const numDays = startDate && endDate 
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 5;
      
      const cards = [];
      for (let day = 1; day <= Math.min(numDays, 7); day++) {
        cards.push({
          kind: 'card' as const,
          id: `day_${day}`,
          title: `Day ${day} in ${destination || 'Your Destination'}`,
          description: `Explore ${destination || 'the destination'} with ${travelStyle ? travelStyle.join(', ') : 'a mix of'} activities. Visit local attractions, enjoy authentic cuisine, and immerse yourself in the culture.`,
          imageUrl: `https://picsum.photos/seed/${destination || 'travel'}${day}/400/200`,
        });
      }

      // Add CTA cards
      cards.push({
        kind: 'card' as const,
        id: 'find_flights',
        title: 'Find Flights',
        description: `Search for flights to ${destination || 'your destination'}`,
        imageUrl: 'https://picsum.photos/seed/flights/400/200',
        actions: [{
          type: 'event',
          name: 'search_flights',
          payload: { destination, startDate, endDate },
        }],
      });
      cards.push({
        kind: 'card' as const,
        id: 'find_hotels',
        title: 'Find Hotels',
        description: `Book accommodation in ${destination || 'your destination'}`,
        imageUrl: 'https://picsum.photos/seed/hotels/400/200',
        actions: [{
          type: 'event',
          name: 'search_hotels',
          payload: { destination, startDate, endDate },
        }],
      });

      const uiSpec: UiSpec = {
        id: `ui_${Date.now()}`,
        type: 'cards',
        title: `Your ${destination || 'Trip'} Itinerary`,
        state: {},
        widgets: cards,
      };

      const response = {
        text: `Here's your ${numDays}-day itinerary for ${destination || 'your trip'}! Click on the cards below to find flights and hotels.`,
        ui: UiSpecSchema.parse(uiSpec),
      };

      chatResponseSchema.parse(response);
      return res.json(response);
    }

    // For other events, return a simple acknowledgment
    const response = {
      text: 'Event received',
    };

    chatResponseSchema.parse(response);
    return res.json(response);
  } catch (error) {
    console.error('[Chat UI] Error in /ui/event:', error);
    res.status(500).json({
      error: 'Failed to process UI event',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/chat/session
 * Get user's session data (tripState, results) for session persistence
 * Note: Session data is stored in frontend sessionStorage, this endpoint
 * can be used to fetch conversation history from Stream Chat if needed
 */
router.get('/session', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const sessionId = req.query.sessionId as string | undefined;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        message: 'Please provide X-User-Id header',
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        message: 'Please provide sessionId query parameter',
      });
    }

    console.log('[Chat Session] Fetching session data:', { userId, sessionId });

    // Try to get recent messages from Stream Chat channel for context
    // The frontend sessionStorage handles tripState and results persistence
    try {
      const channelType = 'messaging';
      const channelInstance = streamServerClient.channel(channelType, sessionId);
      
      // Query channel to get recent messages
      const channelState = await channelInstance.query({
        messages: { limit: 50 }, // Get last 50 messages for context
      });
      
      // Return session data (messages are in channelState.messages)
      // tripState and results are managed by frontend sessionStorage
      res.json({
        success: true,
        tripState: {}, // Frontend manages this via sessionStorage
        results: {}, // Frontend manages this via sessionStorage
        sessionId,
        messageCount: channelState.messages?.length || 0,
      });
    } catch (error: any) {
      // Channel might not exist yet, return empty session
      if (error.status === 404 || error.code === 'ERR_BAD_REQUEST') {
        console.log('[Chat Session] Channel not found, returning empty session');
        return res.json({
          success: true,
          tripState: {},
          results: {},
          sessionId,
          messageCount: 0,
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[Chat Session] Error fetching session data:', error);
    res.status(500).json({
      error: 'Failed to fetch session data',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/chat/conversations
 * Get list of all chat conversations for a user
 * Returns list of channels with last message preview
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = (req.query.userId as string | undefined) || (req.headers['x-user-id'] as string | undefined);

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        message: 'Please provide userId query param or X-User-Id header',
      });
    }

    try {
      // Query Stream Chat for all channels where user is a member
      // Filter for messaging channels that start with 'ai-' (our chat format)
      const channels = await streamServerClient.queryChannels(
        {
          type: 'messaging',
          members: { $in: [userId] },
        },
        {
          last_message_at: -1, // Sort by most recent
        },
        {
          limit: 50, // Get last 50 conversations
        }
      );

      // Transform channels to conversation list format
      const conversations = await Promise.all(
        channels.map(async (channel) => {
          // Include all channels that start with ai-{userId} (supports both ai-{userId} and ai-{userId}-{timestamp}-{random})
          if (!channel.id.startsWith(`ai-${userId}`)) {
            return null;
          }

          // Query channel to get latest state and messages
          try {
            await channel.query({ messages: { limit: 1 } });
          } catch (queryError) {
            console.warn('[Chat Conversations] Error querying channel:', channel.id, queryError);
          }

          // Get channel state (includes last message)
          const state = channel.state;
          const messages = state?.messages || [];
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

          // Extract title from first user message or use last message preview
          let title = 'New conversation';
          if (lastMessage) {
            const messageText = lastMessage.text || '';
            title = messageText.substring(0, 50).trim() || 'New conversation';
          } else {
            // Try to get title from channel data or first message
            const firstUserMessage = messages.find((m: any) => m.user?.id === userId);
            if (firstUserMessage) {
              title = (firstUserMessage.text || '').substring(0, 50).trim() || 'New conversation';
            }
          }

          return {
            id: channel.id,
            title,
            lastMessage: lastMessage?.text || '',
            lastMessageAt: lastMessage?.created_at 
              ? new Date(lastMessage.created_at).toISOString() 
              : (state?.last_message_at ? new Date(state.last_message_at).toISOString() : new Date().toISOString()),
            messageCount: messages.length || 0,
          };
        })
      );

      // Filter out nulls and return
      const validConversations = conversations.filter((c): c is NonNullable<typeof c> => c !== null);

      return res.json({
        conversations: validConversations,
        count: validConversations.length,
      });
    } catch (streamError) {
      console.error('[Chat Conversations] Error querying Stream:', streamError);
      return res.status(500).json({
        error: 'Failed to fetch conversations',
        message: streamError instanceof Error ? streamError.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('[Chat Conversations] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/chat/session
 * Save user's session data (tripState, results) for session persistence
 * Note: This is a no-op endpoint - session data is managed by frontend sessionStorage
 * This endpoint exists for API compatibility but doesn't persist to backend
 */
router.post('/session', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string | undefined;
    const { sessionId, tripState, results } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID is required',
        message: 'Please provide X-User-Id header',
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        message: 'Please provide sessionId in request body',
      });
    }

    console.log('[Chat Session] Session data sync request (frontend-managed):', { userId, sessionId, hasTripState: !!tripState, hasResults: !!results });

    // Session data is managed by frontend sessionStorage
    // This endpoint acknowledges the sync but doesn't store data server-side
    // The Stream Chat channel already stores message history
    
    res.json({
      success: true,
      message: 'Session data acknowledged (managed by frontend sessionStorage)',
      sessionId,
    });
  } catch (error) {
    console.error('[Chat Session] Error processing session sync:', error);
    res.status(500).json({
      error: 'Failed to process session sync',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Schema for POST /api/chat/followup
const followupSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  source: z.string().optional(),
  product_id: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * POST /api/chat/followup
 * Generate AI explanation for "Why this matters" from feed context
 * Creates a conversation, saves user message, generates AI response, and returns both
 */
router.post('/followup', async (req, res) => {
  try {
    const validationResult = followupSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { title, description, source, product_id, userId } = validationResult.data;
    const currentUserId = userId || (req.headers['x-user-id'] as string);

    if (!currentUserId) {
      return res.status(401).json({
        error: 'User ID is required',
        message: 'Please provide userId in request body or X-User-Id header',
      });
    }

    // Create or get conversation for this user
    const { createUser, createConversation, createMessage } = await import('../db/chatDb.js');
    
    // Ensure user exists (create if doesn't exist, ignore if already exists)
    try {
      await createUser(currentUserId, currentUserId, currentUserId);
    } catch (error) {
      // User might already exist, that's fine
      console.log('[Chat Followup] User might already exist:', error);
    }

    // Create a new conversation for this followup
    const conversation = await createConversation(
      currentUserId,
      `Why this matters: ${title.substring(0, 50)}`
    );

    // Construct user message
    let userMessage = `Why does this matter: ${title}`;
    if (description) {
      userMessage += `\n\nDescription: ${description}`;
    }
    if (source) {
      userMessage += `\n\nSource: ${source}`;
    }
    if (product_id) {
      userMessage += `\n\nProduct ID: ${product_id}`;
    }

    // Save user message
    const savedUserMessage = await createMessage(
      conversation.id,
      'user',
      userMessage
    );

    // Generate AI response
    const aiResponse = await generateChatResponse(
      userMessage,
      [], // No previous messages for new conversation
      true // uiMode
    );

    // Save AI response
    const savedAssistantMessage = await createMessage(
      conversation.id,
      'assistant',
      aiResponse.text,
      aiResponse.ui ? { ui: aiResponse.ui } : undefined
    );

    // Return conversation ID, user message, and AI response
    res.json({
      conversationId: conversation.id,
      userMessage: {
        id: savedUserMessage.id,
        content: savedUserMessage.content,
        role: savedUserMessage.role,
        createdAt: savedUserMessage.created_at,
      },
      aiResponse: {
        id: savedAssistantMessage.id,
        content: savedAssistantMessage.content,
        role: savedAssistantMessage.role,
        ui: savedAssistantMessage.metadata?.ui || null,
        createdAt: savedAssistantMessage.created_at,
      },
      reply: aiResponse.text,
      ui: aiResponse.ui || null,
    });
  } catch (error) {
    console.error('[Chat Followup] Error generating followup:', error);
    res.status(500).json({
      error: 'Failed to generate followup',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
