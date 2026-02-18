/**
 * User Signals Update
 * Extracts and stores intent signals from chat messages for feed personalization
 */

import { prisma } from '../db/client.js';
import type { Intent } from '../agent/types.js';

export interface SignalUpdate {
  intent?: Intent;
  destinations?: string[];
}

/**
 * Extract destinations from message text
 * Simple extraction - can be enhanced with NLP
 */
function extractDestinations(messageText: string): string[] {
  const destinations: string[] = [];
  const lowerText = messageText.toLowerCase();

  // Common destination patterns
  const destinationPatterns = [
    // "going to [destination]"
    /\b(?:going to|visiting|traveling to|travel to|trip to|heading to)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/g,
    // "in [destination]"
    /\b(?:in|at|from)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/g,
    // "[destination]" (capitalized city/country names)
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
  ];

  for (const pattern of destinationPatterns) {
    const matches = messageText.matchAll(pattern);
    for (const match of matches) {
      const dest = match[1]?.trim();
      if (dest && dest.length > 2 && dest.length < 50) {
        // Filter out common false positives
        const falsePositives = [
          'the', 'this', 'that', 'there', 'here', 'where', 'when', 'what', 'how',
          'i', 'you', 'we', 'they', 'me', 'my', 'your', 'our', 'their',
          'can', 'will', 'should', 'would', 'could', 'may', 'might',
          'japan', 'tokyo', 'kyoto', 'bali', 'paris', 'london', 'new york',
        ];
        if (!falsePositives.includes(dest.toLowerCase())) {
          destinations.push(dest);
        }
      }
    }
  }

  // Remove duplicates and return
  return Array.from(new Set(destinations));
}

/**
 * Map agent intent to signal intent
 */
function mapIntentToSignal(intent: Intent): string | null {
  const mapping: Record<Intent, string | null> = {
    'travel.plan': 'destination_search',
    'travel.itinerary': 'itinerary_planning',
    'travel.destination': 'destination_search',
    'travel.flight': 'flight_tracking',
    'connectivity.esim': 'esim_need',
    'connectivity.checkout': 'esim_purchase',
    'stream.call': null, // Not relevant for feed
    'stream.video': null, // Not relevant for feed
    'general.chat': null, // Too generic
    'unknown': null,
  };

  return mapping[intent] || null;
}

/**
 * Update user signals from a chat message
 */
export async function updateUserSignals(
  userId: string,
  messageText: string,
  intent: Intent
): Promise<void> {
  if (!prisma) {
    console.warn('[Signals] Prisma not available, skipping signal update');
    return;
  }

  try {
    // Extract signal intent
    const signalIntent = mapIntentToSignal(intent);

    // Extract destinations
    const destinations = extractDestinations(messageText);

    // Get existing signals or create new
    const existing = await prisma.userSignals.findUnique({
      where: { userId },
    });

    // Merge destinations (keep unique)
    let allDestinations: string[] = [];
    if (existing?.destinationsJson) {
      try {
        const existingDests = Array.isArray(existing.destinationsJson)
          ? (existing.destinationsJson as string[])
          : JSON.parse(existing.destinationsJson as string);
        allDestinations = Array.isArray(existingDests) ? existingDests : [];
      } catch (e) {
        console.warn('[Signals] Error parsing existing destinations:', e);
        allDestinations = [];
      }
    }

    // Add new destinations (deduplicate)
    const combinedDestinations = Array.from(
      new Set([...allDestinations, ...destinations])
    ).slice(0, 20); // Keep max 20 destinations

    // Upsert signals
    await prisma.userSignals.upsert({
      where: { userId },
      update: {
        lastIntent: signalIntent || undefined,
        destinationsJson: combinedDestinations.length > 0 
          ? (combinedDestinations as any) 
          : undefined,
        updatedAt: new Date(),
      },
      create: {
        userId,
        lastIntent: signalIntent || null,
        destinationsJson: combinedDestinations.length > 0 
          ? (combinedDestinations as any) 
          : null,
      },
    });

    console.log('[Signals] Updated signals for user:', {
      userId,
      intent: signalIntent,
      destinationsCount: combinedDestinations.length,
    });
  } catch (error) {
    console.error('[Signals] Error updating user signals:', error);
    // Don't throw - signal updates shouldn't break chat
  }
}

/**
 * Get user signals
 */
export async function getUserSignals(userId: string): Promise<{
  lastIntent: string | null;
  destinations: string[];
  notInterestedTags?: string[];
  notInterestedCategories?: string[];
} | null> {
  if (!prisma) {
    return null;
  }

  try {
    const signals = await prisma.userSignals.findUnique({
      where: { userId },
    });

    if (!signals) {
      return null;
    }

    // Parse destinations JSON
    let destinations: string[] = [];
    if (signals.destinationsJson) {
      try {
        const parsed = Array.isArray(signals.destinationsJson)
          ? (signals.destinationsJson as string[])
          : JSON.parse(signals.destinationsJson as string);
        destinations = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn('[Signals] Error parsing destinations JSON:', e);
        destinations = [];
      }
    }

    // Parse not interested preferences
    let notInterestedTags: string[] = [];
    let notInterestedCategories: string[] = [];
    
    if ((signals as any).notInterestedTags) {
      try {
        const parsed = Array.isArray((signals as any).notInterestedTags)
          ? (signals as any).notInterestedTags
          : JSON.parse((signals as any).notInterestedTags as string);
        notInterestedTags = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn('[Signals] Error parsing notInterestedTags:', e);
      }
    }
    
    if ((signals as any).notInterestedCategories) {
      try {
        const parsed = Array.isArray((signals as any).notInterestedCategories)
          ? (signals as any).notInterestedCategories
          : JSON.parse((signals as any).notInterestedCategories as string);
        notInterestedCategories = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn('[Signals] Error parsing notInterestedCategories:', e);
      }
    }

    return {
      lastIntent: signals.lastIntent,
      destinations,
      notInterestedTags,
      notInterestedCategories,
    };
  } catch (error) {
    console.error('[Signals] Error getting user signals:', error);
    return null;
  }
}

