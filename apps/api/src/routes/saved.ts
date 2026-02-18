/**
 * Saved Items API Routes
 * POST /api/saved/:id - Save a feed item
 * DELETE /api/saved/:id - Unsave a feed item
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';
import { getCurrentUser } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/saved/:id
 * Save a feed item
 */
router.post('/:id', async (req, res) => {
  try {
    const feedItemId = req.params.id;
    const currentUser = await getCurrentUser(req, res);

    if (!currentUser) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User ID required',
      });
    }

    const userId = currentUser.id;

    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Check if item exists
    const feedItem = await prisma.feedItem.findUnique({
      where: { id: feedItemId },
    });

    if (!feedItem) {
      return res.status(404).json({
        error: 'Feed item not found',
      });
    }

    // Determine if it's a real user or guest
    const isGuest = currentUser.type === 'guest';

    // Check if already saved
    const existing = await (prisma as any).feedInteraction.findUnique({
      where: {
        userId_feedItemId_action: isGuest ? undefined : { userId, feedItemId, action: 'save' },
        guestUserId_feedItemId_action: isGuest ? { guestUserId: userId, feedItemId, action: 'save' } : undefined,
      },
    });

    if (existing) {
      // Already saved
      return res.json({
        success: true,
        saved: true,
        message: 'Item already saved',
      });
    }

    // Create save interaction
    await (prisma as any).feedInteraction.create({
      data: {
        userId: isGuest ? undefined : userId,
        guestUserId: isGuest ? userId : undefined,
        feedItemId,
        action: 'save',
      },
    });

    return res.json({
      success: true,
      saved: true,
      message: 'Item saved successfully',
    });
  } catch (error) {
    console.error('[Saved] Error saving item:', error);
    res.status(500).json({
      error: 'Failed to save item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/saved/:id
 * Unsave a feed item
 */
router.delete('/:id', async (req, res) => {
  try {
    const feedItemId = req.params.id;
    const currentUser = await getCurrentUser(req, res);

    if (!currentUser) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User ID required',
      });
    }

    const userId = currentUser.id;

    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Determine if it's a real user or guest
    const isGuest = currentUser.type === 'guest';

    // Find and delete save interaction
    const deleted = await (prisma as any).feedInteraction.deleteMany({
      where: {
        feedItemId,
        action: 'save',
        OR: [
          { userId: isGuest ? undefined : userId },
          { guestUserId: isGuest ? userId : undefined },
        ],
      },
    });

    if (deleted.count === 0) {
      return res.json({
        success: true,
        saved: false,
        message: 'Item not saved',
      });
    }

    return res.json({
      success: true,
      saved: false,
      message: 'Item unsaved successfully',
    });
  } catch (error) {
    console.error('[Saved] Error unsaving item:', error);
    res.status(500).json({
      error: 'Failed to unsave item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

