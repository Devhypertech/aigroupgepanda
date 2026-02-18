/**
 * Memory and Context Loading
 * Loads long-term memory, short-term memory, and trip context
 */

import {
  getLongTermMemory,
  updateLongTermMemory,
  getShortTermMemory,
  updateShortTermMemory,
  addMessageToMemory,
  queryMemory,
  extractPreferences,
} from '../services/memory/memoryStore.js';
import { getTripContext } from '../services/tripContext/memoryStorage.js';
import type { AgentContext, LoadedContext } from './types.js';

/**
 * Load all context for agent processing
 */
export function loadContext(context: AgentContext): LoadedContext {
  const { userId, channelId, messageText, recentMessages = [], tripContext } = context;
  
  // Generate conversation ID (use channelId as conversation identifier)
  const conversationId = channelId || `conv_${userId}`;

  // Load memory
  const longTermMemory = getLongTermMemory(userId);
  const shortTermMemory = getShortTermMemory(userId, conversationId);

  // Extract and save preferences from message
  try {
    const preferenceUpdates = extractPreferences(userId, messageText);
    for (const update of preferenceUpdates) {
      updateLongTermMemory(userId, update);
    }
  } catch (error) {
    console.warn('[Agent Memory] Error extracting preferences:', error);
    // Continue without preference updates
  }

  // Add user message to short-term memory
  try {
    addMessageToMemory(userId, conversationId, 'user', messageText);
  } catch (error) {
    console.warn('[Agent Memory] Error adding message to memory:', error);
    // Continue without message history
  }

  // Update short-term memory with active trip if mentioned
  if (tripContext) {
    try {
      updateShortTermMemory(userId, conversationId, {
        activeTrip: {
          destination: tripContext.destination,
          startDate: tripContext.startDate,
          endDate: tripContext.endDate,
          travelers: tripContext.travelers,
          budget: tripContext.budgetRange,
          interests: tripContext.interests,
        },
      });
    } catch (error) {
      console.warn('[Agent Memory] Error updating trip context:', error);
      // Continue without trip context update
    }
  }

  // Get trip context from external source if not provided
  let externalTripContext = tripContext;
  if (!externalTripContext) {
    try {
      const roomId = channelId.startsWith('room-') ? channelId.replace('room-', '') : channelId;
      const contextRecord = getTripContext(roomId);
      externalTripContext = contextRecord?.data || undefined;
    } catch (error) {
      // Trip context not available, continue without it
      console.debug('[Agent Memory] No trip context available');
    }
  }

  return {
    longTermMemory,
    shortTermMemory,
    tripContext: externalTripContext,
    recentMessages,
  };
}

/**
 * Save AI response to memory
 */
export function saveResponse(
  userId: string,
  channelId: string,
  responseText: string
): void {
  try {
    const conversationId = channelId || `conv_${userId}`;
    addMessageToMemory(userId, conversationId, 'ai', responseText);
    
    // Update long-term memory metadata
    updateLongTermMemory(userId, {
      type: 'metadata',
      key: 'totalConversations',
      value: (getLongTermMemory(userId).metadata.totalConversations || 0) + 1,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[Agent Memory] Error saving response to memory:', error);
    // Continue - memory save failure shouldn't break chat
  }
}

/**
 * Query memory for relevant context
 */
export function queryMemoryContext(
  userId: string,
  channelId: string,
  messageText: string
): { found: boolean; context?: string } {
  try {
    const conversationId = channelId || `conv_${userId}`;
    return queryMemory(userId, messageText, conversationId);
  } catch (error) {
    console.warn('[Agent Memory] Error querying memory:', error);
    return { found: false };
  }
}

