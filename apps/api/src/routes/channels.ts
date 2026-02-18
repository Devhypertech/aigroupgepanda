import { Router } from 'express';
import { z } from 'zod';
import { getOrCreateAiChannel } from '../services/stream/channelHelpers.js';
import { streamServerClient, AI_COMPANION_USER_ID } from '../services/stream/streamClient.js';
import { validateAndEnforceAiOnlyMembership } from '../services/stream/channelValidator.js';

const router = Router();

// Validation schema
const createAiChannelSchema = z.object({
  userId: z.string().min(1),
});

/**
 * POST /api/channels/ai
 * Get or create an AI-only channel for a user
 * Channel ID: ai_user_<userId>
 * Members: [userId, AI_COMPANION_USER_ID] only
 * 
 * Returns: { channelId }
 */
router.post('/ai', async (req, res) => {
  try {
    // Validate input
    const validationResult = createAiChannelSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { userId } = validationResult.data;

    // Get or create AI channel (enforces AI-only membership)
    const channelInfo = await getOrCreateAiChannel(userId);

    // Double-check membership is correct
    await validateAndEnforceAiOnlyMembership(channelInfo.channelId, userId);

    res.json({
      channelId: channelInfo.channelId,
    });
  } catch (error) {
    console.error('[Channels] Error creating/getting AI channel:', error);
    res.status(500).json({
      error: 'Failed to create/get AI channel',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/channels/dm
 * @deprecated Use POST /api/channels/ai instead
 * Kept for backward compatibility
 */
router.post('/dm', async (req, res) => {
  try {
    const validationResult = createAiChannelSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { userId } = validationResult.data;
    const channelInfo = await getOrCreateAiChannel(userId);
    await validateAndEnforceAiOnlyMembership(channelInfo.channelId, userId);

    res.json({
      success: true,
      channelId: channelInfo.channelId,
      channelType: channelInfo.channelType,
      members: channelInfo.members,
    });
  } catch (error) {
    console.error('[Channels] Error creating/getting DM channel:', error);
    res.status(500).json({
      error: 'Failed to create/get DM channel',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Guard: Block any attempt to add members to a channel
 * This endpoint should not exist, but if called, it will be blocked
 */
router.post('/:channelId/members', async (req, res) => {
  res.status(403).json({
    error: 'Adding members to channels is not allowed',
    message: 'AI-only channels cannot have additional members',
  });
});

export default router;

