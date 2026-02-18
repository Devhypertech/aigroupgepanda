/**
 * AI Router Service
 * Detects user intent and routes to appropriate specialized agent
 */

export type UserIntent = 'travel' | 'shopping' | 'esim' | 'tracking' | 'research' | 'general';

export interface IntentDetectionResult {
  intent: UserIntent;
  confidence: number;
  context?: {
    destination?: string;
    productQuery?: string;
    orderId?: string;
    country?: string;
    topic?: string;
  };
}

/**
 * Detect user intent from message
 * Uses keyword matching and pattern recognition
 */
export function detectIntent(
  message: string,
  recentMessages: Array<{ text: string; role: 'user' | 'assistant' }> = []
): IntentDetectionResult {
  const lowerMessage = message.toLowerCase().trim();
  const allMessages = [message, ...recentMessages.map(m => m.text)].join(' ').toLowerCase();

  // Travel intent keywords
  const travelKeywords = [
    'travel', 'trip', 'vacation', 'journey', 'itinerary', 'flight', 'hotel', 'booking',
    'destination', 'visit', 'explore', 'tour', 'sightseeing', 'traveling', 'travelling',
    'where to go', 'plan a trip', 'book a flight', 'find hotels', 'travel guide',
    'things to do', 'attractions', 'places to visit', 'travel plan', 'travel itinerary'
  ];

  // Shopping intent keywords
  const shoppingKeywords = [
    'buy', 'purchase', 'shop', 'shopping', 'product', 'item', 'find', 'search for',
    'need', 'want', 'looking for', 'show me', 'recommend', 'price', 'cost',
    'where to buy', 'best deal', 'compare', 'add to cart', 'checkout', 'order'
  ];

  // eSIM intent keywords
  const esimKeywords = [
    'esim', 'e-sim', 'sim card', 'data plan', 'mobile data', 'roaming', 'internet abroad',
    'data package', 'cellular', 'phone plan', 'mobile plan', 'data roaming', 'travel sim',
    'prepaid sim', 'data card', 'connectivity', 'mobile internet'
  ];

  // Tracking intent keywords
  const trackingKeywords = [
    'track', 'tracking', 'status', 'order status', 'where is', 'shipment', 'shipping',
    'delivery', 'package', 'parcel', 'order number', 'tracking number', 'order id',
    'check order', 'my order', 'order tracking', 'delivery status'
  ];

  // Research intent keywords
  const researchKeywords = [
    'research', 'learn about', 'tell me about', 'explain', 'what is', 'how does',
    'information about', 'details about', 'understand', 'study', 'investigate',
    'find out about', 'discover', 'explore topic'
  ];

  // Calculate scores for each intent
  const scores: Record<UserIntent, number> = {
    travel: 0,
    shopping: 0,
    esim: 0,
    tracking: 0,
    research: 0,
    general: 0,
  };

  // Travel scoring
  travelKeywords.forEach(keyword => {
    if (allMessages.includes(keyword)) {
      scores.travel += 1;
      // Boost if keyword appears in current message
      if (lowerMessage.includes(keyword)) {
        scores.travel += 0.5;
      }
    }
  });

  // Shopping scoring
  shoppingKeywords.forEach(keyword => {
    if (allMessages.includes(keyword)) {
      scores.shopping += 1;
      if (lowerMessage.includes(keyword)) {
        scores.shopping += 0.5;
      }
    }
  });

  // eSIM scoring
  esimKeywords.forEach(keyword => {
    if (allMessages.includes(keyword)) {
      scores.esim += 1;
      if (lowerMessage.includes(keyword)) {
        scores.esim += 0.5;
      }
    }
  });

  // Tracking scoring
  trackingKeywords.forEach(keyword => {
    if (allMessages.includes(keyword)) {
      scores.tracking += 1;
      if (lowerMessage.includes(keyword)) {
        scores.tracking += 0.5;
      }
    }
  });

  // Research scoring
  researchKeywords.forEach(keyword => {
    if (allMessages.includes(keyword)) {
      scores.research += 1;
      if (lowerMessage.includes(keyword)) {
        scores.research += 0.5;
      }
    }
  });

  // Extract context
  const context: IntentDetectionResult['context'] = {};

  // Travel context: extract destination
  const destinationPatterns = [
    /(?:to|in|visit|going to|travel to|traveling to)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
    /(?:destination|place|location):\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
  ];
  for (const pattern of destinationPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      context.destination = match[1].trim();
      break;
    }
  }

  // Shopping context: extract product query
  const productPatterns = [
    /(?:find|search for|buy|need|want|looking for|show me)\s+(.+?)(?:\s|$|,|\.)/i,
    /(?:product|item):\s*(.+?)(?:\s|$|,|\.)/i,
  ];
  for (const pattern of productPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      context.productQuery = match[1].trim();
      break;
    }
  }

  // Tracking context: extract order ID
  const orderIdPatterns = [
    /(?:order|tracking)\s*(?:id|number|#)?:?\s*([A-Z0-9\-]+)/i,
    /#([A-Z0-9\-]+)/,
  ];
  for (const pattern of orderIdPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      context.orderId = match[1].trim();
      break;
    }
  }

  // eSIM context: extract country
  const countryPatterns = [
    /(?:for|in|to)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
    /(?:country|destination):\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
  ];
  for (const pattern of countryPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length < 50) {
      context.country = match[1].trim();
      break;
    }
  }

  // Research context: extract topic
  const researchPatterns = [
    /(?:tell me about|learn about|explain|what is|information about|details about)\s+(.+?)(?:\s|$|,|\.)/i,
    /(?:topic|subject):\s*(.+?)(?:\s|$|,|\.)/i,
  ];
  for (const pattern of researchPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      context.topic = match[1].trim();
      break;
    }
  }

  // Find highest scoring intent
  let maxScore = 0;
  let detectedIntent: UserIntent = 'general';

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent as UserIntent;
    }
  }

  // Calculate confidence (0-1)
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
  const confidence = totalScore > 0 ? Math.min(maxScore / (totalScore + 1), 1) : 0.3; // Default 0.3 for general

  // If confidence is too low, default to general
  if (confidence < 0.3 && maxScore < 2) {
    detectedIntent = 'general';
  }

  console.log('[AI Router] Intent detection:', {
    message: message.substring(0, 100),
    detectedIntent,
    confidence: confidence.toFixed(2),
    scores,
    context,
  });

  return {
    intent: detectedIntent,
    confidence,
    context: Object.keys(context).length > 0 ? context : undefined,
  };
}

