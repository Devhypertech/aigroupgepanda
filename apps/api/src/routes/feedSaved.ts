/**
 * Saved Feed Items API Routes
 * Manage user's saved feed items
 * Supports both authenticated users and guest users
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { getCurrentUser } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/feed/:id/save
 * Save a feed item
 */
router.post('/:id/save', async (req, res) => {
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
    console.error('[Feed Saved] Error saving item:', error);
    res.status(500).json({
      error: 'Failed to save item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/feed/:id/save
 * Unsave a feed item
 */
router.delete('/:id/save', async (req, res) => {
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
    console.error('[Feed Saved] Error unsaving item:', error);
    res.status(500).json({
      error: 'Failed to unsave item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/feed/saved
 * Get all saved feed items for the current user
 * Query params: cursor?, limit? (default 20)
 */
router.get('/saved', async (req, res) => {
  try {
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

    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string || '20', 10);

    // Determine if it's a real user or guest
    const isGuest = currentUser.type === 'guest';

    // Build where clause
    const where: any = {
      action: 'save',
      OR: [
        { userId: isGuest ? undefined : userId },
        { guestUserId: isGuest ? userId : undefined },
      ],
    };

    if (cursor) {
      const cursorDate = new Date(parseInt(cursor));
      where.createdAt = { lt: cursorDate };
    }

    // Get saved interactions
    const savedInteractions = await (prisma as any).feedInteraction.findMany({
      where,
      include: {
        feedItem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1, // Fetch one extra to check if there's more
    });

    // Check if there's a next page
    const hasMore = savedInteractions.length > limit;
    const resultInteractions = hasMore ? savedInteractions.slice(0, limit) : savedInteractions;

    // Generate next cursor
    const nextCursor = hasMore && resultInteractions.length > 0
      ? resultInteractions[resultInteractions.length - 1].createdAt.getTime().toString()
      : null;

    // Format feed items
    const items = resultInteractions.map((interaction: any) => ({
      ...interaction.feedItem,
      createdAt: interaction.feedItem.createdAt.toISOString(),
      updatedAt: interaction.feedItem.updatedAt.toISOString(),
      savedAt: interaction.createdAt.toISOString(),
    }));

    res.json({
      items,
      nextCursor,
    });
  } catch (error) {
    console.error('[Feed Saved] Error fetching saved items:', error);
    res.status(500).json({
      error: 'Failed to fetch saved items',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
