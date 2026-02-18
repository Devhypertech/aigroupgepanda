/**
 * Feed Ingestion Types
 */

import type { FeedItemType, FeedItemCategory } from '../schemas.js';

export interface RawFeedItem {
  type: FeedItemType;
  category: FeedItemCategory | null;
  title: string;
  description: string;
  mediaUrl?: string | null;
  source: string;
  externalId?: string; // For deduplication
  affiliateUrl?: string | null;
  tagsJson?: string[] | null;
  score?: number;
  affiliateValue?: number;
  publishedAt?: Date | string;
}

export interface IngestionResult {
  success: boolean;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: string[];
}

