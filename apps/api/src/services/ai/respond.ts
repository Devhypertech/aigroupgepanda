/**
 * Reusable AI Response Service
 * Generates assistant replies using Zhipu GLM-4 Flash
 */

import { callZhipuAI, type ZhipuMessage } from './zhipu.js';

export interface GenerateAssistantReplyOptions {
  message: string;
  userId: string;
  sessionId?: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  systemPrompt?: string;
}

export interface GenerateAssistantReplyResult {
  text: string;
  raw?: string;
  toolCalls?: any[];
}

const DEFAULT_SYSTEM_PROMPT = `You are GePanda AI, a helpful travel companion. You assist users with travel planning, recommendations, and answering questions about destinations, flights, hotels, and travel products. Be friendly, concise, and helpful. Ask 1-2 clarifying questions when needed.`;

/**
 * Generate assistant reply using Zhipu GLM-4 Flash
 */
export async function generateAssistantReply(
  options: GenerateAssistantReplyOptions
): Promise<GenerateAssistantReplyResult> {
  const logPrefix = '[AI_RESPOND_SERVICE]';
  const { message, userId, sessionId, history = [], systemPrompt = DEFAULT_SYSTEM_PROMPT } = options;
  
  console.log(`${logPrefix} Generating assistant reply:`, {
    userId: userId ? `${userId.substring(0, 8)}...` : 'MISSING',
    sessionId: sessionId ? `${sessionId.substring(0, 20)}...` : 'MISSING',
    messageLength: message.length,
    historyLength: history.length,
  });

  try {
    // Build messages array for Zhipu AI
    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add history messages for context
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: message,
    });

    console.log(`${logPrefix} Calling Zhipu AI with ${messages.length} messages`);

    // Call Zhipu AI
    const aiResponse = await callZhipuAI(messages);

    console.log(`${logPrefix} ✅ AI response received:`, {
      responseLength: aiResponse.length,
      preview: aiResponse.substring(0, 100),
    });

    return {
      text: aiResponse,
      raw: aiResponse,
    };
  } catch (error) {
    console.error(`${logPrefix} ❌ ERROR generating assistant reply:`);
    console.error(`${logPrefix} Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`${logPrefix} Error message: ${error instanceof Error ? error.message : String(error)}`);
    
    if (error instanceof Error) {
      console.error(`${logPrefix} Error stack:`, error.stack);
    }
    
    throw error;
  }
}

