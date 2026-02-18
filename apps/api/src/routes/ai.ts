import { Router } from 'express';
import { z } from 'zod';
import { streamServerClient, AI_COMPANION_USER_ID } from '../services/stream/streamClient.js';
import { processMessage } from '../agent/index.js';
import { validateAndEnforceAiOnlyMembership } from '../services/stream/channelValidator.js';
import { callZhipuAI, type ZhipuMessage } from '../services/ai/zhipu.js';

const router = Router();

// Request body validation schema for /api/ai/message
const aiMessageSchema = z.object({
  userId: z.string().min(1),
  channelId: z.string().min(1),
  text: z.string().min(1),
});

// Request body validation schema for /api/ai/reply
const aiReplySchema = z.object({
  userId: z.string().min(1),
  channelId: z.string().min(1),
  text: z.string().min(1),
});

// POST /api/ai/message - Process message with agent and return response
router.post('/message', async (req, res) => {
  const startTime = Date.now();
  console.log('[AI Message] Request received:', { 
    channelId: req.body.channelId, 
    userId: req.body.userId,
    textLength: req.body.text?.length 
  });

  try {
    // Validate input
    const validationResult = aiMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { userId, channelId, text } = validationResult.data;

    // ALWAYS enforce AI-only channel membership
    // Channel must be ai_user_<userId> format with only user + bot as members
    if (!channelId.startsWith(`ai_user_${userId}`)) {
      return res.status(403).json({
        error: 'Invalid channel',
        message: 'Channel must be an AI-only channel for this user',
      });
    }

    // Validate and enforce membership (removes any invalid members)
    await validateAndEnforceAiOnlyMembership(channelId, userId);

    // Get recent messages from the channel for context
    const channelType = 'messaging';
    const channelInstance = streamServerClient.channel(channelType, channelId);
    
    let recentMessages: any[] = [];
    try {
      const messagesResponse = await channelInstance.query({
        messages: { limit: 10 },
      });
      recentMessages = messagesResponse.messages || [];
    } catch (error) {
      console.warn('Could not fetch recent messages for context:', error);
    }

    // Process message with agent
    // Agent handles memory loading, trip context, and all orchestration internally
    console.log('[AI Message] Calling processMessage...', {
      userId,
      channelId,
      textLength: text.length,
      recentMessagesCount: recentMessages.length,
    });
    
    const agentResponse = await processMessage({
      userId,
      channelId,
      messageText: text,
      recentMessages: recentMessages.map((msg: any) => ({
        text: msg.text || '',
        userId: msg.user?.id || '',
        username: msg.user?.name || '',
        kind: msg.user?.id === AI_COMPANION_USER_ID ? 'AI' : 'USER',
      })),
    });
    
    console.log('[AI Message] processMessage completed:', {
      intent: agentResponse.intent,
      responseLength: agentResponse.text?.length || 0,
    });

    // Post AI response to Stream channel as AI Companion user
    try {
      await channelInstance.sendMessage({
        text: agentResponse.text,
        user_id: AI_COMPANION_USER_ID,
      });
      const duration = Date.now() - startTime;
      console.log('[AI Message] Success - posted to channel in', duration, 'ms');
    } catch (error) {
      console.error('[AI Message] Error sending AI message to Stream:', error);
      return res.status(500).json({
        error: 'Failed to post AI message to channel',
      });
    }

    const totalDuration = Date.now() - startTime;
    res.json({
      success: true,
      message: 'AI reply posted to channel',
      text: agentResponse.text,
      intent: agentResponse.intent,
      duration: totalDuration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[AI Message] Error after', duration, 'ms:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
  }
});

// POST /api/ai/reply - Direct Zhipu GLM-4.6 Flash call and post to Stream channel
router.post('/reply', async (req, res) => {
  const startTime = Date.now();
  console.log('[AI Reply] Request received:', { 
    channelId: req.body.channelId, 
    userId: req.body.userId,
    textLength: req.body.text?.length 
  });

  try {
    // Validate input
    const validationResult = aiReplySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { userId, channelId, text } = validationResult.data;

    // Validate channel format: ai-{userId}
    if (!channelId.startsWith(`ai-${userId}`)) {
      return res.status(403).json({
        error: 'Invalid channel',
        message: 'Channel must be a companion channel for this user',
      });
    }

    // Get recent messages from the channel for context
    const channelType = 'messaging';
    const channelInstance = streamServerClient.channel(channelType, channelId);
    
    let recentMessages: any[] = [];
    try {
      const messagesResponse = await channelInstance.query({
        messages: { limit: 10 },
      });
      recentMessages = messagesResponse.messages || [];
    } catch (error) {
      console.warn('[AI Reply] Could not fetch recent messages for context:', error);
    }

    // Build messages for Zhipu AI
    const messages: ZhipuMessage[] = [
      {
        role: 'system',
        content: 'You are GePanda AI, a helpful travel companion. You assist users with travel planning, recommendations, and answering questions about destinations, flights, hotels, and travel products. Be friendly, concise, and helpful.',
      },
    ];

    // Add recent messages for context (last 10)
    for (const msg of recentMessages.slice(-10)) {
      if (msg.user?.id === AI_COMPANION_USER_ID) {
        messages.push({
          role: 'assistant',
          content: msg.text || '',
        });
      } else {
        messages.push({
          role: 'user',
          content: msg.text || '',
        });
      }
    }

    // Add the current user message
    messages.push({
      role: 'user',
      content: text,
    });

    // Call Zhipu GLM-4.6 Flash
    console.log('[AI Reply] Calling Zhipu GLM-4.6 Flash...', {
      userId,
      channelId,
      messageCount: messages.length,
    });
    
    const replyText = await callZhipuAI(messages);
    
    console.log('[AI Reply] Zhipu response received:', {
      responseLength: replyText.length,
    });

    // Post AI response to Stream channel as AI Companion user
    try {
      await channelInstance.sendMessage({
        text: replyText,
        user_id: AI_COMPANION_USER_ID,
      });
      const duration = Date.now() - startTime;
      console.log('[AI Reply] Success - posted to channel in', duration, 'ms');
    } catch (error) {
      console.error('[AI Reply] Error sending AI message to Stream:', error);
      return res.status(500).json({
        error: 'Failed to post AI message to channel',
      });
    }

    const totalDuration = Date.now() - startTime;
    res.json({
      success: true,
      message: 'AI reply posted to channel',
      text: replyText,
      duration: totalDuration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[AI Reply] Error after', duration, 'ms:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
  }
});

export default router;

