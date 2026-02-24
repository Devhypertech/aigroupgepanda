/**
 * Feed Ranking Logic v2 - Personalized Feed
 * 
 * Score = InterestMatch(40%) + SavedPostsSimilarity(20%) + InteractionHistory(15%) + Recency(15%) + Trending(10%)
 * 
 * Uses:
 * - UserInterest table for explicit interests
 * - FeedInteraction (action='save') for saved posts similarity
 * - FeedInteraction (action='click', 'view') for interaction history
 * - Trending fallback when user has no interests/interactions
 */

import { prisma } from '../db/client.js';
import type { FeedItem } from '@gepanda/shared';

type RankedBaseItem = FeedItem & {
  publishedAt?: string | Date;
};

export interface RankingContext {
  userId: string;
  userSignals?: {
    lastIntent?: string | null;
    destinations?: string[];
    interests?: string[];
    notInterestedTags?: string[];
    notInterestedCategories?: string[];
  };
}

export interface RankedFeedItem extends FeedItem {
  effectiveScore: number;
  recencyScore: number;
  interestMatchScore: number;
  engagementScore: number; // Kept for backward compatibility (now maps to trendingScore)
  affiliateValueScore: number;
  savedPostsSimilarityScore?: number;
  interactionHistoryScore?: number;
  trendingScore?: number;
}

/**
 * Calculate recency score (15% weight)
 * Newer items get higher scores, but less weight than personalization
 */
function calculateRecencyScore(item: RankedBaseItem): number {
  // Use publishedAt if available, otherwise createdAt
  const itemDate = item.publishedAt ? new Date(item.publishedAt) : new Date(item.createdAt);
  const now = Date.now();
  const itemAge = now - itemDate.getTime();
  
  // Score decreases over time
  // Items < 1 day old: 1.0
  // Items < 7 days old: 0.8
  // Items < 30 days old: 0.6
  // Items < 90 days old: 0.4
  // Items >= 90 days old: 0.2
  
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;
  const threeMonths = 90 * oneDay;
  
  if (itemAge < oneDay) return 1.0;
  if (itemAge < oneWeek) return 0.8;
  if (itemAge < oneMonth) return 0.6;
  if (itemAge < threeMonths) return 0.4;
  return 0.2;
}

/**
 * Calculate interest match score (40% weight)
 * Based on UserInterest table (explicit interests) and tag overlap
 */
