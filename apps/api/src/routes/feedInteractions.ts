/**
 * Feed Interactions API Routes
 * Track user interactions with feed items
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';

const router = Router();

const interactionSchema = z.object({
  userId: z.string().min(1).optional(), // Optional for DEV bypass
  feedItemId: z.string().min(1),
  action: z.enum(['click', 'save', 'view', 'like']),
});

/**
 * POST /api/feed/interact
 * Record a user interaction with a feed item (simplified endpoint)
 * DEV bypass: userId can be omitted in development
 */
router.post('/interact', async (req, res) => {
  try {
    // Allow DEV bypass: use header or body userId, or generate one in dev
    const userId = req.body.userId || req.headers['x-user-id'] as string || 
      (process.env.NODE_ENV === 'development' ? 'dev_user' : undefined);

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    const validationResult = z.object({
      feedItemId: z.string().min(1),
      action: z.enum(['click', 'save', 'view', 'like']),
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { feedItemId, action } = validationResult.data;

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
    console.error('[Feed Interactions] Error recording interaction:', error);
    res.status(500).json({
      error: 'Failed to record interaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/feed/interactions
 * Record a user interaction with a feed item (original endpoint)
 */
router.post('/', async (req, res) => {
  try {
    // Allow DEV bypass: use header or body userId, or generate one in dev
    const userId = req.body.userId || req.headers['x-user-id'] as string || 
      (process.env.NODE_ENV === 'development' ? 'dev_user' : undefined);

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    const validationResult = z.object({
      feedItemId: z.string().min(1),
      action: z.enum(['click', 'save', 'view', 'like']),
    }).safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { feedItemId, action } = validationResult.data;

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
    console.error('[Feed Interactions] Error recording interaction:', error);
    res.status(500).json({
      error: 'Failed to record interaction',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/feed/interactions
 * Get user's interactions (optional: filter by feedItemId or action)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const feedItemId = req.query.feedItemId as string | undefined;
    const action = req.query.action as string | undefined;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    const where: any = { userId };
    if (feedItemId) {
      where.feedItemId = feedItemId;
    }
    if (action) {
      where.action = action;
    }

    const interactions = await (prisma as any).feedInteraction.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      interactions: interactions.map(i => ({
        id: i.id,
        userId: i.userId,
        feedItemId: i.feedItemId,
        action: i.action,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Feed Interactions] Error fetching interactions:', error);
    res.status(500).json({
      error: 'Failed to fetch interactions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

