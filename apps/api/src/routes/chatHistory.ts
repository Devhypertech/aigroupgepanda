/**
 * Chat History API Routes
 * Persistent chat history using raw SQL/PostgreSQL
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  createConversation,
  getConversationById,
  getConversationsByUserId,
  getLastConversationByUserId,
  createMessage,
  getMessagesByConversationId,
  createUser,
} from '../db/chatDb.js';
import { generateChatResponse } from '../chat/respond.js';

const router = Router();

// Request schemas
const startConversationSchema = z.object({
  userId: z.string().min(1),
  title: z.string().optional(),
});

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  message: z.string().min(1),
});

/**
 * POST /api/chat/start
 * Create a new conversation
 */
router.post('/start', async (req, res) => {
  try {
    const validationResult = startConversationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { userId, title } = validationResult.data;

    // Create conversation
    const conversation = await createConversation(userId, title);

    res.json({
      id: conversation.id,
      userId: conversation.user_id,
      title: conversation.title,
      createdAt: conversation.created_at,
    });
  } catch (error) {
    console.error('[ChatHistory] Error creating conversation:', error);
    res.status(500).json({
      error: 'Failed to create conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/chat/message
 * Save user message, call AI, save assistant reply
 */
router.post('/message', async (req, res) => {
  try {
    const validationResult = sendMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { conversationId, userId, message } = validationResult.data;

    // Verify conversation exists and belongs to user
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Conversation does not belong to user',
      });
    }

    // Save user message first
    const userMessage = await createMessage(conversationId, 'user', message);

    // Get conversation history for context
    const history = await getMessagesByConversationId(conversationId);
    const recentMessages = history.slice(-10).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Call AI to generate response
    let aiResponse: { reply: string; ui?: any; text?: string };
    try {
      // Convert messages to format expected by generateChatResponse
      const formattedMessages = recentMessages.map(msg => ({
        text: msg.content,
        role: msg.role,
      }));
      
      aiResponse = await generateChatResponse(
        message,
        formattedMessages,
        true, // uiMode
        undefined, // tripState
      );
    } catch (aiError) {
      console.error('[ChatHistory] AI response error:', aiError);
      aiResponse = {
        reply: 'I apologize, but I encountered an error processing your message. Please try again.',
        text: 'I apologize, but I encountered an error processing your message. Please try again.',
      };
    }

    // Save assistant message
    const assistantMessage = await createMessage(
      conversationId,
      'assistant',
      aiResponse.reply || aiResponse.text || '',
      aiResponse.ui ? { ui: aiResponse.ui } : undefined
    );

    res.json({
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.created_at,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        metadata: assistantMessage.metadata,
        createdAt: assistantMessage.created_at,
      },
      ui: aiResponse.ui,
    });
  } catch (error) {
    console.error('[ChatHistory] Error sending message:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/chat/history/:userId
 * List all conversations for a user
 */
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const conversations = await getConversationsByUserId(userId, limit);

    res.json({
      conversations: conversations.map(conv => ({
        id: conv.id,
        userId: conv.user_id,
        title: conv.title,
        createdAt: conv.created_at,
      })),
      count: conversations.length,
    });
  } catch (error) {
    console.error('[ChatHistory] Error getting conversation history:', error);
    res.status(500).json({
      error: 'Failed to get conversation history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/chat/conversation/:id
 * Fetch all messages for a conversation
 */
router.get('/conversation/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await getConversationById(id);
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    const messages = await getMessagesByConversationId(id);

    res.json({
      conversation: {
        id: conversation.id,
        userId: conversation.user_id,
        title: conversation.title,
        createdAt: conversation.created_at,
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.created_at,
      })),
      count: messages.length,
    });
  } catch (error) {
    console.error('[ChatHistory] Error getting conversation:', error);
    res.status(500).json({
      error: 'Failed to get conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

