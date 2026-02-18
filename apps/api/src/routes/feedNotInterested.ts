/**
 * Not Interested API Route
 * Track items/tags user is not interested in
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';

const router = Router();

const notInterestedSchema = z.object({
  feedItemId: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
}).refine(data => data.feedItemId || data.tag || data.category, {
  message: 'Must provide feedItemId, tag, or category',
});

/**
 * POST /api/feed/not-interested
 * Mark item/tag/category as not interested
 * This will downrank similar items in future feed queries
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

    const validationResult = notInterestedSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.issues,
      });
    }

    const { feedItemId, tag, category } = validationResult.data;

    if (!prisma) {
      // In dev, allow without database
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          success: true,
          message: 'Not interested recorded (dev mode)',
        });
      }
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Store as a "not_interested" interaction
    // This can be used in ranking to downrank similar items
    if (feedItemId) {
      await (prisma as any).feedInteraction.upsert({
        where: {
          userId_feedItemId_action: {
            userId,
            feedItemId,
            action: 'not_interested',
          },
        },
        update: {
          createdAt: new Date(),
        },
        create: {
          userId,
          feedItemId,
          action: 'not_interested',
        },
      });
    }

    // Store tag/category preferences in UserSignals for ranking
    if (tag || category) {
      try {
        const userSignals = await (prisma as any).userSignals.findUnique({
          where: { userId },
        });

        const notInterestedTags = userSignals?.notInterestedTags 
          ? (userSignals.notInterestedTags as string[])
          : [];
        const notInterestedCategories = userSignals?.notInterestedCategories
          ? (userSignals.notInterestedCategories as string[])
          : [];

        const updatedTags = tag && !notInterestedTags.includes(tag)
          ? [...notInterestedTags, tag]
          : notInterestedTags;
        const updatedCategories = category && !notInterestedCategories.includes(category)
          ? [...notInterestedCategories, category]
          : notInterestedCategories;

        await (prisma as any).userSignals.upsert({
          where: { userId },
          update: {
            notInterestedTags: updatedTags,
            notInterestedCategories: updatedCategories,
            updatedAt: new Date(),
          },
          create: {
            userId,
            notInterestedTags: updatedTags,
            notInterestedCategories: updatedCategories,
          },
        });
      } catch (error) {
        console.warn('[Feed Not Interested] Could not update user signals:', error);
        // Continue even if signals update fails
      }
    }

    res.json({
      success: true,
      message: 'Not interested preference saved',
    });
  } catch (error) {
    console.error('[Feed Not Interested] Error recording preference:', error);
    res.status(500).json({
      error: 'Failed to record not interested preference',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

