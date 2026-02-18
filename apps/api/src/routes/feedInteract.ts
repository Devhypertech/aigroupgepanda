/**
 * Feed Interact API Route (Alias)
 * Simplified endpoint for POST /api/feed/interact
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { getCurrentUser } from '../middleware/auth.js';
import { trackEngagement, trackImpression } from '../services/stream/analytics.js';

const router = Router();

const interactionSchema = z.object({
  feedItemId: z.string().min(1),
  action: z.enum(['click', 'save', 'view', 'like', 'unlike', 'not_interested']),
});

/**
 * POST /api/feed/interact
 * Record a user interaction with a feed item
 * DEV bypass: userId can be omitted in development
 */
router.post('/', async (req, res) => {
  try {
    // Get current user (real or guest)
    const currentUser = await getCurrentUser(req, res);
    
    if (!currentUser) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }
    
    const userId = currentUser.id;

    const validationResult = interactionSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { feedItemId, action } = validationResult.data;

    // Unlike: delete the like interaction
    if (action === 'unlike') {
      if (!prisma) {
        if (process.env.NODE_ENV === 'development') {
          return res.json({ success: true, message: 'Unlike recorded (dev mode)' });
        }
        return res.status(503).json({ error: 'Database not available' });
      }
      await (prisma as any).feedInteraction.deleteMany({
        where: { userId, feedItemId, action: 'like' },
      });
      return res.json({ success: true, message: 'Unliked' });
    }

    if (!prisma) {
      // In development, allow without database
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          success: true,
          message: 'Interaction recorded (dev mode, no database)',
        });
      }
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Upsert interaction (unique on userId + feedItemId + action)
    const interaction = await (prisma as any).feedInteraction.upsert({
      where: {
        userId_feedItemId_action: {
          userId,
          feedItemId,
          action,
        },
      },
      update: {
        createdAt: new Date(), // Update timestamp on repeat action
      },
      create: {
        userId,
        feedItemId,
        action,
      },
    });

    // Track engagement in Stream Analytics (non-blocking)
    try {
      if (action === 'view') {
        await trackImpression(userId, feedItemId);
      } else {
        await trackEngagement(userId, feedItemId, action);
      }
    } catch (error) {
      console.warn('[Feed Interact] Failed to track engagement in Stream:', error);
      // Continue even if Stream tracking fails
    }

    res.json({
      success: true,
      interaction: {
        id: interaction.id,
        userId: interaction.userId,
        feedItemId: interaction.feedItemId,
        action: interaction.action,
        createdAt: interaction.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[Feed Interact] Error recording interaction:', error);
    res.status(500).json({
      error: 'Failed to record interaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