async function calculateInterestMatchScore(
  item: FeedItem,
  context: RankingContext
): Promise<number> {
  if (!prisma) {
    return 0.5; // No database = neutral score
  }

  const itemTags = ((item.tagsJson || []) as string[]).map(t => t.toLowerCase());
  const itemCategory = (item.category || '').toLowerCase();

  // Check for not_interested interactions - completely hide
  if (context.userId) {
    try {
      const notInterested = await (prisma as any).feedInteraction.findFirst({
        where: {
          userId: context.userId,
          feedItemId: item.id,
          action: 'not_interested',
        },
      });
      
      if (notInterested) {
        return 0.0; // Completely hide
      }
    } catch (error) {
      // Ignore errors
    }
  }

  // Check user signals for not interested tags/categories
  if (context.userSignals) {
    const notInterestedTags = (context.userSignals as any).notInterestedTags || [];
    const notInterestedCategories = (context.userSignals as any).notInterestedCategories || [];
    
    if (item.category && notInterestedCategories.includes(item.category)) {
      return 0.1; // Heavily downrank
    }
    
    const hasNotInterestedTag = itemTags.some((tag: string) =>
      notInterestedTags.some((notTag: string) =>
        tag.includes(notTag.toLowerCase()) || notTag.toLowerCase().includes(tag)
      )
    );
    
    if (hasNotInterestedTag) {
      return 0.1; // Heavily downrank
    }
  }

  try {
    // PRIMARY: Get user interests from UserInterest table
    const userInterests = await (prisma as any).userInterest.findMany({
      where: { userId: context.userId },
      include: { interest: true },
      take: 50, // Limit to prevent performance issues
    });

    const interestSlugs = userInterests.map((ui: any) => ui.interest.slug.toLowerCase());
    
    if (interestSlugs.length > 0) {
      // Match item tags/category with user interest slugs
      const tagMatches = itemTags.filter(tag =>
        interestSlugs.some(slug =>
          tag.includes(slug) || slug.includes(tag) || tag === slug
        )
      );

      const categoryMatch = interestSlugs.some(slug =>
        itemCategory.includes(slug) || slug.includes(itemCategory)
      );

      if (tagMatches.length > 0 || categoryMatch) {
        // Strong match: multiple tags or category match
        const matchRatio = tagMatches.length / Math.max(itemTags.length, 1);
        const baseScore = 0.5 + (matchRatio * 0.4); // 0.5 to 0.9
        const categoryBoost = categoryMatch ? 0.1 : 0;
        return Math.min(baseScore + categoryBoost, 1.0);
      }

      // Partial match: check if any tag is similar to interests
      const partialMatches = itemTags.filter(tag =>
        interestSlugs.some(slug => {
          const words = slug.split('-');
          return words.some(word => tag.includes(word) || word.includes(tag));
        })
      );

      if (partialMatches.length > 0) {
        return 0.4 + (partialMatches.length / Math.max(itemTags.length, 1)) * 0.2; // 0.4 to 0.6
      }

      return 0.2; // No match = lower score (exploration)
    }

    // FALLBACK: Use interests from userSignals if UserInterest table is empty
    if (context.userSignals?.interests && context.userSignals.interests.length > 0) {
      const userInterests = context.userSignals.interests.map(i => i.toLowerCase());
      
      const tagMatches = itemTags.filter(tag =>
        userInterests.some(interest =>
          tag.includes(interest) || interest.includes(tag)
        )
      );

      const categoryMatch = userInterests.some(interest =>
        itemCategory.includes(interest) || interest.includes(itemCategory)
      );

      if (tagMatches.length > 0 || categoryMatch) {
        const matchRatio = tagMatches.length / Math.max(itemTags.length, 1);
        return Math.min(0.4 + (matchRatio * 0.4) + (categoryMatch ? 0.2 : 0), 1.0);
      }

      return 0.2; // No match
    }

    // No interests at all - return low score for exploration
    return 0.2;
  } catch (error) {
    console.error('[Ranking] Error calculating interest match score:', error);
    return 0.3; // Error = low score (exploration)
  }
}

/**
 * Calculate saved posts similarity score (20% weight)
 * Based on similarity to items user has saved
 */
async function calculateSavedPostsSimilarityScore(
  item: FeedItem,
  context: RankingContext
): Promise<number> {
  if (!prisma || !context.userId) {
    return 0.0; // No database or no user = no similarity score
  }

  try {
    // Get user's saved posts
    const savedInteractions = await (prisma as any).feedInteraction.findMany({
      where: {
        userId: context.userId,
        action: 'save',
      },
      include: {
        feedItem: {
          select: {
            tagsJson: true,
            category: true,
            type: true,
          },
        },
      },
      take: 100, // Consider up to 100 saved posts
      orderBy: {
        createdAt: 'desc', // Recent saves are more relevant
      },
    });

    if (savedInteractions.length === 0) {
      return 0.0; // No saved posts = no similarity
    }

    const itemTags = ((item.tagsJson || []) as string[]).map(t => t.toLowerCase());
    const itemCategory = (item.category || '').toLowerCase();
    const itemType = (item.type || '').toLowerCase();

    // Calculate similarity to each saved post
    let totalSimilarity = 0;
    let matchCount = 0;

    for (const interaction of savedInteractions) {
      const savedItem = interaction.feedItem;
      const savedTags = ((savedItem.tagsJson || []) as string[]).map(t => t.toLowerCase());
      const savedCategory = (savedItem.category || '').toLowerCase();
      const savedType = (savedItem.type || '').toLowerCase();

      // Tag overlap
      const commonTags = itemTags.filter(tag => savedTags.includes(tag));
      const tagSimilarity = commonTags.length / Math.max(Math.max(itemTags.length, savedTags.length), 1);

      // Category match
      const categoryMatch = itemCategory === savedCategory ? 0.3 : 0;

      // Type match
      const typeMatch = itemType === savedType ? 0.2 : 0;

      // Combined similarity (weighted)
      const similarity = (tagSimilarity * 0.5) + categoryMatch + typeMatch;
      totalSimilarity += similarity;
      matchCount++;
    }

    // Average similarity across all saved posts
    const avgSimilarity = matchCount > 0 ? totalSimilarity / matchCount : 0;
    
    // Normalize to 0-1 range with boost for high similarity
    return Math.min(avgSimilarity * 1.2, 1.0);
  } catch (error) {
    console.error('[Ranking] Error calculating saved posts similarity:', error);
    return 0.0;
  }
}

