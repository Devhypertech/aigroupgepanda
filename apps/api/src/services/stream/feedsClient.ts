/**
 * Stream Activity Feeds Client
 * Server-side client for Stream Activity Feeds (separate from Stream Chat)
 */

import Stream from 'getstream';

// Stream Activity Feeds uses the same API key/secret as Stream Chat if configured in same app
// Or separate keys if using different Stream apps
const STREAM_FEEDS_API_KEY = process.env.STREAM_FEEDS_API_KEY || process.env.STREAM_API_KEY;
const STREAM_FEEDS_API_SECRET = process.env.STREAM_FEEDS_API_SECRET || process.env.STREAM_API_SECRET;

if (!STREAM_FEEDS_API_KEY || !STREAM_FEEDS_API_SECRET) {
  console.warn('⚠️  Stream Activity Feeds API key/secret not set. Feeds features will be disabled.');
}

// Server-side Stream Activity Feeds client
export const streamFeedsClient = STREAM_FEEDS_API_KEY && STREAM_FEEDS_API_SECRET
  ? Stream.connect(STREAM_FEEDS_API_KEY, STREAM_FEEDS_API_SECRET)
  : null;

/**
 * Get a user feed instance
 * @param feedGroup - Feed group type: 'user', 'timeline', 'forYou', 'topic'
 * @param userId - User ID
 */
export function getUserFeed(feedGroup: 'user' | 'timeline' | 'forYou' | 'topic', userId: string) {
  if (!streamFeedsClient) {
    throw new Error('Stream Activity Feeds client not initialized. Check API keys.');
  }
  return streamFeedsClient.feed(feedGroup, userId);
}

/**
 * Get a topic feed instance
 * @param topicId - Topic/category ID (e.g., 'travel', 'deals')
 */
export function getTopicFeed(topicId: string) {
  if (!streamFeedsClient) {
    throw new Error('Stream Activity Feeds client not initialized. Check API keys.');
  }
  return streamFeedsClient.feed('topic', topicId);
}

/**
 * Check if Stream Feeds is enabled
 */
export function isStreamFeedsEnabled(): boolean {
  return streamFeedsClient !== null;
}

