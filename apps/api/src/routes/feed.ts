/**
 * Feed API Routes
 * Social Activity Feed with filtering, pagination, and ranking
 */

import { Router } from 'express';
import { FeedQuerySchema } from '../feed/schemas.js';
import { getFeedItems } from '../feed/repository.js';
import { getUserSignals } from '../signals/updateSignals.js';
import { prisma } from '../db/client.js';
import { getCurrentUser } from '../middleware/auth.js';
import type { RankingContext } from '../feed/ranking.js';

const router = Router();

/**
 * GET /api/feed
 * Get feed items with optional filters, pagination, and personalized ranking
 * 
 * Query params:
 * - category?: Filter by category (deals|guides|reels|ai-news|for-you)
 *   - deals -> category: 'deals'
 *   - guides -> category: 'travel' OR type: 'article'
 *   - reels -> type: 'video'
 *   - ai-news -> category: 'tech'
 *   - for-you -> personalized based on user interests (default if no category)
 * - lens?: Filter by lens ('traveler' | 'founder' | 'investor')
 * - interests?: Comma-separated list of interests to filter by tags
 * - cursor?: Pagination cursor (timestamp)
 * - limit?: Max items to return (default: 20, max: 50)
 * - userId?: User ID for personalized ranking (optional but recommended)
 */