/**
 * Route message to appropriate agent based on intent
 */
export async function routeToAgent(
  intent: UserIntent,
  message: string,
  context: IntentDetectionResult['context'],
  recentMessages: Array<{ text: string; role: 'user' | 'assistant' }> = [],
  userId?: string,
  sessionId?: string
): Promise<{ text: string; ui?: any }> {
  switch (intent) {
    case 'travel':
      const { travelAgent } = await import('./agents/travelAgent.js');
      return travelAgent.handle(message, context, recentMessages, userId, sessionId);

    case 'shopping':
      const { shoppingAgent } = await import('./agents/shoppingAgent.js');
      return shoppingAgent.handle(message, context, recentMessages, userId, sessionId);

    case 'esim':
      const { esimAgent } = await import('./agents/esimAgent.js');
      return esimAgent.handle(message, context, recentMessages, userId, sessionId);

    case 'tracking':
      const { trackingAgent } = await import('./agents/trackingAgent.js');
      return trackingAgent.handle(message, context, recentMessages, userId, sessionId);

    case 'research':
    case 'general':
    default:
      // Use general AI response (existing chat/respond.ts logic)
      const { generateChatResponse } = await import('../chat/respond.js');
      const response = await generateChatResponse(message, recentMessages, false);
      return {
        text: response.text || '',
        ui: response.ui || null,
      };
  }
}

