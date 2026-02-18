/**
 * Stream Sync Service
 * Sync Prisma FeedItems to Stream Activity Feeds
 */

import { prisma } from '../db/client.js';
import { syncFeedItemToStream } from '../services/stream/collections.js';
import { getUserFeed } from '../services/stream/feedsClient.js';
import { isStreamFeedsEnabled } from '../services/stream/feedsClient.js';
import type { FeedItem } from '@gepanda/shared';

/**
 * Sync a single feed item to Stream
 */
export async function syncFeedItemToStreamActivity(item: FeedItem, userId?: string): Promise<void> {
  if (!isStreamFeedsEnabled()) {
    return;
  }

  try {
    // 1. Sync to collection
    await syncFeedItemToStream(item);

    // 2. If userId provided, add activity to user feed
    if (userId) {
      const userFeed = getUserFeed('user', userId);
      
      // Determine verb based on item type
      let verb = 'post';
      if (item.type === 'deal') verb = 'share_deal';
      else if (item.type === 'product') verb = 'share_product';
      else if (item.type === 'article') verb = 'share_article';
      else if (item.type === 'destination') verb = 'share_destination';

      await userFeed.addActivity({
        actor: `user:${userId}`,
        verb: verb,
        object: `feed_item:${item.id}`,
        time: new Date(item.createdAt).toISOString(),
        foreign_id: `feed_item:${item.id}`,
        // Custom fields for ranking
        to: [
          `topic:${item.category || 'general'}`,
        ],
      });
    }
  } catch (error) {
    console.error(`[Stream Sync] Error syncing feed item ${item.id}:`, error);
    // Don't throw - sync failures shouldn't break the app
  }
}

/**
 * Sync all existing feed items to Stream (batch operation)
 * Use this for initial migration
 */
export async function syncAllFeedItemsToStream(): Promise<{ synced: number; errors: number }> {
  if (!isStreamFeedsEnabled()) {
    console.warn('[Stream Sync] Stream Feeds not enabled, skipping batch sync');
    return { synced: 0, errors: 0 };
  }

  if (!prisma) {
    console.warn('[Stream Sync] Prisma not available, skipping batch sync');
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  try {
    // Get all feed items in batches
    const batchSize = 100;
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const items = await prisma.feedItem.findMany({
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { createdAt: 'desc' },
      });

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      // Sync each item
      for (const item of items) {
        try {
          await syncFeedItemToStreamActivity({
            id: item.id,
            type: item.type as any, // Cast to FeedItemType
            category: (item.category as any) || null, // Cast to FeedItemCategory
            title: item.title,
            description: item.description,
            mediaUrl: item.mediaUrl,
            source: item.source,
            affiliateUrl: item.affiliateUrl,
            tagsJson: item.tagsJson as string[] | null,
            score: item.score,
            affiliateValue: (item as any).affiliateValue || 0,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          });
          synced++;
        } catch (error) {
          console.error(`[Stream Sync] Error syncing item ${item.id}:`, error);
          errors++;
        }
      }

      cursor = items[items.length - 1]?.id;
      hasMore = items.length === batchSize;
    }

    console.log(`[Stream Sync] Batch sync complete: ${synced} synced, ${errors} errors`);
  } catch (error) {
    console.error('[Stream Sync] Error in batch sync:', error);
  }

  return { synced, errors };
}