router.get('/', async (req, res) => {
  const logPrefix = '[FEED]';
  console.log(`${logPrefix} GET /api/feed`, {
    category: req.query.category,
    cursor: req.query.cursor,
    limit: req.query.limit,
  });
  
  try {
    // Map UI category to database category/type/tag filter
    const uiCategory = req.query.category as string | undefined;
    let dbCategory: string | undefined;
    let dbType: string | undefined;
    let tagFilter: string | undefined;
    let usePersonalization = false;

    if (uiCategory === 'deals') {
      // Filter by tag "deals"
      tagFilter = 'deals';
    } else if (uiCategory === 'guides') {
      // Filter by tag "guides"
      tagFilter = 'guides';
    } else if (uiCategory === 'reels') {
      // Filter by tag "reels"
      tagFilter = 'reels';
    } else if (uiCategory === 'ai-news') {
      // Filter by tag "ai-news"
      tagFilter = 'ai-news';
    } else if (uiCategory === 'for-you' || !uiCategory) {
      // For "for-you" or no category, return mixed feed (no tag filter)
      // Mixed feed until personalization is added
      tagFilter = undefined; // No tag filter = mixed feed
    } else {
      // Fallback: use category as-is
      dbCategory = uiCategory;
    }

    // Get lens and interests from query params
    // Don't default lens - allow all lenses if not specified
    const lens = req.query.lens as 'traveler' | 'founder' | 'investor' | undefined;
    const interests = req.query.interests as string | undefined;

    // Validate query params
    const validationResult = FeedQuerySchema.safeParse({
      category: dbCategory,
      type: dbType || req.query.type,
      tagFilter,
      lens,
      interests,
      cursor: req.query.cursor,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: validationResult.error.issues,
      });
    }

    let query = validationResult.data;
    
    // Get current user (real or guest)
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id;

    // Load user interests if available
    let userInterests: string[] = [];
    if (userId) {
      try {
        const userInterestRecords = await (prisma as any).userInterest.findMany({
          where: { userId },
          include: { interest: true },
        });
        userInterests = userInterestRecords.map((ui: any) => ui.interest.slug);
        console.log('[Feed] Loaded user interests:', userInterests);
      } catch (error) {
        console.warn('[Feed] Could not load user interests:', error);
      }
    }
    
    // If user has interests and viewing "for-you" category, filter by interests
    if (userInterests.length > 0 && (uiCategory === 'for-you' || !uiCategory)) {
      // For "for-you" category, filter by user interests
      // Map interests to tags (interests are slugs like 'japan', 'europe', etc.)
      query.interests = userInterests.join(',');
    }

    // Build ranking context if userId provided
    let rankingContext: RankingContext | undefined;
    if (userId) {
      try {
        const userSignals = await getUserSignals(userId);
        
        // Load not interested preferences from user signals
        const notInterestedTags = (userSignals as any)?.notInterestedTags || [];
        const notInterestedCategories = (userSignals as any)?.notInterestedCategories || [];
        
        rankingContext = {
          userId,
          userSignals: {
            lastIntent: userSignals?.lastIntent || null,
            destinations: userSignals?.destinations || [],
            interests: userInterests,
            notInterestedTags,
            notInterestedCategories,
          },
        };
      } catch (error) {
        console.warn('[Feed] Could not load user signals, using default ranking:', error);
        rankingContext = {
          userId,
          userSignals: undefined,
        };
      }
    } else if (process.env.NODE_ENV === 'development') {
      // DEV bypass: allow ranking with dev_user
      rankingContext = {
        userId: 'dev_user',
        userSignals: undefined,
      };
    }

    // Auto-seed feed if database is empty (dev only)
    if (process.env.NODE_ENV !== 'production') {
      try {
        const feedCount = await prisma.feedItem.count();
        if (feedCount === 0) {
          console.log('[Feed] Database is empty, auto-seeding feed items...');
          // Import seed function dynamically to avoid circular dependencies
          const { seedFeedItems } = await import('../feed/repository.js');
          await seedFeedItems();
          console.log('[Feed] Auto-seeding complete');
        }
      } catch (seedError) {
        console.warn('[Feed] Auto-seeding failed (non-fatal):', seedError);
        // Continue even if seeding fails
      }
    }

    // Get feed items from database
    // Ranking will be applied if context provided
    // Items are sorted by effectiveScore (desc) in ranking.ts
    let { items, nextCursor } = await getFeedItems(query, rankingContext);

    // Fallback logic: If no items AND (user has no interests OR viewing "for-you" category)
    if (items.length === 0 && (userInterests.length === 0 || uiCategory === 'for-you' || !uiCategory)) {
      console.log('[Feed] Empty result, falling back to trending/seed content', {
        userId,
        hasInterests: userInterests.length > 0,
        category: uiCategory,
      });
      
      // Fallback to trending content (no interest filter, sorted by score)
      const fallbackQuery = {
        ...query,
        interests: undefined, // Remove interest filter
        tagFilter: undefined, // Remove tag filter for "for-you" fallback
      };
      
      // Fetch trending items (sorted by score, no filters)
      const fallbackResult = await getFeedItems(fallbackQuery, rankingContext);
      
      if (fallbackResult.items.length > 0) {
        items = fallbackResult.items;
        nextCursor = fallbackResult.nextCursor;
        console.log('[Feed] Fallback successful, returned', items.length, 'trending items');
      } else {
        // Last resort: Auto-seed if database is empty (dev only)
        if (process.env.NODE_ENV !== 'production') {
          try {
            const feedCount = await prisma.feedItem.count();
            if (feedCount === 0) {
              console.log('[Feed] Database is empty, auto-seeding feed items...');
              const { seedFeedItems } = await import('../feed/repository.js');
              await seedFeedItems();
              
              // Retry fetch after seeding
              const retryResult = await getFeedItems(fallbackQuery, rankingContext);
              items = retryResult.items;
              nextCursor = retryResult.nextCursor;
              console.log('[Feed] Auto-seeding complete, returned', items.length, 'items');
            }
          } catch (seedError) {
            console.warn('[Feed] Auto-seeding failed (non-fatal):', seedError);
          }
        }
      }
    }

    // Return response with ranked items
    console.log(`${logPrefix} Returning ${items.length} items to client`);
    
    res.json({
      items,
      nextCursor,
    });
  } catch (error) {
    console.error(`${logPrefix} Error fetching feed items:`, error);
    if (error instanceof Error) {
      console.error(`${logPrefix} Error stack:`, error.stack);
    }
    res.status(500).json({
      error: 'Failed to fetch feed items',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