/**
 * Calculate interaction history score (15% weight)
 * Based on user's past clicks, views, and engagement patterns
 */
async function calculateInteractionHistoryScore(
  item: FeedItem,
  context: RankingContext
): Promise<number> {
  if (!prisma || !context.userId) {
    return 0.0;
  }

  try {
    // Get user's interaction history (clicks, views)
    const userInteractions = await (prisma as any).feedInteraction.findMany({
      where: {
        userId: context.userId,
        action: { in: ['click', 'view', 'save'] },
      },
      include: {
        feedItem: {
          select: {
            tagsJson: true,
            category: true,
            type: true,
          },
        },
      },
      take: 200, // Consider up to 200 interactions
      orderBy: {
        createdAt: 'desc', // Recent interactions are more relevant
      },
    });

    if (userInteractions.length === 0) {
      return 0.0; // No interaction history
    }

    const itemTags = ((item.tagsJson || []) as string[]).map(t => t.toLowerCase());
    const itemCategory = (item.category || '').toLowerCase();
    const itemType = (item.type || '').toLowerCase();

    // Calculate similarity to interacted items
    let totalSimilarity = 0;
    let matchCount = 0;

    for (const interaction of userInteractions) {
      const interactedItem = interaction.feedItem;
      const interactedTags = ((interactedItem.tagsJson || []) as string[]).map(t => t.toLowerCase());
      const interactedCategory = (interactedItem.category || '').toLowerCase();
      const interactedType = (interactedItem.type || '').toLowerCase();

      // Tag overlap
      const commonTags = itemTags.filter(tag => interactedTags.includes(tag));
      const tagSimilarity = commonTags.length / Math.max(Math.max(itemTags.length, interactedTags.length), 1);

      // Category match
      const categoryMatch = itemCategory === interactedCategory ? 0.2 : 0;

      // Type match
      const typeMatch = itemType === interactedType ? 0.1 : 0;

      // Weight by action type (save > click > view)
      const actionWeight = interaction.action === 'save' ? 1.5 : interaction.action === 'click' ? 1.2 : 1.0;

      const similarity = ((tagSimilarity * 0.7) + categoryMatch + typeMatch) * actionWeight;
      totalSimilarity += similarity;
      matchCount++;
    }

    const avgSimilarity = matchCount > 0 ? totalSimilarity / matchCount : 0;
    return Math.min(avgSimilarity / 1.5, 1.0); // Normalize
  } catch (error) {
    console.error('[Ranking] Error calculating interaction history score:', error);
    return 0.0;
  }
}

/**
 * Calculate trending score (10% weight)
 * Based on overall engagement across all users (fallback when user has no interests)
 */
async function calculateTrendingScore(
  item: FeedItem,
  context: RankingContext
): Promise<number> {
  if (!prisma) {
    return 0.0;
  }

  try {
    // Get total engagement count (all users) for this item
    const totalEngagementCount = await (prisma as any).feedInteraction.count({
      where: {
        feedItemId: item.id,
        action: { in: ['click', 'view', 'save'] },
      },
    });

    // Normalize: 0 interactions = 0.0, 100+ interactions = 1.0
    return Math.min(totalEngagementCount / 100, 1.0);
  } catch (error) {
    console.error('[Ranking] Error calculating trending score:', error);
    return 0.0;
  }
}

/**
 * Calculate affiliate value score (15% weight)
 * From item's affiliateValue field or category-based
 */
