/**
 * Feed Repository
 * Database operations for FeedItem
 */

import { prisma } from '../db/client.js';
import type { FeedItemType, FeedItemCategory, FeedQuery } from './schemas.js';
import { createId } from '@paralleldrive/cuid2';
import { rankFeedItems, type RankingContext } from './ranking.js';
import { SEED_FEED_ITEMS } from './seed.js';

// Helper to convert Prisma date to ISO string
function formatFeedItem(item: any) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    affiliateValue: item.affiliateValue ?? 0.0,
  };
}

/**
 * Seed feed items into database
 */
export async function seedFeedItems(): Promise<void> {
  if (!prisma) {
    console.warn('[Feed] Prisma not available, skipping seed');
    return;
  }

  try {
    // Check if items already exist
    const count = await prisma.feedItem.count();
    if (count > 0) {
      console.log(`[Feed] Database already has ${count} feed items, skipping seed`);
      return;
    }

    // Insert seed items
    const items = SEED_FEED_ITEMS.map(item => ({
      id: createId(),
      type: item.type,
      category: item.category,
      title: item.title,
      description: item.description,
      mediaUrl: item.mediaUrl,
      source: item.source || 'Seed Data',
      externalId: `seed_${item.title.toLowerCase().replace(/\s+/g, '_')}`,
      affiliateUrl: item.affiliateUrl,
      tagsJson: item.tagsJson as any,
      score: item.score,
      affiliateValue: item.affiliateValue ?? 0.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await prisma.feedItem.createMany({
      data: items,
      skipDuplicates: true,
    });

    console.log(`[Feed] Seeded ${items.length} feed items`);
  } catch (error) {
    console.error('[Feed] Error seeding feed items:', error);
    throw error;
  }
}

/**
 * Get feed items with filters and pagination
 */
export async function getFeedItems(
  query: FeedQuery,
  rankingContext?: RankingContext
): Promise<{ items: any[]; nextCursor: string | null }> {
  if (!prisma) {
    console.error('[Feed] Prisma not available, cannot fetch feed items');
    throw new Error('Database not available');
  }

  try {
    const { category, type, cursor, limit, tagFilter, lens, interests } = query;

    // Build where clause
    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (type) {
      where.type = type;
    }
    // Filter by lens if specified (don't default - allow all lenses if not specified)
    if (lens) {
      where.lens = lens;
    }
    if (cursor) {
      // Cursor-based pagination: items created before cursor timestamp
      const cursorDate = new Date(parseInt(cursor));
      where.createdAt = { lt: cursorDate };
    }

    // Query items - fetch more than limit to account for filtering
    // If no ranking context, sort by score (trending) first, then recency
    // If ranking context exists, sort by recency first (ranking will re-sort by effectiveScore)
    let items = await prisma.feedItem.findMany({
      where,
      orderBy: rankingContext
        ? [
            // With ranking: sort by recency first, ranking will re-sort by effectiveScore
            { createdAt: 'desc' },
          ]
        : [
            // Without ranking: sort by score (trending) first, then recency
            { score: 'desc' },
            { createdAt: 'desc' },
          ],
      take: (limit + 1) * 3, // Fetch 3x to account for tag/interest filtering
    });
    
    console.log('[Feed Repository] Fetched items from DB:', {
      count: items.length,
      hasTagFilter: !!tagFilter,
      hasInterests: !!interests,
      lens,
      category,
    });

    // Filter by tag if specified (filter after query since Prisma JSON filtering is complex)
    if (tagFilter) {
      items = items.filter(item => {
        const tags = (item.tagsJson as string[]) || [];
        return tags.includes(tagFilter);
      });
    }

    // Filter by interests if specified (comma-separated list)
    if (interests) {
      const interestList = interests.split(',').map(i => i.trim().toLowerCase());
      const beforeFilter = items.length;
      items = items.filter(item => {
        const tags = ((item.tagsJson as string[]) || []).map(t => t.toLowerCase());
        return interestList.some(interest => tags.includes(interest));
      });
      console.log('[Feed Repository] Filtered by interests:', {
        before: beforeFilter,
        after: items.length,
        interests: interestList,
      });
      
      // If filtering by interests results in no items, return popular items instead
      if (items.length === 0 && interestList.length > 0) {
        console.log('[Feed Repository] No items match interests, falling back to popular items');
        // Re-fetch without interest filter but keep other filters
        const fallbackQuery = { ...query, interests: undefined };
        // Prevent infinite recursion by checking if we're already in a fallback
        if (!(query as any)._isFallback) {
          (fallbackQuery as any)._isFallback = true;
          return getFeedItems(fallbackQuery, rankingContext);
        }
      }
    }

    // Check if there's a next page (after filtering)
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    
    console.log('[Feed Repository] Final items after filtering:', {
      total: items.length,
      returned: resultItems.length,
      hasMore,
      tagFilter,
      interests,
    });

    // Generate next cursor (timestamp of last item's publishedAt or createdAt)
    const nextCursor = hasMore && resultItems.length > 0
      ? ((resultItems[resultItems.length - 1] as any).publishedAt || resultItems[resultItems.length - 1].createdAt).getTime().toString()
      : null;

    const formattedItems = resultItems.map(item => formatFeedItem({
      ...item,
      tagsJson: item.tagsJson as string[] | null,
    }));

    // Apply ranking if context provided
    let rankedItems = formattedItems;
    if (rankingContext) {
      rankedItems = await rankFeedItems(formattedItems, rankingContext);
    }

    return {
      items: rankedItems,
      nextCursor,
    };
  } catch (error) {
    console.error('[Feed] Error fetching feed items:', error);
    throw error; // Don't fallback to seed data - always use database
  }
}

// Removed getFeedItemsFromSeed - feed should only use database content

