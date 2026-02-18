/**
 * CompanionAgent - Main orchestrator for AI companion
 * 
 * Orchestrates:
 * 1) Loads memory + context
 * 2) Detects intent
 * 3) Calls tools (internal)
 * 4) Produces natural reply (no tool names)
 */

import { detectIntent } from './intent.js';
import { loadContext, saveResponse, queryMemoryContext } from './memory.js';
import { callTool } from './tools.js';
import { generateResponse } from './llm.js';
import { updateUserSignals } from '../signals/updateSignals.js';
import type { AgentContext, AgentResponse, Intent, ToolCall } from './types.js';

/**
 * Main agent function - processes message and returns response
 */
export async function processMessage(context: AgentContext): Promise<AgentResponse> {
  const startTime = Date.now();
  const { userId, channelId, messageText } = context;

  let intent: Intent = 'unknown';
  let toolCalls: ToolCall[] = [];
  let finalResponseText = '';

  try {
    // Step 1: Load memory + context
    const loadedContext = loadContext(context);
    const { longTermMemory, shortTermMemory, tripContext, recentMessages } = loadedContext;

    // Step 2: Detect intent
    intent = detectIntent(messageText);
    console.log(`[CompanionAgent] Intent detected: ${intent}`);

    // Step 3: Call tools (internal)
    let toolResult;
    if (intent !== 'general.chat' && intent !== 'unknown') {
      const toolExecution = await callTool(intent, messageText, {
        userId,
        channelId,
        tripContext,
      });

      if (toolExecution.toolCall) {
        toolCalls.push(toolExecution.toolCall);
      }

      toolResult = toolExecution.result;

      // If tool provides a user message, use it as base
      if (toolResult?.userMessage) {
        finalResponseText = toolResult.userMessage;
      }
    }

    // Step 4: Produce natural reply (no tool names)
    // Only call LLM if we don't have a good tool response or need to enhance it
    if (!finalResponseText || intent === 'general.chat' || intent === 'unknown') {
      try {
        finalResponseText = await generateResponse(messageText, loadedContext, toolResult);
      } catch (llmError) {
        console.error('[CompanionAgent] LLM error:', llmError);
        // Fallback to tool message or default response
        if (toolResult?.userMessage) {
          finalResponseText = toolResult.userMessage;
        } else {
          finalResponseText = "I'm here to help! I'm having a bit of trouble processing that right now. Could you try rephrasing?";
        }
      }
    } else {
      // Format tool-provided message with personality
      const personality = getPersonalityTraits(longTermMemory);
      finalResponseText = formatWithPersonality(finalResponseText, personality);
    }

    // Ensure we always have a response
    if (!finalResponseText || finalResponseText.trim() === '') {
      finalResponseText = "I'm here to help! Could you tell me more about what you're looking for?";
    }

    // Save response to memory
    saveResponse(userId, channelId, finalResponseText);

    // Update user signals for feed personalization
    try {
      await updateUserSignals(userId, messageText, intent);
    } catch (error) {
      console.warn('[CompanionAgent] Error updating signals:', error);
      // Don't fail - signal updates are non-critical
    }

    const duration = Date.now() - startTime;

    // Log (without secrets or full message content)
    const memoryQuery = queryMemoryContext(userId, channelId, messageText);
    console.log('[CompanionAgent] Processed message:', {
      intent,
      tool: toolCalls.length > 0 ? toolCalls[0].tool : 'none',
      duration,
      userId,
      channelId,
      messageLength: messageText.length,
      hasToolResult: !!toolResult,
      hasMemory: memoryQuery.found,
    });

    return {
      text: finalResponseText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      intent,
    };
  } catch (error) {
    // Resilient error handling - never break chat
    console.error('[CompanionAgent] Unexpected error:', error);
    
    // Return a helpful fallback response
    return {
      text: "I'm here to help! I encountered an unexpected issue. Could you try rephrasing your message?",
      intent: 'unknown',
    };
  }
}

import { getPersonalityTraits, formatWithPersonality } from '../services/memory/personality.js';

