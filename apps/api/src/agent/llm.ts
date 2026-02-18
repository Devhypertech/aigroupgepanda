/**
 * LLM Response Generation
 * Generates natural language responses using LLM
 */

import { callZhipuAI, type ZhipuMessage } from '../services/ai/zhipu.js';
import {
  getPersonalityTraits,
  formatWithPersonality,
  sanitizeResponse,
} from '../services/memory/personality.js';
import { queryMemory } from '../services/memory/memoryStore.js';
import type { LoadedContext, ToolResult } from './types.js';

/**
 * Build system prompt with context
 */
function buildSystemPrompt(
  longTermMemory?: any,
  shortTermMemory?: any,
  tripContext?: any
): string {
  let basePrompt = `You are "GePanda", a single AI travel companion inside a chat app.

The user experiences ONE continuous conversation. Never ask them to choose templates, rooms, or modes.

CRITICAL RULES:
- NEVER mention internal tools, function names, routing, models, system architecture, or memory operations
- NEVER say "I've saved to memory", "I queried the database", "I'm calling a tool", etc.
- ALWAYS explain results naturally: "I remember you mentioned..." not "I loaded from memory"
- If you use memory, explain it as remembering what the user told you, not as a technical operation

Primary goals:
1) Be a helpful, proactive travel companion.
2) Detect user intent from natural language.
3) Use internal tools when needed (trip planning, itinerary, flight status, eSIM recommendation, purchase checkout).
4) Keep responses concise, warm, and conversational, like ChatGPT/Nomi.
5) When tool results are available, summarize them naturally and offer the next best step.
6) Remember user preferences and past conversations naturally.

Tone:
Warm, confident, minimal fluff. Friendly travel companion energy.

Conversation behavior:
- If user is vague ("I'm going to Japan"), ask 1–2 clarifying questions: dates + style preferences.
- If user gives enough info, proceed with a plan and suggestions immediately.
- When recommending eSIM, ask duration + approximate data usage if unclear.
- Reference past conversations naturally: "I remember you mentioned..." or "Based on your previous trips..."`;

  // Add long-term memory context
  if (longTermMemory) {
    const { preferences, trips } = longTermMemory;
    
    if (Object.keys(preferences).length > 0) {
      basePrompt += `\n\nYou remember the following about this user:`;
      if (preferences.seatPreference) {
        basePrompt += `\n- They prefer ${preferences.seatPreference} seats`;
      }
      if (preferences.travelStyle) {
        basePrompt += `\n- Their travel style: ${preferences.travelStyle}`;
      }
      if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
        basePrompt += `\n- Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}`;
      }
      basePrompt += `\n\nUse these preferences naturally when relevant. Say "I remember you prefer..." not "I loaded your preferences from memory".`;
    }
    
    if (trips && trips.length > 0) {
      const upcomingTrips = trips.filter((t: any) => t.status === 'upcoming' || t.status === 'planned');
      if (upcomingTrips.length > 0) {
        basePrompt += `\n\nUpcoming trips:`;
        upcomingTrips.forEach((trip: any) => {
          basePrompt += `\n- ${trip.destination} (${trip.startDate} to ${trip.endDate})`;
        });
      }
    }
  }

  // Add short-term memory context
  if (shortTermMemory && shortTermMemory.activeTrip) {
    const { activeTrip } = shortTermMemory;
    if (activeTrip.destination || activeTrip.startDate) {
      basePrompt += `\n\nCurrent conversation context:`;
      if (activeTrip.destination) {
        basePrompt += `\n- Planning trip to: ${activeTrip.destination}`;
      }
      if (activeTrip.startDate) {
        basePrompt += `\n- Start date: ${activeTrip.startDate}`;
      }
      if (activeTrip.endDate) {
        basePrompt += `\n- End date: ${activeTrip.endDate}`;
      }
    }
  }

  // Add trip context if available
  if (tripContext) {
    const hasDestination = tripContext.destination && tripContext.destination.trim() !== '';
    const hasDates = tripContext.startDate && tripContext.endDate;
    const hasTravelers = tripContext.travelers && tripContext.travelers > 0;
    
    if (hasDestination || hasDates || hasTravelers) {
      basePrompt += `\n\nTrip details from current conversation:`;
      if (hasDestination) {
        basePrompt += `\n- Destination: ${tripContext.destination}`;
      }
      if (hasDates) {
        basePrompt += `\n- Dates: ${tripContext.startDate} to ${tripContext.endDate}`;
      }
      if (hasTravelers) {
        basePrompt += `\n- Travelers: ${tripContext.travelers}`;
      }
    }
  }

  return basePrompt;
}

/**
 * Generate natural language response using LLM
 */
export async function generateResponse(
  messageText: string,
  context: LoadedContext,
  toolResult?: ToolResult
): Promise<string> {
  try {
    const { longTermMemory, shortTermMemory, tripContext, recentMessages } = context;

    // Query memory for relevant context
    const memoryQuery = queryMemory(
      context.longTermMemory?.userId || '',
      messageText,
      context.shortTermMemory?.conversationId || ''
    );

    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(longTermMemory, shortTermMemory, tripContext),
      },
    ];

    // Add memory context if found
    if (memoryQuery.found) {
      messages.push({
        role: 'system',
        content: `[Memory context available: ${memoryQuery.context}. Use this naturally in your response. Say "I remember..." not "I loaded from memory".]`,
      });
    }

    // Add recent messages for context
    const recentContext = recentMessages.slice(-10);
    for (const msg of recentContext) {
      if (msg.kind === 'AI') {
        messages.push({
          role: 'assistant',
          content: msg.text,
        });
      } else {
        messages.push({
          role: 'user',
          content: `${msg.username}: ${msg.text}`,
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: messageText,
    });

    // If we have tool results, add them to context
    if (toolResult && toolResult.success && toolResult.data) {
      messages.push({
        role: 'assistant',
        content: `[Tool result available: ${JSON.stringify(toolResult.data)}]`,
      });
    }

    // Call LLM
    let responseText = await callZhipuAI(messages);
    
    // Format with personality
    const personality = getPersonalityTraits(longTermMemory);
    const isFirstInteraction = (longTermMemory?.metadata?.totalConversations || 0) === 0;
    responseText = formatWithPersonality(responseText, personality, {
      isFirstInteraction,
    });

    // Sanitize response - remove any internal action mentions
    responseText = sanitizeResponse(responseText);

    return responseText;
  } catch (error) {
    console.error('[Agent LLM] Error generating response:', error);
    throw error; // Let caller handle fallback
  }
}

