/**
 * Intent detection for user messages
 */

import type { Intent } from './types.js';

/**
 * Simple rule-based intent detection
 * Can be enhanced with LLM classification later
 */
export function detectIntent(messageText: string): Intent {
  const lowerText = messageText.toLowerCase().trim();

  // Travel planning
  if (
    /\b(plan|planning|trip|vacation|holiday|travel|visit|going to|destination)\b/i.test(lowerText) &&
    !/\b(itinerary|schedule|day by day|daily)\b/i.test(lowerText)
  ) {
    return 'travel.plan';
  }

  // Itinerary building
  if (
    /\b(itinerary|schedule|day by day|daily|what to do|activities|things to do|agenda)\b/i.test(lowerText)
  ) {
    return 'travel.itinerary';
  }

  // Destination guide
  if (
    /\b(guide|about|information|info|tell me about|what to see|attractions|sights)\b/i.test(lowerText) &&
    /\b(city|country|place|destination|location)\b/i.test(lowerText)
  ) {
    return 'travel.destination';
  }

  // Flight status
  if (
    /\b(flight|airline|airport|departure|arrival|delay|status|track|check)\b/i.test(lowerText) &&
    /\b(flight|airline|airport)\b/i.test(lowerText)
  ) {
    return 'travel.flight';
  }

  // eSIM recommendation
  if (
    /\b(esim|sim card|data|internet|connectivity|roaming|mobile data|cellular)\b/i.test(lowerText) &&
    !/\b(checkout|buy|purchase|order)\b/i.test(lowerText)
  ) {
    return 'connectivity.esim';
  }

  // eSIM checkout
  if (
    /\b(buy|purchase|order|checkout|get|buy now)\b/i.test(lowerText) &&
    /\b(esim|sim|data plan)\b/i.test(lowerText)
  ) {
    return 'connectivity.checkout';
  }

  // Stream call - Disabled in PRD Strict Mode
  if (process.env.PRD_STRICT_MODE !== 'true') {
    if (
      /\b(call|phone call|voice call|audio call)\b/i.test(lowerText) &&
      !/\b(video|video call)\b/i.test(lowerText)
    ) {
      return 'stream.call';
    }

    // Stream video - Disabled in PRD Strict Mode
    if (
      /\b(video|video call|video chat|face to face)\b/i.test(lowerText)
    ) {
      return 'stream.video';
    }
  }

  // General chat (fallback)
  return 'general.chat';
}

