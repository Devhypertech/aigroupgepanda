/**
 * Normalize and Deduplicate Feed Items
 * Converts RawFeedItem to FeedItem and handles deduplication
 */

import { prisma } from '../../db/client.js';
import type { RawFeedItem } from './types.js';

export interface NormalizeResult {
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
}

/**
 * Normalize and deduplicate feed items
 * Deduplicates by (source + externalId) or (source + title)
 */
export async function normalizeAndDeduplicate(
  rawItems: RawFeedItem[]
): Promise<NormalizeResult> {
  if (!prisma) {
    console.warn('[Normalize] Prisma not available, skipping normalization');
    return {
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
    };
  }

  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsSkipped = 0;

  for (const rawItem of rawItems) {
    try {
      // Skip if missing required fields
      if (!rawItem.title || !rawItem.source) {
        itemsSkipped++;
        continue;
      }

      // Try to find existing item by (source + externalId) first
      let existingItem = null;
      let shouldSkip = false;
      
      if (rawItem.externalId) {
        try {
          existingItem = await prisma.feedItem.findUnique({
            where: {
              source_externalId: {
                source: rawItem.source,
                externalId: rawItem.externalId,
              },
            },
          });
        } catch (error: any) {
          // If column doesn't exist (P2022) or constraint doesn't exist, fall back to findFirst
          if (error.code === 'P2022' || error.code === 'P2003') {
            try {
              existingItem = await prisma.feedItem.findFirst({
                where: {
                  source: rawItem.source,
                  externalId: rawItem.externalId,
                },
                select: { id: true }, // Only select id to avoid missing column errors
              });
            } catch (findFirstError: any) {
              // If findFirst also fails, skip this item
              if (findFirstError.code === 'P2022') {
                console.warn(`[Normalize] Cannot query item (missing column): ${rawItem.title}`);
                shouldSkip = true;
              } else {
                throw findFirstError;
              }
            }
          } else {
            throw error;
          }
        }
      }

      // If not found, try (source + title)
      if (!existingItem && !shouldSkip) {
        try {
          existingItem = await prisma.feedItem.findUnique({
            where: {
              source_title: {
                source: rawItem.source,
                title: rawItem.title,
              },
            },
          });
        } catch (error: any) {
          // If column doesn't exist (P2022) or constraint doesn't exist, fall back to findFirst
          if (error.code === 'P2022' || error.code === 'P2003') {
            try {
              existingItem = await prisma.feedItem.findFirst({
                where: {
                  source: rawItem.source,
                  title: rawItem.title,
                },
                select: { id: true }, // Only select id to avoid missing column errors
              });
            } catch (findFirstError: any) {
              // If findFirst also fails, skip this item
              if (findFirstError.code === 'P2022') {
                console.warn(`[Normalize] Cannot query item (missing column): ${rawItem.title}`);
                shouldSkip = true;
              } else {
                throw findFirstError;
              }
            }
          } else {
            throw error;
          }
        }
      }

      // Skip this item if we encountered column errors
      if (shouldSkip) {
        itemsSkipped++;
        continue;
      }

      // Prepare data for upsert
      const itemData = {
        type: rawItem.type,
        category: rawItem.category,
        title: rawItem.title,
        description: rawItem.description,
        mediaUrl: rawItem.mediaUrl || null,
        source: rawItem.source,
        externalId: rawItem.externalId || null,
        affiliateUrl: rawItem.affiliateUrl || null,
        tagsJson: (rawItem.tagsJson || []) as any,
        score: rawItem.score ?? 0.5,
        affiliateValue: rawItem.affiliateValue ?? null,
        updatedAt: new Date(),
      };

      if (existingItem) {
        // Update existing item
        try {
          await prisma.feedItem.update({
            where: { id: existingItem.id },
            data: itemData,
          });
          itemsUpdated++;
        } catch (updateError: any) {
          // If column doesn't exist (P2022), skip update
          if (updateError.code === 'P2022') {
            console.warn(`[Normalize] Cannot update item (missing column): ${rawItem.title}`);
            itemsSkipped++;
          } else {
            throw updateError;
          }
        }
      } else {
        // Create new item
        try {
          await prisma.feedItem.create({
            data: {
              ...itemData,
              createdAt: rawItem.publishedAt
                ? new Date(rawItem.publishedAt)
                : new Date(),
            },
          });
          itemsCreated++;
        } catch (createError: any) {
          // If column doesn't exist (P2022), skip create
          if (createError.code === 'P2022') {
            console.warn(`[Normalize] Cannot create item (missing column): ${rawItem.title}`);
            itemsSkipped++;
          } else {
            throw createError;
          }
        }
      }
    } catch (error: any) {
      // Handle unique constraint violations gracefully
      if (error.code === 'P2002') {
        // Duplicate key - skip
        itemsSkipped++;
        console.warn(`[Normalize] Duplicate item skipped: ${rawItem.source} - ${rawItem.title}`);
      } else {
        console.error(`[Normalize] Error processing item ${rawItem.title}:`, error);
        itemsSkipped++;
      }
    }
  }

  console.log(`[Normalize] Processed ${rawItems.length} items: ${itemsCreated} created, ${itemsUpdated} updated, ${itemsSkipped} skipped`);

  return {
    itemsCreated,
    itemsUpdated,
    itemsSkipped,
  };
}

