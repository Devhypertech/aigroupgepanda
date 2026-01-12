import { callZhipuAI, type ZhipuMessage } from './zhipu.js';
import { RoomTemplate } from '@gepanda/shared';

export interface GenerateAIReplyInput {
  roomId: string;
  roomTemplate: string;
  triggeringMessage: {
    id: string;
    text: string;
    userId: string;
    username: string;
  };
  recentMessages: Array<{
    id: string;
    text: string;
    userId: string;
    username: string;
    kind: 'USER' | 'AI';
  }>;
  tripContext?: any; // Optional trip context JSON data
}

export interface GenerateAIReplyOutput {
  replyText: string;
  audience: 'GROUP';
}

function getSystemPrompt(roomTemplate: string, tripContext?: any): string {
  let basePrompt = `You are GePanda AI, a helpful travel assistant in a group chat. You help travelers plan trips, answer questions, and provide recommendations.`;

  // Add template-specific context
  switch (roomTemplate) {
    case RoomTemplate.TRAVEL_PLANNING:
      basePrompt += ` This is a travel planning room. Help users plan their trip, suggest destinations, activities, and accommodations.`;
      break;
    case RoomTemplate.LIVE_TRIP:
      basePrompt += ` This is a live trip room. Users are currently traveling. Help with real-time questions, local recommendations, and travel support.`;
      break;
    case RoomTemplate.FLIGHT_TRACKING:
      basePrompt += ` This is a flight tracking room. Help users track flights, understand delays, and provide airport information.`;
      break;
    case RoomTemplate.FOOD_DISCOVERY:
      basePrompt += ` This is a food discovery room. Help users find restaurants, local cuisine, and dining recommendations.`;
      break;
    default:
      basePrompt += ` Help users with their travel-related questions.`;
  }

  // Add trip context if available - with intelligent handling
  if (tripContext) {
    const hasDestination = tripContext.destination && tripContext.destination.trim() !== '';
    const hasDates = tripContext.startDate && tripContext.endDate;
    const hasTravelers = tripContext.travelers && tripContext.travelers > 0;
    
    if (hasDestination || hasDates || hasTravelers) {
      // Context is well-defined - tailor responses
      basePrompt += `\n\nTRIP CONTEXT (use this to tailor your responses):`;
      if (hasDestination) {
        basePrompt += `\n- Destination: ${tripContext.destination}`;
      }
      if (hasDates) {
        basePrompt += `\n- Travel Dates: ${tripContext.startDate} to ${tripContext.endDate}`;
      }
      if (hasTravelers) {
        basePrompt += `\n- Number of Travelers: ${tripContext.travelers}`;
      }
      if (tripContext.budgetRange) {
        basePrompt += `\n- Budget Range: ${tripContext.budgetRange}`;
      }
      if (tripContext.interests && tripContext.interests.length > 0) {
        basePrompt += `\n- Interests: ${tripContext.interests.join(', ')}`;
      }
      if (tripContext.notes) {
        basePrompt += `\n- Notes: ${tripContext.notes}`;
      }
      basePrompt += `\n\nWhen users ask questions, reference this trip context naturally. Provide specific recommendations based on their destination, dates, and preferences.`;
    } else {
      // Context is incomplete - ask clarifying questions
      basePrompt += `\n\nTRIP CONTEXT (incomplete): Some trip details are missing.`;
      basePrompt += `\n\nWhen users ask planning questions, ask 1-2 clarifying questions to understand their destination, travel dates, or number of travelers before providing recommendations. Be helpful but don't guess - ask for specifics.`;
    }
  } else {
    // No context - ask for information
    basePrompt += `\n\nNo trip context is set yet. When users ask planning questions, politely ask 1-2 key questions (like destination, dates, or number of travelers) to better assist them.`;
  }

  basePrompt += `\n\nKeep your responses concise, friendly, and helpful. Respond naturally to the conversation.`;

  return basePrompt;
}

/**
 * Check if user message asks for real-time facts that require live data
 */
function isRealTimeQuestion(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Keywords that indicate real-time information requests
  const realTimePatterns = [
    /\b(current|today|now|right now|live|real-time|real time)\b.*\b(president|weather|temperature|price|cost|rate|exchange rate|stock|news|headline|status|delay|on time)\b/i,
    /\b(who is|what is|what's)\b.*\b(current|now|today)\b.*\b(president|leader|prime minister|weather|price|news)\b/i,
    /\b(weather|temperature|forecast)\b.*\b(today|now|current|right now)\b/i,
    /\b(price|cost|rate|exchange rate|stock price)\b.*\b(current|now|today|live)\b/i,
    /\b(news|headline|breaking|latest)\b.*\b(today|now|current)\b/i,
    /\b(flight|train|bus)\b.*\b(status|delay|on time|arrival|departure)\b/i,
    /\b(what time is it|what's the time|current time)\b/i,
    /\b(how much|what's the price|what does.*cost)\b.*\b(now|today|current)\b/i,
  ];
  
  return realTimePatterns.some(pattern => pattern.test(lowerText));
}

export async function generateAIReply(
  input: GenerateAIReplyInput
): Promise<GenerateAIReplyOutput> {
  try {
    // Check if user is asking for real-time facts
    const userMessage = input.triggeringMessage.text;
    if (isRealTimeQuestion(userMessage)) {
      return {
        replyText: "I don't have access to real-time information like current weather, live prices, breaking news, or flight status. For the most up-to-date information, I recommend checking official sources, weather apps, news websites, or airline/train websites directly. However, I'm happy to help with travel planning, destination recommendations, itinerary suggestions, and general travel advice!",
        audience: 'GROUP',
      };
    }

    // Build messages for Zhipu AI
    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt(input.roomTemplate, input.tripContext),
      },
    ];

    // Add recent messages for context (last 10)
    const recentContext = input.recentMessages.slice(-10);
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

    // Add the triggering message
    messages.push({
      role: 'user',
      content: `${input.triggeringMessage.username}: ${input.triggeringMessage.text}`,
    });

    // Call Zhipu AI
    const replyText = await callZhipuAI(messages);

    return {
      replyText,
      audience: 'GROUP',
    };
  } catch (error) {
    console.error('Error generating AI reply:', error);
    // Fallback response
    return {
      replyText: "I'm here to help! However, I'm experiencing some technical difficulties. Please try again in a moment.",
      audience: 'GROUP',
    };
  }
}