function calculateAffiliateValueScore(item: FeedItem): number {
  // Use affiliateValue if set (0-1 range)
  if (item.affiliateValue !== undefined && item.affiliateValue !== null) {
    return Math.max(0, Math.min(1, item.affiliateValue));
  }

  // Category-based default values
  const categoryValues: Record<string, number> = {
    deals: 0.9,
    product: 0.8,
    travel: 0.6,
    entertainment: 0.4,
    news: 0.3,
    lifestyle: 0.5,
    tech: 0.5,
    food: 0.4,
    adventure: 0.6,
  };

  if (item.category && categoryValues[item.category]) {
    return categoryValues[item.category];
  }

  // Type-based fallback
  const typeValues: Record<string, number> = {
    deal: 0.9,
    product: 0.8,
    destination: 0.6,
    video: 0.5,
    article: 0.4,
    weather: 0.2,
    insight: 0.3,
  };

  if (typeValues[item.type]) {
    return typeValues[item.type];
  }

  // Default neutral
  return 0.5;
}

/**
 * Calculate effective score for a feed item
 * Score = InterestMatch(40%) + SavedPostsSimilarity(20%) + InteractionHistory(15%) + Recency(15%) + Trending(10%)
 */
export async function calculateEffectiveScore(
  item: FeedItem,
  context: RankingContext
): Promise<RankedFeedItem> {
  // Calculate component scores
  const interestMatchScore = await calculateInterestMatchScore(item, context);
  const savedPostsSimilarityScore = await calculateSavedPostsSimilarityScore(item, context);
  const interactionHistoryScore = await calculateInteractionHistoryScore(item, context);
  const recencyScore = calculateRecencyScore(item);
  const trendingScore = await calculateTrendingScore(item, context);
  const affiliateValueScore = calculateAffiliateValueScore(item);

  // Weighted combination
  const effectiveScore = 
    (interestMatchScore * 0.40) +
    (savedPostsSimilarityScore * 0.20) +
    (interactionHistoryScore * 0.15) +
    (recencyScore * 0.15) +
    (trendingScore * 0.10);

  return {
    ...item,
    effectiveScore,
    recencyScore,
    interestMatchScore,
    engagementScore: trendingScore, // Keep for backward compatibility
    affiliateValueScore,
    // New scores
    savedPostsSimilarityScore,
    interactionHistoryScore,
    trendingScore,
  } as RankedFeedItem;
}

/**
 * Rank multiple feed items
 * Priority: Effective Score (personalized ranking)
 * Ensures a mix of personalized (high score) and explore (lower score) items
 */
export async function rankFeedItems(
  items: FeedItem[],
  context: RankingContext
): Promise<RankedFeedItem[]> {
  const rankedItems = await Promise.all(
    items.map(item => calculateEffectiveScore(item, context))
  );

  // Sort by effective score (descending) - this combines all factors
  rankedItems.sort((a, b) => {
    // Primary: effective score (higher = better)
    if (Math.abs(b.effectiveScore - a.effectiveScore) > 0.01) {
      return b.effectiveScore - a.effectiveScore;
    }
    // Secondary: interest match score
    if (Math.abs(b.interestMatchScore - a.interestMatchScore) > 0.01) {
      return b.interestMatchScore - a.interestMatchScore;
    }
    // Tertiary: recency (newer = better)
    return b.recencyScore - a.recencyScore;
  });

  // Ensure explore items are included (at least 15% of results)
  // Items with lower effective scores (< 0.3) are explore items
  const exploreThreshold = 0.3;
  const personalizedItems = rankedItems.filter(item => item.effectiveScore >= exploreThreshold);
  const exploreItems = rankedItems.filter(item => item.effectiveScore < exploreThreshold);

  // If we have enough items, mix personalized with explore
  if (personalizedItems.length > 0 && exploreItems.length > 0) {
    const exploreCount = Math.max(1, Math.floor(rankedItems.length * 0.15)); // 15% explore
    const personalizedCount = rankedItems.length - exploreCount;
    
    // Take top personalized items (already sorted by effective score)
    const topPersonalized = personalizedItems.slice(0, personalizedCount);
    
    // Take explore items sorted by trending score (popular items first for exploration)
    const selectedExplore = exploreItems
      .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(0, exploreCount);
    
    // Combine: personalized first, then explore
    return [...topPersonalized, ...selectedExplore];
  }

  // If no explore items or all are explore, return as-is (already sorted by effective score)
  return rankedItems;
}

