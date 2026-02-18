/**
 * Tool Router - Handles tool selection, execution, and result processing
 * 
 * Rules:
 * - AI selects tools based on intent
 * - Tools return structured data
 * - AI converts tool output into natural language
 * - User never sees tool names
 */

import type { Intent } from '../agent/types.js';
import type { ToolResult, ToolCall } from '../agent/types.js';
import { intentToTool, executeTool } from './registry.js';
import { validateToolInput, getToolSchema } from './schemas.js';

export interface ToolRouterContext {
  userId: string;
  channelId: string;
  messageText: string;
  tripContext?: any;
  recentMessages?: any[];
}

export interface ToolRouterResult {
  toolCalls: ToolCall[];
  finalResult: ToolResult | null;
  shouldCallLLM: boolean; // Whether to pass results to LLM for natural language generation
}

/**
 * Router that selects and executes tools based on intent
 */
export class ToolRouter {
  /**
   * Route intent to tool and execute
   */
  static async route(
    intent: Intent,
    context: ToolRouterContext
  ): Promise<ToolRouterResult> {
    const toolCalls: ToolCall[] = [];
    
    // Map intent to tool
    const toolName = intentToTool(intent);
    
    if (!toolName) {
      // No tool needed - direct LLM call
      return {
        toolCalls: [],
        finalResult: null,
        shouldCallLLM: true,
      };
    }

    // Extract tool input from message and context
    const toolInput = this.extractToolInput(intent, toolName, context);
    
    // Validate input against schema
    const validation = validateToolInput(toolName, toolInput);
    if (!validation.valid) {
      return {
        toolCalls: [{
          tool: toolName,
          input: toolInput,
          result: {
            success: false,
            error: validation.error,
            userMessage: "I'm having trouble understanding that. Could you provide more details?",
          },
        }],
        finalResult: {
          success: false,
          error: validation.error,
          userMessage: "I'm having trouble understanding that. Could you provide more details?",
        },
        shouldCallLLM: false,
      };
    }

    // Execute tool
    try {
      const toolResult = await executeTool(toolName, validation.data!, {
        userId: context.userId,
        channelId: context.channelId,
        tripContext: context.tripContext,
      });

      toolCalls.push({
        tool: toolName,
        input: validation.data!,
        result: toolResult,
      });

      // Determine if we need LLM to convert result to natural language
      const shouldCallLLM = !toolResult.userMessage || this.needsLLMEnhancement(toolResult);

      return {
        toolCalls,
        finalResult: toolResult,
        shouldCallLLM,
      };
    } catch (error) {
      const errorResult: ToolResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        userMessage: "I encountered an issue processing that. Please try again.",
      };

      toolCalls.push({
        tool: toolName,
        input: validation.data!,
        result: errorResult,
      });

      return {
        toolCalls,
        finalResult: errorResult,
        shouldCallLLM: false,
      };
    }
  }

  /**
   * Extract tool input from message text and context
   */
  private static extractToolInput(
    intent: Intent,
    toolName: string,
    context: ToolRouterContext
  ): Record<string, any> {
    const { messageText, tripContext } = context;
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

    // Extract based on tool type
    switch (toolName) {
      case 'travel.planTrip':
      case 'travel.buildItinerary':
        // Extract destination
        const destMatch = messageText.match(/\b(?:to|in|visiting|going to|travel to)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/);
        if (destMatch) input.destination = destMatch[1].trim();
        
        // Extract dates
        const dateMatches = messageText.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g);
        const dates = Array.from(dateMatches).map(m => m[1]);
        if (dates[0]) input.startDate = dates[0];
        if (dates[1]) input.endDate = dates[1];
        
        // Extract duration
        const durationMatch = lowerText.match(/(\d+)\s*(?:day|days)/);
        if (durationMatch) {
          const days = parseInt(durationMatch[1], 10);
          if (!input.endDate && input.startDate) {
            const start = new Date(input.startDate);
            start.setDate(start.getDate() + days);
            input.endDate = start.toISOString().split('T')[0];
          }
        }
        
        // Extract travelers
        const travelersMatch = lowerText.match(/(\d+)\s*(?:people|person|travelers|traveler)/);
        if (travelersMatch) input.travelers = parseInt(travelersMatch[1], 10);
        
        // Extract budget
        const budgetMatch = messageText.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:to|-)?\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)?/);
        if (budgetMatch) {
          input.budget = budgetMatch[2] 
            ? `$${budgetMatch[1]} - $${budgetMatch[2]}`
            : `$${budgetMatch[1]}`;
        }
        
        // Extract interests
        const interestsKeywords = ['museums', 'food', 'nature', 'beaches', 'nightlife', 'shopping', 'culture', 'adventure'];
        const foundInterests = interestsKeywords.filter(keyword => 
          lowerText.includes(keyword)
        );
        if (foundInterests.length > 0) {
          input.interests = foundInterests;
        }
        break;

      case 'travel.flightStatus':
        // Extract flight number
        const flightMatch = messageText.match(/\b([A-Z]{2,3}\s?\d{3,4})\b/);
        if (flightMatch) input.flightNumber = flightMatch[1].replace(/\s/g, '');
        
        // Extract airline
        const airlines = ['united', 'delta', 'american', 'lufthansa', 'emirates', 'qatar', 'japan airlines'];
        for (const airline of airlines) {
          if (lowerText.includes(airline)) {
            input.airline = airline;
            break;
          }
        }
        
        // Extract date
        const flightDateMatch = messageText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        if (flightDateMatch) input.date = flightDateMatch[1];
        break;

      case 'connectivity.recommendEsim':
      case 'connectivity.purchaseEsim':
        // Extract destination (reuse from above)
        const esimDestMatch = messageText.match(/\b(?:to|in|visiting|going to|travel to)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/);
        if (esimDestMatch) input.destination = esimDestMatch[1].trim();
        
        // Extract duration
        const esimDurationMatch = lowerText.match(/(\d+)\s*(?:day|days|week|weeks)/);
        if (esimDurationMatch) {
          const num = parseInt(esimDurationMatch[1], 10);
          const unit = esimDurationMatch[2];
          input.duration = unit.includes('week') ? num * 7 : num;
        }
        
        // Extract data usage
        if (/\b(light|small|minimal|basic)\b/i.test(lowerText)) input.dataUsage = 'light';
        else if (/\b(heavy|large|lots|much|unlimited)\b/i.test(lowerText)) input.dataUsage = 'heavy';
        else if (/\b(medium|moderate|normal)\b/i.test(lowerText)) input.dataUsage = 'medium';
        
        // Extract data amount
        const dataMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:gb|gigabytes?)/);
        if (dataMatch) input.dataAmount = parseFloat(dataMatch[1]);
        break;

      case 'stream.sendMessage':
        input.channelId = context.channelId;
        input.text = messageText;
        input.userId = context.userId;
        break;

      case 'memory.save':
      case 'memory.load':
        input.userId = context.userId;
        // Extract key from message (simplified)
        const keyMatch = messageText.match(/\b(save|remember|store)\s+(\w+)/i);
        if (keyMatch) input.key = keyMatch[2];
        break;

      case 'notification.send':
        input.userId = context.userId;
        input.channelId = context.channelId;
        // Extract notification type
        if (/\b(remind|reminder)\b/i.test(lowerText)) input.type = 'reminder';
        else if (/\b(alert|urgent)\b/i.test(lowerText)) input.type = 'alert';
        else if (/\b(update)\b/i.test(lowerText)) input.type = 'update';
        else input.type = 'info';
        
        // Extract title and message (simplified)
        input.title = 'Travel Update';
        input.message = messageText;
        break;
    }

    return input;
  }

  /**
   * Determine if tool result needs LLM enhancement
   */
  private static needsLLMEnhancement(result: ToolResult): boolean {
    // If tool provides userMessage, use it directly
    if (result.userMessage) {
      return false;
    }
    
    // If tool has structured data but no user message, need LLM
    if (result.success && result.data) {
      return true;
    }
    
    // Errors can be handled directly
    return false;
  }

  /**
   * Chain multiple tools if needed
   * Example: planTrip -> buildItinerary -> recommendEsim
   */
  static async chainTools(
    toolNames: string[],
    context: ToolRouterContext,
    previousResults?: ToolResult[]
  ): Promise<ToolRouterResult> {
    const toolCalls: ToolCall[] = [];
    let lastResult: ToolResult | null = null;

    for (const toolName of toolNames) {
      // Extract input for this tool
      const toolInput = this.extractToolInput('general.chat' as Intent, toolName, context);
      const validation = validateToolInput(toolName, toolInput);
      if (!validation.valid) {
        continue;
      }

      try {
        const result = await executeTool(toolName, validation.data!, {
          userId: context.userId,
          channelId: context.channelId,
          tripContext: context.tripContext,
          previousResults,
        });

        toolCalls.push({
          tool: toolName,
          input: validation.data!,
          result,
        });

        lastResult = result;
        previousResults = previousResults || [];
        previousResults.push(result);
        
        // Update context with results for next tool
        if (result.data) {
          context.tripContext = { ...context.tripContext, ...result.data };
        }
      } catch (error) {
        // Continue with next tool on error
        continue;
      }
    }

    return {
      toolCalls,
      finalResult: lastResult,
      shouldCallLLM: lastResult ? this.needsLLMEnhancement(lastResult) : true,
    };
  }
}

