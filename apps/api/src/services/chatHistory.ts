/**
 * Chat History Service
 * Handles saving and retrieving chat messages from Postgres
 */

import { prisma } from '../db/client.js';

export interface ChatMessageInput {
  userId: string;
  conversationId: string; // Stream Chat channel ID (sessionId)
  role: 'user' | 'assistant';
  message: string;
  ui?: any; // Optional UI JSON from AI response
}

/**
 * Save a chat message to the database
 */
export async function saveChatMessage(input: ChatMessageInput): Promise<void> {
  if (!prisma) {
    console.warn('[ChatHistory] Prisma not available, skipping message save');
    return;
  }

  try {
    // Find or create chat session by channelId
    // Using type assertion since Prisma client may need regeneration
    const session = await (prisma as any).chatSession.upsert({
      where: { channelId: input.conversationId },
      update: { updatedAt: new Date() },
      create: {
        userId: input.userId,
        channelId: input.conversationId,
      },
    });

    // Save the message
    await (prisma as any).chatMessage.create({
      data: {
        sessionId: session.id,
        userId: input.userId,
        role: input.role.toUpperCase() as 'USER' | 'ASSISTANT',
        text: input.message,
        ui: input.ui || null,
      },
    });

    console.log(`[ChatHistory] Saved ${input.role} message for user ${input.userId} in conversation ${input.conversationId}`);
  } catch (error) {
    console.error('[ChatHistory] Error saving chat message:', error);
    // Don't throw - allow chat to continue even if persistence fails
  }
}

/**
 * Get chat history for a user
 * @param userId User ID
 * @param conversationId Optional conversation ID (channelId) to filter by
 * @param limit Maximum number of messages to return (default: 50)
 * @returns Array of chat messages
 */
export async function getChatHistory(
  userId: string,
  conversationId?: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  message: string;
  conversationId: string;
  createdAt: Date;
  ui?: any;
}>> {
  if (!prisma) {
    console.warn('[ChatHistory] Prisma not available, returning empty history');
    return [];
  }

  try {
    const where: any = {
      userId,
    };

    // If conversationId is provided, filter by it
    if (conversationId) {
      const session = await (prisma as any).chatSession.findUnique({
        where: { channelId: conversationId },
      });

      if (session) {
        where.sessionId = session.id;
      } else {
        // Session doesn't exist, return empty array
        return [];
      }
    }

    const messages = await (prisma as any).chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        session: {
          select: {
            channelId: true,
          },
        },
      },
    });

    // Map to return format
    return messages.map(msg => ({
      id: msg.id,
      userId: msg.userId,
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      message: msg.text,
      conversationId: msg.session.channelId,
      createdAt: msg.createdAt,
      ui: msg.ui,
    })).reverse(); // Reverse to get chronological order (oldest first)
  } catch (error) {
    console.error('[ChatHistory] Error getting chat history:', error);
    return [];
  }
}

