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
  let basePrompt = `You are "GePanda", a single AI travel companion inside a chat app.

The user experiences ONE continuous conversation. Never ask them to choose templates, rooms, or modes.

Never mention internal tools, function names, routing, models, or system architecture.

Primary goals:
1) Be a helpful, proactive travel companion.
2) Detect user intent from natural language.
3) Use internal tools when needed (trip planning, itinerary, flight status, eSIM recommendation, purchase checkout, Stream call/video).
4) Keep responses concise, warm, and conversational, like ChatGPT/Nomi.
5) When tool results are available, summarize them naturally and offer the next best step.

Rules:
- Do NOT reveal "tool calls" or tool outputs verbatim. Convert results into user-friendly language.
- If a tool fails or data is missing, respond gracefully and ask ONE targeted question.
- Always preserve user privacy. Do not request sensitive information unnecessarily.
- For purchase flows, present a clear confirmation step: "Want me to open checkout for this plan?"
- If the user requests a call/video, acknowledge and guide them to start it through the UI.

Tone:
Warm, confident, minimal fluff. Friendly travel companion energy.

Conversation behavior:
- If user is vague ("I'm going to Japan"), ask 1–2 clarifying questions: dates + style preferences.
- If user gives enough info, proceed with a plan and suggestions immediately.
- When recommending eSIM, ask duration + approximate data usage if unclear.`;

  // Add trip context if available - integrate naturally without mentioning "context"
  if (tripContext) {
    const hasDestination = tripContext.destination && tripContext.destination.trim() !== '';
    const hasDates = tripContext.startDate && tripContext.endDate;
    const hasTravelers = tripContext.travelers && tripContext.travelers > 0;
    
    if (hasDestination || hasDates || hasTravelers) {
      // Context is well-defined - use it naturally in responses
      basePrompt += `\n\nYou know the following about the user's trip:`;
      if (hasDestination) {
        basePrompt += `\n- They're planning to visit: ${tripContext.destination}`;
      }
      if (hasDates) {
        basePrompt += `\n- Travel dates: ${tripContext.startDate} to ${tripContext.endDate}`;
      }
      if (hasTravelers) {
        basePrompt += `\n- Traveling with: ${tripContext.travelers} ${tripContext.travelers === 1 ? 'person' : 'people'}`;
      }
      if (tripContext.budgetRange) {
        basePrompt += `\n- Budget: ${tripContext.budgetRange}`;
      }
      if (tripContext.interests && tripContext.interests.length > 0) {
        basePrompt += `\n- Interests: ${tripContext.interests.join(', ')}`;
      }
      if (tripContext.notes) {
        basePrompt += `\n- Additional notes: ${tripContext.notes}`;
      }
      basePrompt += `\n\nUse this information naturally in your responses. Reference it when relevant, but don't repeat it verbatim.`;
    } else {
      // Context is incomplete - ask clarifying questions naturally
      basePrompt += `\n\nThe user hasn't shared complete trip details yet. When they ask planning questions, naturally ask 1-2 clarifying questions (like destination, dates, or travel style) to provide better recommendations.`;
    }
  } else {
    // No context - be proactive but not pushy
    basePrompt += `\n\nWhen users share travel plans or ask questions, naturally gather key details (destination, dates, preferences) through conversation to provide personalized help.`;
  }

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

