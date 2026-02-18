/**
 * RSS Feed Ingestion
 * Fetches and parses RSS feeds for AI news and travel articles
 */

import Parser from 'rss-parser';
import { prisma } from '../../db/client.js';
import type { RawFeedItem, IngestionResult } from './types.js';
import { normalizeAndDeduplicate } from './normalize.js';

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: ['media:content', 'enclosure'],
  },
});

/**
 * RSS Feed Sources Configuration
 */
const RSS_SOURCES = [
  {
    url: 'https://techcrunch.com/feed/',
    source: 'TechCrunch',
    category: 'tech' as const,
    type: 'article' as const,
    filterKeywords: ['AI', 'artificial intelligence', 'travel', 'tourism'],
  },
  {
    url: 'https://www.travelpulse.com/rss',
    source: 'TravelPulse',
    category: 'travel' as const,
    type: 'article' as const,
  },
  {
    url: 'https://www.lonelyplanet.com/news/feed',
    source: 'Lonely Planet',
    category: 'travel' as const,
    type: 'article' as const,
  },
  // Add more RSS feeds as needed
];

/**
 * Extract image URL from RSS item
 */
function extractImageUrl(item: any): string | null {
  // Try media:content
  if (item['media:content']?.[0]?.['$']?.url) {
    return item['media:content'][0]['$'].url;
  }
  
  // Try enclosure
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }
  
  // Try contentSnippet or content for image tags
  const content = item.contentSnippet || item.content || '';
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch) {
    return imgMatch[1];
  }
  
  return null;
}

/**
 * Extract tags from RSS item
 */
function extractTags(item: any): string[] {
  const tags: string[] = [];
  
  // From categories
  if (item.categories && Array.isArray(item.categories)) {
    tags.push(...item.categories.map((cat: string) => cat.toLowerCase().trim()));
  }
  
  // From title and description (simple keyword extraction)
  const text = `${item.title || ''} ${item.contentSnippet || item.content || ''}`.toLowerCase();
  const keywords = ['travel', 'ai', 'artificial intelligence', 'tourism', 'destination', 'hotel', 'flight', 'deal'];
  keywords.forEach(keyword => {
    if (text.includes(keyword) && !tags.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  return tags.slice(0, 10); // Limit to 10 tags
}

/**
 * Convert RSS item to RawFeedItem
 */
function rssItemToRawFeedItem(
  item: any,
  source: string,
  category: string,
  type: string
): RawFeedItem | null {
  if (!item.title || !item.link) {
    return null;
  }

  // Use link as externalId for deduplication
  const externalId = item.link || item.guid || item.id || null;
  
  return {
    type: type as any,
    category: category as any,
    title: item.title.trim(),
    description: (item.contentSnippet || item.content || item.description || '').trim().substring(0, 1000),
    mediaUrl: extractImageUrl(item),
    source,
    externalId,
    affiliateUrl: null,
    tagsJson: extractTags(item),
    score: 0.5, // Default score, will be recalculated by ranking
    affiliateValue: undefined, // Will use category-based defaults
    publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
  };
}

/**
 * Ingest a single RSS feed
 */
async function ingestRssFeed(
  feedConfig: typeof RSS_SOURCES[0]
): Promise<RawFeedItem[]> {
  try {
    console.log(`[RSS Ingest] Fetching ${feedConfig.source} from ${feedConfig.url}`);
    
    const feed = await parser.parseURL(feedConfig.url);
    const rawItems: RawFeedItem[] = [];

    for (const item of feed.items || []) {
      // Apply keyword filter if configured
      if (feedConfig.filterKeywords) {
        const itemText = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
        const hasKeyword = feedConfig.filterKeywords.some(keyword =>
          itemText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          continue; // Skip items that don't match keywords
        }
      }

      const rawItem = rssItemToRawFeedItem(
        item,
        feedConfig.source,
        feedConfig.category,
        feedConfig.type
      );

      if (rawItem) {
        rawItems.push(rawItem);
      }
    }

    console.log(`[RSS Ingest] Fetched ${rawItems.length} items from ${feedConfig.source}`);
    return rawItems;
  } catch (error) {
    console.error(`[RSS Ingest] Error fetching ${feedConfig.source}:`, error);
    return [];
  }
}

/**
 * Ingest all RSS feeds
 */
export async function ingestRssFeeds(): Promise<IngestionResult> {
  if (!prisma) {
    console.warn('[RSS Ingest] Prisma not available, skipping RSS ingestion');
    return {
      success: false,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: ['Database not available'],
    };
  }

  const errors: string[] = [];
  let allRawItems: RawFeedItem[] = [];

  // Fetch from all RSS sources
  for (const feedConfig of RSS_SOURCES) {
    try {
      const items = await ingestRssFeed(feedConfig);
      allRawItems.push(...items);
    } catch (error) {
      const errorMsg = `Error ingesting ${feedConfig.source}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[RSS Ingest] ${errorMsg}`);
    }
  }

  // Normalize and deduplicate
  const result = await normalizeAndDeduplicate(allRawItems);

  return {
    success: errors.length === 0 || result.itemsCreated > 0,
    itemsProcessed: allRawItems.length,
    itemsCreated: result.itemsCreated,
    itemsUpdated: result.itemsUpdated,
    itemsSkipped: result.itemsSkipped,
    errors,
  };
}

