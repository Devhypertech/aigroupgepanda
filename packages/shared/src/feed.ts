/**
 * Feed Item Types
 * Shared types for the Social Activity Feed
 */

export type FeedItemType =
  | 'deal'
  | 'article'
  | 'video'
  | 'destination'
  | 'product'
  | 'weather'
  | 'insight';

export type FeedItemCategory =
  | 'travel'
  | 'deals'
  | 'news'
  | 'entertainment'
  | 'lifestyle'
  | 'tech'
  | 'food'
  | 'adventure';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  category: FeedItemCategory | null;
  title: string;
  description: string;
  contentSnippet?: string | null;
  mediaUrl: string | null;
  source: string | null;
  affiliateUrl: string | null;
  tagsJson: string[] | null;
  score: number; // 0-1, base relevance/ranking score
  affiliateValue?: number; // 0-1, affiliate value weight
  createdAt: string;
  updatedAt: string;
  // Ranking scores (computed, not stored)
  effectiveScore?: number;
  recencyScore?: number;
  interestMatchScore?: number;
  engagementScore?: number;
  affiliateValueScore?: number;
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
}

