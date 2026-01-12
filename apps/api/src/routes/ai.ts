import { Router } from 'express';
import { z } from 'zod';
import { streamServerClient } from '../services/stream/streamClient.js';
import { generateAIReply } from '../services/ai/orchestrator.js';
import { getTripContext } from '../services/tripContext/memoryStorage.js';

const router = Router();

// Request body validation schema
const aiReplySchema = z.object({
  channelId: z.string().min(1),
  roomId: z.string().min(1),
  roomTemplate: z.string(),
  userId: z.string().min(1),
  username: z.string().min(1),
  text: z.string().min(1),
});

// POST /api/ai/reply - Generate and post AI reply to Stream channel
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

    const { channelId, roomId, roomTemplate, userId, username, text } = validationResult.data;

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

    // Get trip context if available
    let tripContext: any = undefined;
    try {
      const contextRecord = getTripContext(roomId);
      tripContext = contextRecord?.data || undefined;
    } catch (error) {
      console.warn('Could not get trip context:', error);
    }

    // Generate AI reply
    const aiReply = await generateAIReply({
      roomId,
      roomTemplate,
      triggeringMessage: {
        id: '', // Not needed for this flow
        text,
        userId,
        username,
      },
      recentMessages: recentMessages.map((msg: any) => ({
        id: msg.id,
        text: msg.text || '',
        userId: msg.user?.id || '',
        username: msg.user?.name || '',
        kind: msg.user?.id === 'gepanda-ai' ? 'AI' : 'USER',
      })),
      tripContext,
    });

    // Post AI response to Stream channel as gepanda-ai user
    try {
      await channelInstance.sendMessage({
        text: aiReply.replyText,
        user_id: 'gepanda-ai',
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
      replyText: aiReply.replyText,
      duration: totalDuration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[AI Reply] Error after', duration, 'ms:', error);
    res.status(500).json({
      error: 'Failed to generate AI reply',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
  }
});

export default router;

