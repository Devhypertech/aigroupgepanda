/**
 * Tool Calling Module
 * Handles tool execution with Zod validation
 */

import { intentToTool, executeTool } from '../tools/registry.js';
import { validateToolInput } from '../tools/schemas.js';
import type { Intent, ToolCall, ToolResult } from './types.js';

export interface ToolExecutionContext {
  userId: string;
  channelId: string;
  tripContext?: any;
}

/**
 * Extract parameters from message text for tool input
 * Simple extraction - can be enhanced with LLM
 */
function extractToolInput(
  intent: Intent,
  messageText: string,
  tripContext?: any
): Record<string, any> {
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
 * Execute tool for intent with validation
 */
export async function callTool(
  intent: Intent,
  messageText: string,
  context: ToolExecutionContext
): Promise<{ toolCall?: ToolCall; result?: ToolResult }> {
  // Map intent to tool
  const toolName = intentToTool(intent);
  
  if (!toolName) {
    // No tool needed for this intent
    return {};
  }

  try {
    // Extract tool input
    const toolInput = extractToolInput(intent, messageText, context.tripContext);
    
    // Validate input with Zod
    const validation = validateToolInput(toolName, toolInput);
    if (!validation.valid) {
      console.warn(`[Agent Tools] Invalid tool input for ${toolName}:`, validation.error);
      return {
        toolCall: {
          tool: toolName,
          input: toolInput,
          result: {
            success: false,
            error: validation.error || 'Invalid input',
            userMessage: "I'm having trouble understanding that. Could you provide more details?",
          },
        },
        result: {
          success: false,
          error: validation.error || 'Invalid input',
          userMessage: "I'm having trouble understanding that. Could you provide more details?",
        },
      };
    }

    // Execute tool
    const toolResult = await executeTool(toolName, validation.data!, {
      userId: context.userId,
      channelId: context.channelId,
      tripContext: context.tripContext,
    });

    // Validate output (if schema exists)
    // Note: Output validation is optional as tools should return correct format
    const toolCall: ToolCall = {
      tool: toolName,
      input: validation.data!,
      result: toolResult,
    };

    return { toolCall, result: toolResult };
  } catch (error) {
    console.error(`[Agent Tools] Tool execution error for ${toolName}:`, error);
    return {
      toolCall: {
        tool: toolName,
        input: {},
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          userMessage: "I encountered an issue processing that. Could you try again?",
        },
      },
      result: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: "I encountered an issue processing that. Could you try again?",
      },
    };
  }
}

