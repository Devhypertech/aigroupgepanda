/**
 * Stream Collections Service
 * Manage collections for products, destinations, articles, etc.
 */

import { streamFeedsClient, isStreamFeedsEnabled } from './feedsClient.js';
import type { FeedItem } from '@gepanda/shared';

/**
 * Collection types
 */
export type CollectionType = 'feed_item' | 'product' | 'destination' | 'article';

/**
 * Upsert an item to a Stream collection
 */
export async function upsertCollectionItem(
  collectionType: CollectionType,
  itemId: string,
  data: Record<string, any>
): Promise<void> {
  if (!isStreamFeedsEnabled()) {
    console.warn('[Stream Collections] Stream Feeds not enabled, skipping collection upsert');
    return;
  }

  try {
    await streamFeedsClient!.collections.upsert(collectionType, {
      id: `${collectionType}:${itemId}`,
      data: {
        ...data,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error(`[Stream Collections] Error upserting ${collectionType}:${itemId}:`, error);
    throw error;
  }
}

/**
 * Delete an item from a Stream collection
 */
export async function deleteCollectionItem(
  collectionType: CollectionType,
  itemId: string
): Promise<void> {
  if (!isStreamFeedsEnabled()) {
    return;
  }

  try {
    await streamFeedsClient!.collections.delete(collectionType, `${collectionType}:${itemId}`);
  } catch (error) {
    console.error(`[Stream Collections] Error deleting ${collectionType}:${itemId}:`, error);
    throw error;
  }
}

/**
 * Sync a FeedItem to Stream Collections
 */
export async function syncFeedItemToStream(item: FeedItem): Promise<void> {
  if (!isStreamFeedsEnabled()) {
    return;
  }

  // Determine collection type based on item type
  let collectionType: CollectionType = 'feed_item';
  if (item.type === 'product') {
    collectionType = 'product';
  } else if (item.type === 'destination') {
    collectionType = 'destination';
  } else if (item.type === 'article') {
    collectionType = 'article';
  }

  // Extract tags from JSON
  const tags = (item.tagsJson || []) as string[];

  // Prepare collection data
  const collectionData = {
    title: item.title,
    description: item.description,
    type: item.type,
    category: item.category || null,
    tags: tags,
    mediaUrl: item.mediaUrl || null,
    source: item.source || null,
    affiliateUrl: item.affiliateUrl || null,
    score: item.score || 0,
    affiliateValue: item.affiliateValue || 0,
    created_at: item.createdAt,
  };

  await upsertCollectionItem(collectionType, item.id, collectionData);
}

