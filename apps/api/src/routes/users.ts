/**
 * Users API Routes
 * Admin-only endpoints for managing users
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';
import { requireAdmin } from '../middleware/admin.js';

const router = Router();

/**
 * GET /api/users
 * Get all users with counts (admin only)
 * Returns: Array of users with id, name, email, createdAt, interestsCount, savedCount
 * 
 * Note: This route must be registered AFTER /api/users/me/interests to avoid route conflicts
 */
router.get('/', requireAdmin(), async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Get query params for search and pagination
    const search = (req.query.search as string)?.toLowerCase().trim() || '';
    const limit = parseInt(req.query.limit as string || '100', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    // Build where clause for search
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users with counts
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: {
            select: {
              interests: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    // Get saved counts for each user
    const userIds = users.map(u => u.id);
    const savedCounts = await (prisma as any).feedInteraction.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        action: 'save',
      },
      _count: {
        id: true,
      },
    });

    // Create a map of userId -> savedCount
    const savedCountMap = new Map(
      savedCounts.map((sc: any) => [sc.userId, sc._count.id])
    );

    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      interestsCount: user._count.interests,
      savedCount: savedCountMap.get(user.id) || 0,
    }));

    res.json({
      users: formattedUsers,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Users] Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

