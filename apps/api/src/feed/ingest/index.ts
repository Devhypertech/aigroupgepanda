/**
 * Feed Ingestion Module
 * Exports all ingestion functions
 */

export { ingestRssFeeds } from './rssIngest.js';
export { ingestManualItems } from './manualSeed.js';
export { normalizeAndDeduplicate } from './normalize.js';
export type { RawFeedItem, IngestionResult } from './types.js';

