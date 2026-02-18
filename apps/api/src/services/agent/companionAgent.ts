/**
 * CompanionAgent - Main orchestrator for AI companion
 * Handles intent detection, tool calling, and response generation
 */

import { detectIntent } from './intent.js';
import type { AgentContext, AgentResponse, ToolCall } from './types.js';
import { intentToTool, executeTool } from '../../tools/registry.js';
import { callZhipuAI, type ZhipuMessage } from '../ai/zhipu.js';
import {
  getLongTermMemory,
  updateLongTermMemory,
  getShortTermMemory,
  updateShortTermMemory,
  addMessageToMemory,
  queryMemory,
  extractPreferences,
} from '../memory/memoryStore.js';
import {
  getPersonalityTraits,
  shouldBeProactive,
  generateProactiveMessage,
  formatWithPersonality,
  sanitizeResponse,
} from '../memory/personality.js';

function getSystemPrompt(
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
    const { preferences, trips, patterns } = longTermMemory;
    
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

  // Add trip context if available (from external source)
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
 * Extract parameters from message text for tool input
 * Simple extraction - can be enhanced with LLM
 */
function extractToolInput(intent: string, messageText: string, tripContext?: any): Record<string, any> {
  const lowerText = messageText.toLowerCase();
  const input: Record<string, any> = {};

  // Use trip context if available
  if (tripContext) {
    if (tripContext.destination) input.destination = tripContext.destination;
    if (tripContext.startDate) input.startDate = tripContext.startDate;
    if (tripContext.endDate) input.endDate = tripContext.endDate;
    if (tripContext.travelers) input.travelers = tripContext.travelers;
    if (tripContext.budgetRange) input.budget = tripContext.budgetRange;
    if (tripContext.interests) input.interests = tripContext.interests;
  }

  // Extract destination
  const destinationMatch = messageText.match(/\b(?:to|in|visiting|going to|travel to)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/);
  if (destinationMatch) {
    input.destination = destinationMatch[1].trim();
  }

  // Extract dates
  const dateMatch = messageText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (dateMatch) {
    if (!input.startDate) input.startDate = dateMatch[1];
    else if (!input.endDate) input.endDate = dateMatch[1];
  }

  // Extract duration
  const durationMatch = lowerText.match(/(\d+)\s*(?:day|days)/);
  if (durationMatch) {
    input.duration = parseInt(durationMatch[1], 10);
  }

  // Extract flight number
  const flightMatch = messageText.match(/\b([A-Z]{2,3}\s?\d{3,4})\b/);
  if (flightMatch) {
    input.flightNumber = flightMatch[1].replace(/\s/g, '');
  }

  // Extract data usage
  if (/\b(light|small|minimal)\b/i.test(lowerText)) input.dataUsage = 'light';
  else if (/\b(heavy|large|lots|much)\b/i.test(lowerText)) input.dataUsage = 'heavy';
  else if (/\b(medium|moderate|normal)\b/i.test(lowerText)) input.dataUsage = 'medium';

  return input;
}

/**
 * Main agent function - processes message and returns response
 */
export async function processMessage(context: AgentContext): Promise<AgentResponse> {
  const startTime = Date.now();
  const { userId, channelId, messageText, recentMessages = [], tripContext } = context;

  // Generate conversation ID (use channelId as conversation identifier)
  const conversationId = channelId || `conv_${userId}`;

  // Load memory
  const longTermMemory = getLongTermMemory(userId);
  const shortTermMemory = getShortTermMemory(userId, conversationId);

  // Extract and save preferences from message
  const preferenceUpdates = extractPreferences(userId, messageText);
  for (const update of preferenceUpdates) {
    updateLongTermMemory(userId, update);
  }

  // Add user message to short-term memory
  addMessageToMemory(userId, conversationId, 'user', messageText);

  // Update short-term memory with active trip if mentioned
  if (tripContext) {
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
  }

  // Detect intent
  const intent = detectIntent(messageText);
  
  // Get personality traits
  const personality = getPersonalityTraits(longTermMemory);
  
  // Map intent to tool
  const toolName = intentToTool(intent);
  const toolCalls: ToolCall[] = [];

  let toolResult: any = null;
  let finalResponseText = '';

  // Execute tool if needed
  if (toolName) {
    try {
      const toolInput = extractToolInput(intent, messageText, tripContext);
      toolResult = await executeTool(toolName, toolInput, { userId, channelId, tripContext });
      
      toolCalls.push({
        tool: toolName,
        input: toolInput,
        result: toolResult,
      });

      // If tool provides a user message, use it as base
      if (toolResult.userMessage) {
        finalResponseText = toolResult.userMessage;
      }
    } catch (error) {
      console.error(`[Agent] Tool execution error for ${toolName}:`, error);
      toolCalls.push({
        tool: toolName,
        input: {},
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  // Generate natural language response using LLM
  // Only call LLM if we don't have a good tool response or need to enhance it
  if (!finalResponseText || intent === 'general.chat' || intent === 'unknown') {
    try {
      // Query memory for relevant context
      const memoryQuery = queryMemory(userId, messageText, conversationId);
      
      const messages: ZhipuMessage[] = [
        {
          role: 'system',
          content: getSystemPrompt(longTermMemory, shortTermMemory, tripContext),
        },
      ];

      // Add memory context if found (but explain naturally, not technically)
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

      finalResponseText = await callZhipuAI(messages);
      
      // Format with personality
      const isFirstInteraction = (longTermMemory.metadata.totalConversations || 0) === 0;
      finalResponseText = formatWithPersonality(finalResponseText, personality, {
        isFirstInteraction,
      });
    } catch (error) {
      console.error('[Agent] LLM error:', error);
      // Fallback to tool message or default response
      if (toolResult?.userMessage) {
        finalResponseText = toolResult.userMessage;
      } else {
        // Provide a helpful fallback response
        finalResponseText = "I'm here to help! Could you rephrase that? I want to make sure I understand what you need.";
      }
    }
  } else {
    // Format tool-provided message with personality
    finalResponseText = formatWithPersonality(finalResponseText, personality);
  }

  // Ensure we always have a response
  if (!finalResponseText || finalResponseText.trim() === '') {
    finalResponseText = "I'm here to help! Could you tell me more about what you're looking for?";
  }

  // Sanitize response - remove any internal action mentions
  finalResponseText = sanitizeResponse(finalResponseText);

  // Add AI message to short-term memory
  addMessageToMemory(userId, conversationId, 'ai', finalResponseText);

  // Update long-term memory metadata
  updateLongTermMemory(userId, {
    type: 'metadata',
    key: 'totalConversations',
    value: (longTermMemory.metadata.totalConversations || 0) + 1,
    timestamp: new Date().toISOString(),
  });

  const duration = Date.now() - startTime;

  // Query memory again for logging
  const memoryQuery = queryMemory(userId, messageText, conversationId);

  // Log (without secrets or full message content)
  const logData = {
    intent,
    tool: toolName || 'none',
    duration,
    userId,
    channelId,
    messageLength: messageText.length,
    hasToolResult: !!toolResult,
    hasMemory: memoryQuery.found,
  };
  console.log('[Agent] Processed message:', logData);

  return {
    text: finalResponseText,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    intent,
  };
}

