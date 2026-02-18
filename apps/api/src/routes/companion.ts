import { Router } from 'express';
import { z } from 'zod';
import { streamServerClient, AI_COMPANION_USER_ID } from '../services/stream/streamClient.js';

const router = Router();

// Validation schema
const createCompanionChannelSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().optional(), // Optional sessionId for backward compatibility
});

// GET /api/companion/channel - Help message (browser opens as GET)
router.get('/channel', (_req, res) => {
  res.status(405).json({
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST. Use Postman or the app.',
    usage: 'POST /api/companion/channel with body: { "userId": "string" }',
    testPage: 'http://localhost:3000/dev',
  });
});

/**
 * POST /api/companion/channel
 * Creates or retrieves a Stream channel with id `ai-{userId}`.
 * Adds the user and the AI user (gepanda_ai) as members.
 * Returns: { channelId }
 * 
 * Behavior:
 * - Input: { userId: string }
 * - Output: { channelId: `ai-${userId}` }
 * - Creates/ensures Stream channel exists if Stream keys are available
 * - Returns channelId regardless (idempotent) - even if Stream keys are missing
 */
router.post('/channel', async (req, res) => {
  const startTime = Date.now();
  
  // Validate input
  const validationResult = createCompanionChannelSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: validationResult.error.issues,
    });
  }

  const { userId, sessionId } = validationResult.data;

  // Channel ID: use provided sessionId, or generate ai-{userId}
  const channelId = sessionId || `ai-${userId}`;
  
  // Validate that channelId starts with ai-{userId} for security
  if (!channelId.startsWith(`ai-${userId}`)) {
    return res.status(400).json({
      error: 'Invalid sessionId',
      message: 'SessionId must start with ai-{userId}',
    });
  }

  // Check if Stream keys are available
  const hasStreamKeys = !!(process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET);
  
  if (!hasStreamKeys) {
    console.warn(`[Companion] ⚠️  Stream API keys not configured. Returning channelId without creating Stream channel.`);
    console.warn(`[Companion]    userId: ${userId}, channelId: ${channelId}`);
    // Still return channelId (idempotent behavior)
    return res.json({
      channelId,
      warning: 'Stream API keys not configured - channel not created in Stream',
    });
  }

  // Stream keys are available - proceed with channel creation/ensuring
  try {
    console.log(`[Companion] Creating/getting channel for userId: ${userId}, channelId: ${channelId}`);
    
    const channelType = 'messaging';
    
    // Get or create channel for this userId
    const channel = streamServerClient.channel(channelType, channelId, {
      created_by_id: userId,
    });

    const watchStart = Date.now();
    try {
      // Try to watch (channel exists) with timeout
      const watchPromise = channel.watch();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('channel.watch timeout after 5s')), 5000)
      );
      await Promise.race([watchPromise, timeoutPromise]);
      console.log(`[Companion] Channel watched successfully (${Date.now() - watchStart}ms)`);
    } catch (error: any) {
      // Channel doesn't exist, create it
      if (error.message?.includes('timeout')) {
        throw error;
      }
      console.log('[Companion] Channel not found, creating...');
      const createStart = Date.now();
      const createPromise = channel.create();
      const createTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('channel.create timeout after 5s')), 5000)
      );
      await Promise.race([createPromise, createTimeoutPromise]);
      console.log(`[Companion] Channel created successfully (${Date.now() - createStart}ms)`);
    }

    // Ensure user and AI are members
    const addMembersStart = Date.now();
    try {
      const addMembersPromise = channel.addMembers([userId, AI_COMPANION_USER_ID]);
      const addMembersTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('addMembers timeout after 5s')), 5000)
      );
      await Promise.race([addMembersPromise, addMembersTimeoutPromise]);
      console.log(`[Companion] Members added successfully (${Date.now() - addMembersStart}ms)`);
    } catch (error: any) {
      // Ignore "already a member" errors
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('timeout')) {
        throw error;
      }
      if (!errorMsg.includes('already a member') && !errorMsg.includes('already member')) {
        throw error;
      }
      console.log('[Companion] Members already added, continuing...');
    }

    console.log(`[Companion] Total channel request time: ${Date.now() - startTime}ms`);
    res.json({
      channelId,
    });
  } catch (error) {
    console.error('[Companion] Error creating/getting channel:', error);
    console.error('[Companion] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    });
    
    // Even on error, return channelId (idempotent behavior)
    // This allows frontend to continue even if Stream is temporarily unavailable
    console.warn(`[Companion] ⚠️  Stream operation failed, but returning channelId anyway (idempotent)`);
    res.json({
      channelId,
      warning: 'Stream channel creation failed - channelId returned anyway',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

