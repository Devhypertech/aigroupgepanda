/**
 * Memory Store - Manages long-term and short-term memory
 */

import type { LongTermMemory, ShortTermMemory, MemoryUpdate, MemoryQueryResult } from './types.js';

// In-memory storage (would be replaced with database in production)
const longTermMemoryStore = new Map<string, LongTermMemory>();
const shortTermMemoryStore = new Map<string, ShortTermMemory>();

/**
 * Initialize or get long-term memory for user
 */
export function getLongTermMemory(userId: string): LongTermMemory {
  if (!longTermMemoryStore.has(userId)) {
    longTermMemoryStore.set(userId, {
      userId,
      preferences: {},
      trips: [],
      patterns: {},
      metadata: {
        firstInteraction: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        totalConversations: 0,
      },
    });
  }
  return longTermMemoryStore.get(userId)!;
}

/**
 * Update long-term memory
 */
export function updateLongTermMemory(
  userId: string,
  update: MemoryUpdate
): LongTermMemory {
  const memory = getLongTermMemory(userId);
  
  switch (update.type) {
    case 'preference':
      memory.preferences[update.key] = update.value;
      break;
    case 'trip':
      if (update.key === 'add') {
        memory.trips.push({
          id: `trip_${Date.now()}`,
          ...update.value,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else if (update.key === 'update') {
        const trip = memory.trips.find(t => t.id === update.value.id);
        if (trip) {
          Object.assign(trip, update.value);
          trip.updatedAt = new Date().toISOString();
        }
      }
      break;
    case 'pattern':
      if (!memory.patterns[update.key]) {
        memory.patterns[update.key] = [];
      }
      if (Array.isArray(memory.patterns[update.key])) {
        (memory.patterns[update.key] as any[]).push(update.value);
      }
      break;
    case 'metadata':
      memory.metadata[update.key] = update.value;
      break;
  }
  
  memory.metadata.lastInteraction = new Date().toISOString();
  longTermMemoryStore.set(userId, memory);
  return memory;
}

/**
 * Get or create short-term memory for conversation
 */
export function getShortTermMemory(
  userId: string,
  conversationId: string
): ShortTermMemory {
  const key = `${userId}:${conversationId}`;
  
  if (!shortTermMemoryStore.has(key)) {
    shortTermMemoryStore.set(key, {
      conversationId,
      userId,
      recentMessages: [],
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0,
    });
  }
  
  return shortTermMemoryStore.get(key)!;
}

/**
 * Update short-term memory
 */
export function updateShortTermMemory(
  userId: string,
  conversationId: string,
  updates: Partial<ShortTermMemory>
): ShortTermMemory {
  const key = `${userId}:${conversationId}`;
  const memory = getShortTermMemory(userId, conversationId);
  
  Object.assign(memory, updates);
  memory.lastActivity = new Date().toISOString();
  memory.messageCount = memory.recentMessages.length;
  
  shortTermMemoryStore.set(key, memory);
  return memory;
}

/**
 * Add message to short-term memory
 */
export function addMessageToMemory(
  userId: string,
  conversationId: string,
  role: 'user' | 'ai',
  text: string
): void {
  const memory = getShortTermMemory(userId, conversationId);
  
  memory.recentMessages.push({
    role,
    text,
    timestamp: new Date().toISOString(),
  });
  
  // Keep only last 20 messages
  if (memory.recentMessages.length > 20) {
    memory.recentMessages = memory.recentMessages.slice(-20);
  }
  
  updateShortTermMemory(userId, conversationId, memory);
}

/**
 * Query memory for relevant information
 */
export function queryMemory(
  userId: string,
  query: string,
  conversationId?: string
): MemoryQueryResult {
  const longTerm = getLongTermMemory(userId);
  const lowerQuery = query.toLowerCase();
  
  // Check preferences
  if (lowerQuery.includes('prefer') || lowerQuery.includes('like') || lowerQuery.includes('want')) {
    const preferenceKeys = Object.keys(longTerm.preferences);
    if (preferenceKeys.length > 0) {
      return {
        found: true,
        data: longTerm.preferences,
        context: 'user preferences',
      };
    }
  }
  
  // Check trips
  if (lowerQuery.includes('trip') || lowerQuery.includes('travel') || lowerQuery.includes('vacation')) {
    if (longTerm.trips.length > 0) {
      const upcomingTrips = longTerm.trips.filter(t => 
        t.status === 'planned' || t.status === 'upcoming'
      );
      return {
        found: true,
        data: upcomingTrips.length > 0 ? upcomingTrips : longTerm.trips,
        context: upcomingTrips.length > 0 ? 'upcoming trips' : 'trip history',
      };
    }
  }
  
  // Check patterns
  if (lowerQuery.includes('usually') || lowerQuery.includes('often') || lowerQuery.includes('frequently')) {
    if (Object.keys(longTerm.patterns).length > 0) {
      return {
        found: true,
        data: longTerm.patterns,
        context: 'travel patterns',
      };
    }
  }
  
  // Get short-term context if conversation ID provided
  if (conversationId) {
    const shortTerm = getShortTermMemory(userId, conversationId);
    if (shortTerm.activeTrip) {
      return {
        found: true,
        data: shortTerm.activeTrip,
        context: 'current conversation trip',
      };
    }
  }
  
  return { found: false };
}

/**
 * Extract and save preferences from conversation
 */
export function extractPreferences(
  userId: string,
  messageText: string
): MemoryUpdate[] {
  const updates: MemoryUpdate[] = [];
  const lowerText = messageText.toLowerCase();
  
  // Seat preference
  if (lowerText.includes('window seat') || lowerText.includes('prefer window')) {
    updates.push({
      type: 'preference',
      key: 'seatPreference',
      value: 'window',
      timestamp: new Date().toISOString(),
    });
  } else if (lowerText.includes('aisle seat') || lowerText.includes('prefer aisle')) {
    updates.push({
      type: 'preference',
      key: 'seatPreference',
      value: 'aisle',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Travel style
  if (lowerText.includes('budget') || lowerText.includes('cheap') || lowerText.includes('affordable')) {
    updates.push({
      type: 'preference',
      key: 'travelStyle',
      value: 'budget',
      timestamp: new Date().toISOString(),
    });
  } else if (lowerText.includes('luxury') || lowerText.includes('premium') || lowerText.includes('high-end')) {
    updates.push({
      type: 'preference',
      key: 'travelStyle',
      value: 'luxury',
      timestamp: new Date().toISOString(),
    });
  } else if (lowerText.includes('adventure') || lowerText.includes('outdoor')) {
    updates.push({
      type: 'preference',
      key: 'travelStyle',
      value: 'adventure',
      timestamp: new Date().toISOString(),
    });
  }
  
  // Dietary restrictions
  const dietaryKeywords = ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher', 'allergies'];
  for (const keyword of dietaryKeywords) {
    if (lowerText.includes(keyword)) {
      const memory = getLongTermMemory(userId);
      const restrictions = memory.preferences.dietaryRestrictions || [];
      if (!restrictions.includes(keyword)) {
        updates.push({
          type: 'preference',
          key: 'dietaryRestrictions',
          value: [...restrictions, keyword],
          timestamp: new Date().toISOString(),
        });
      }
      break;
    }
  }
  
  return updates;
}

