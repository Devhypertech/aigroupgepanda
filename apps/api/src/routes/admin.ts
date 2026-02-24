/**
 * Admin API Routes
 * Admin-only endpoints for viewing users and their behavior
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';
import { requireAdmin } from '../middleware/admin.js';
import { streamServerClient, AI_COMPANION_USER_ID } from '../services/stream/streamClient.js';

const router = Router();

/**
 * GET /api/admin/users
 * Get all users with detailed information (admin only)
 * Returns:
 * - Users list with emails
 * - Full interests list (not just count)
 * - Saved feed items (full list)
 * - AI conversation history (from Stream Chat)
 */
router.get('/users', requireAdmin(), async (req, res) => {
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
    const includeHistory = req.query.includeHistory === 'true';

    // Build where clause for search
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users with full details
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          interests: {
            include: {
              interest: {
                select: {
                  id: true,
                  slug: true,
                  label: true,
                  group: true,
                },
              },
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

    const userIds = users.map(u => u.id);

    // Get saved feed items for all users
    const savedItems = await prisma.feedInteraction.findMany({
      where: {
        userId: { in: userIds },
        action: 'save',
      },
      include: {
        feedItem: {
          select: {
            id: true,
            title: true,
            type: true,
            category: true,
            url: true,
            imageUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group saved items by userId
    const savedItemsByUser = new Map<string, any[]>();
    for (const savedItem of savedItems) {
      if (!savedItemsByUser.has(savedItem.userId)) {
        savedItemsByUser.set(savedItem.userId, []);
      }
      savedItemsByUser.get(savedItem.userId)!.push({
        id: savedItem.feedItem.id,
        title: savedItem.feedItem.title,
        type: savedItem.feedItem.type,
        category: savedItem.feedItem.category,
        url: savedItem.feedItem.url,
        imageUrl: savedItem.feedItem.imageUrl,
        savedAt: savedItem.createdAt.toISOString(),
      });
    }

    // Get AI conversation history from Stream Chat (if requested)
    const conversationHistoryByUser = new Map<string, any[]>();
    
    if (includeHistory) {
      // Fetch conversation history for each user from their companion channel
      for (const user of users) {
        try {
          const channelId = `ai-${user.id}`;
          const channelType = 'messaging';
          const channelInstance = streamServerClient.channel(channelType, channelId);
          
          // Try to query messages (channel might not exist)
          try {
            const messagesResponse = await channelInstance.query({
              messages: { limit: 50 }, // Get last 50 messages
            });
            
            const messages = (messagesResponse.messages || []).map((msg: any) => ({
              id: msg.id,
              text: msg.text || '',
              isAI: msg.user?.id === AI_COMPANION_USER_ID,
              timestamp: msg.created_at ? new Date(msg.created_at).toISOString() : null,
              hasUI: !!(msg.attachments?.find((att: any) => att.type === 'ui_spec') || msg.ui_spec),
            }));
            
            conversationHistoryByUser.set(user.id, messages);
          } catch (error: any) {
            // Channel doesn't exist or error fetching - set empty array
            if (error.status !== 404) {
              console.warn(`[Admin] Error fetching conversation history for user ${user.id}:`, error);
            }
            conversationHistoryByUser.set(user.id, []);
          }
        } catch (error) {
          console.warn(`[Admin] Error accessing Stream channel for user ${user.id}:`, error);
          conversationHistoryByUser.set(user.id, []);
        }
      }
    }

    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      interests: user.interests.map(ui => ({
        id: ui.interest.id,
        name: ui.interest.label,
        slug: ui.interest.slug,
        group: ui.interest.group,
      })),
      interestsCount: user.interests.length,
      savedItems: savedItemsByUser.get(user.id) || [],
      savedCount: (savedItemsByUser.get(user.id) || []).length,
      conversationHistory: includeHistory ? (conversationHistoryByUser.get(user.id) || []) : undefined,
      conversationCount: includeHistory ? (conversationHistoryByUser.get(user.id) || []).length : undefined,
    }));

    res.json({
      users: formattedUsers,
      total: totalCount,
      limit,
      offset,
      includeHistory,
    });
  } catch (error) {
    console.error('[Admin Users] Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed information for a specific user (admin only)
 */
router.get('/users/:userId', requireAdmin(), async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    const { userId } = req.params;
    const includeHistory = req.query.includeHistory !== 'false'; // Default to true

    // Get user with full details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        interests: {
          include: {
            interest: {
              select: {
                id: true,
                slug: true,
                label: true,
                group: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Get saved feed items
    const savedItems = await prisma.feedInteraction.findMany({
      where: {
        userId: user.id,
        action: 'save',
      },
      include: {
        feedItem: {
          select: {
            id: true,
            title: true,
            type: true,
            category: true,
            description: true,
            url: true,
            imageUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get AI conversation history from Stream Chat
    let conversationHistory: any[] = [];
    
    if (includeHistory) {
      try {
        const channelId = `ai-${user.id}`;
        const channelType = 'messaging';
        const channelInstance = streamServerClient.channel(channelType, channelId);
        
        try {
          const messagesResponse = await channelInstance.query({
            messages: { limit: 100 }, // Get last 100 messages for detailed view
          });
          
          conversationHistory = (messagesResponse.messages || []).map((msg: any) => ({
            id: msg.id,
            text: msg.text || '',
            isAI: msg.user?.id === AI_COMPANION_USER_ID,
            timestamp: msg.created_at ? new Date(msg.created_at).toISOString() : null,
            hasUI: !!(msg.attachments?.find((att: any) => att.type === 'ui_spec') || msg.ui_spec),
            uiSpec: msg.attachments?.find((att: any) => att.type === 'ui_spec')?.ui_spec || msg.ui_spec,
          }));
        } catch (error: any) {
          if (error.status !== 404) {
            console.warn(`[Admin] Error fetching conversation history for user ${user.id}:`, error);
          }
        }
      } catch (error) {
        console.warn(`[Admin] Error accessing Stream channel for user ${user.id}:`, error);
      }
    }

    // Format response
    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      interests: user.interests.map(ui => ({
        id: ui.interest.id,
        name: ui.interest.label,
        slug: ui.interest.slug,
        group: ui.interest.group,
      })),
      interestsCount: user.interests.length,
      savedItems: savedItems.map(savedItem => ({
        id: savedItem.feedItem.id,
        title: savedItem.feedItem.title,
        type: savedItem.feedItem.type,
        category: savedItem.feedItem.category,
        description: savedItem.feedItem.description,
        url: savedItem.feedItem.url,
        imageUrl: savedItem.feedItem.imageUrl,
        savedAt: savedItem.createdAt.toISOString(),
      })),
      savedCount: savedItems.length,
      conversationHistory,
      conversationCount: conversationHistory.length,
    };

    res.json(formattedUser);
  } catch (error) {
    console.error('[Admin Users] Error fetching user:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

