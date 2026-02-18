/**
 * Manual Curated Items Ingestion
 * Loads travel deals and YouTube shorts from JSON files
 */

import { prisma } from '../../db/client.js';
import type { RawFeedItem, IngestionResult } from './types.js';
import { normalizeAndDeduplicate } from './normalize.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Manual curated items JSON structure
 * Place this file at: apps/api/data/manualFeedItems.json
 */
interface ManualFeedItemData {
  deals?: Array<{
    title: string;
    description: string;
    mediaUrl?: string;
    affiliateUrl: string;
    tags?: string[];
    affiliateValue?: number;
    externalId?: string;
  }>;
  youtubeShorts?: Array<{
    title: string;
    description: string;
    videoId: string; // YouTube video ID
    tags?: string[];
    externalId?: string;
  }>;
}

/**
 * Load manual curated items from JSON file
 */
async function loadManualItems(): Promise<RawFeedItem[]> {
  try {
    // Try to load from data directory
    const dataPath = join(process.cwd(), 'data', 'manualFeedItems.json');
    const fileContent = await readFile(dataPath, 'utf-8');
    const data: ManualFeedItemData = JSON.parse(fileContent);

    const rawItems: RawFeedItem[] = [];

    // Process deals
    if (data.deals) {
      for (const deal of data.deals) {
        rawItems.push({
          type: 'deal',
          category: 'deals',
          title: deal.title,
          description: deal.description,
          mediaUrl: deal.mediaUrl || null,
          source: 'Manual Curated',
          externalId: deal.externalId || `deal_${deal.title.toLowerCase().replace(/\s+/g, '_')}`,
          affiliateUrl: deal.affiliateUrl || null,
          tagsJson: deal.tags || [],
          score: 0.8, // Higher score for manually curated
          affiliateValue: deal.affiliateValue ?? 0.9,
        });
      }
    }

    // Process YouTube shorts
    if (data.youtubeShorts) {
      for (const short of data.youtubeShorts) {
        rawItems.push({
          type: 'video',
          category: 'entertainment',
          title: short.title,
          description: short.description,
          mediaUrl: `https://www.youtube.com/embed/${short.videoId}`,
          source: 'Manual Curated',
          externalId: short.externalId || `youtube_${short.videoId}`,
          affiliateUrl: null,
          tagsJson: short.tags || [],
          score: 0.75,
          affiliateValue: 0.4, // Lower for entertainment content
        });
      }
    }

    console.log(`[Manual Ingest] Loaded ${rawItems.length} manual items`);
    return rawItems;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('[Manual Ingest] No manual feed items file found, skipping');
      return [];
    }
    console.error('[Manual Ingest] Error loading manual items:', error);
    return [];
  }
}

/**
 * Ingest manual curated items
 */
export async function ingestManualItems(): Promise<IngestionResult> {
  if (!prisma) {
    console.warn('[Manual Ingest] Prisma not available, skipping manual ingestion');
    return {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: ['Database not available'],
    };
  }

  try {
    const rawItems = await loadManualItems();

    if (rawItems.length === 0) {
      return {
        success: true,
        itemsProcessed: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        errors: [],
      };
    }

    // Normalize and deduplicate
    const result = await normalizeAndDeduplicate(rawItems);

    return {
      success: true,
      itemsProcessed: rawItems.length,
      itemsCreated: result.itemsCreated,
      itemsUpdated: result.itemsUpdated,
      itemsSkipped: result.itemsSkipped,
      errors: [],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Manual Ingest] Error:', errorMsg);
    return {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [errorMsg],
    };
  }
}

