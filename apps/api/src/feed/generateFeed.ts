/**
 * Feed Generation v1
 * Personalized AI Recommendation Feed Generator
 * 
 * Uses:
 * - User profile (basic)
 * - Last 10 chat messages (intent signals)
 * - Seasonality (month)
 * 
 * Ranking:
 * - Relevance score
 * - Freshness score
 * - Monetization weight (small, never overrides relevance)
 */

import { z } from 'zod';
import type { FeedItem } from '@gepanda/shared';
import { getAllContent } from './contentSources.js';
import { getLongTermMemory } from '../services/memory/memoryStore.js';
import { getUserSignals } from '../signals/updateSignals.js';

// Input validation schema
export const generateFeedInputSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().positive().max(50).default(20),
});

export interface UserProfile {
  userId: string;
  preferences?: {
    travelStyle?: string;
    budget?: string;
    interests?: string[];
  };
  recentDestinations?: string[];
}

export interface FeedGenerationContext {
  userProfile: UserProfile;
  userSignals: {
    lastIntent: string | null;
    destinations: string[];
  } | null;
  currentMonth: number; // 0-11 (0 = January)
}

/**
 * Get user profile from memory
 */
async function getUserProfile(userId: string): Promise<UserProfile> {
  try {
    const memory = getLongTermMemory(userId);
    const recentTrips = memory.trips
      ?.filter((t: any) => t.status === 'upcoming' || t.status === 'planned')
      .slice(0, 5) || [];

    return {
      userId,
      preferences: {
        travelStyle: memory.preferences?.travelStyle as string | undefined,
        budget: memory.preferences?.budget as string | undefined,
        interests: memory.preferences?.interests as string[] | undefined,
      },
      recentDestinations: recentTrips.map((t: any) => t.destination).filter(Boolean),
    };
  } catch (error) {
    console.warn('[Feed] Error getting user profile:', error);
    return { userId };
  }
}

/**
 * Get user signals from database
 * Replaces chat message fetching with stored signals
 */
async function getUserSignalsData(userId: string): Promise<{
  lastIntent: string | null;
  destinations: string[];
} | null> {
  try {
    return await getUserSignals(userId);
  } catch (error) {
    console.warn('[Feed] Error getting user signals:', error);
    return null;
  }
}

/**
 * Calculate relevance score for a feed item
 * Based on user profile, user signals, and seasonality
 */
function calculateRelevanceScore(
  item: FeedItem,
  context: FeedGenerationContext
): number {
  let score = 0.5; // Base score

  const { userProfile, userSignals, currentMonth } = context;

  // 1. Destination matching (0.35 weight)
  if (item.type === 'destination' && item.metadata.destination) {
    const destination = item.metadata.destination.toLowerCase();
    
    // Check if in user signals destinations
    if (userSignals?.destinations) {
      const matchesSignal = userSignals.destinations.some(d => 
        d.toLowerCase().includes(destination) || destination.includes(d.toLowerCase())
      );
      if (matchesSignal) {
        score += 0.35;
      }
    }

    // Check if in recent destinations from profile
    if (userProfile.recentDestinations?.some(d => 
      d.toLowerCase().includes(destination) || destination.includes(d.toLowerCase())
    )) {
      score += 0.2;
    }

    // Seasonality check
    const bestTime = item.metadata.bestTimeToVisit?.toLowerCase() || '';
    if (bestTime.includes(getMonthName(currentMonth).toLowerCase()) ||
        bestTime.includes('year-round')) {
      score += 0.1;
    }
  }

  // 2. Intent matching from signals (0.3 weight)
  if (userSignals?.lastIntent) {
    const signalIntent = userSignals.lastIntent;

    // Destination search intent -> destinations, deals
    if (signalIntent === 'destination_search' && 
        (item.type === 'destination' || item.type === 'deal')) {
      score += 0.3;
    }

    // Flight tracking intent -> deals, weather
    if (signalIntent === 'flight_tracking' && 
        (item.type === 'deal' || item.type === 'weather')) {
      score += 0.25;
    }

    // eSIM need intent -> products
    if (signalIntent === 'esim_need' && item.type === 'product') {
      score += 0.25;
    }

    // Itinerary planning -> destinations, insights
    if (signalIntent === 'itinerary_planning' && 
        (item.type === 'destination' || item.type === 'insight')) {
      score += 0.2;
    }
  }

  // 3. Preference matching (0.15 weight)
  if (userProfile.preferences) {
    const interests = userProfile.preferences.interests || [];
    const itemText = `${item.title} ${item.description}`.toLowerCase();

    // Check if item matches user interests
    for (const interest of interests) {
      if (itemText.includes(interest.toLowerCase())) {
        score += 0.15;
        break;
      }
    }

    // Budget matching for deals
    if (item.type === 'deal' && userProfile.preferences.budget) {
      const budget = userProfile.preferences.budget.toLowerCase();
      const price = item.metadata.price?.toLowerCase() || '';
      
      if ((budget.includes('budget') && parseFloat(price.replace(/[^0-9.]/g, '')) < 500) ||
          (budget.includes('luxury') && parseFloat(price.replace(/[^0-9.]/g, '')) > 1000)) {
        score += 0.1;
      }
    }
  }

  // 4. Destination signals boost (0.1 weight)
  // If user has searched for destinations, boost destination items
  if (userSignals?.destinations && userSignals.destinations.length > 0 && 
      item.type === 'destination') {
    score += 0.1;
  }

  // 5. Seasonality boost (0.1 weight)
  const monthName = getMonthName(currentMonth).toLowerCase();
  const itemText = `${item.title} ${item.description}`.toLowerCase();
  
  // Spring destinations in spring months
  if ((currentMonth >= 2 && currentMonth <= 4) && 
      (itemText.includes('spring') || itemText.includes('cherry blossom'))) {
    score += 0.1;
  }

  // Summer destinations in summer months
  if ((currentMonth >= 5 && currentMonth <= 7) && 
      (itemText.includes('summer') || itemText.includes('beach'))) {
    score += 0.1;
  }

  // Winter destinations in winter months
  if ((currentMonth >= 10 || currentMonth <= 1) && 
      (itemText.includes('winter') || itemText.includes('northern lights'))) {
    score += 0.1;
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Calculate freshness score
 * Newer items get higher scores
 */
function calculateFreshnessScore(item: FeedItem): number {
  const itemAge = Date.now() - new Date(item.createdAt).getTime();
  const daysOld = itemAge / (1000 * 60 * 60 * 24);

  // Items less than 1 day old: 1.0
  // Items 1-7 days old: 0.8
  // Items 7-30 days old: 0.6
  // Items older: 0.4
  if (daysOld < 1) return 1.0;
  if (daysOld < 7) return 0.8;
  if (daysOld < 30) return 0.6;
  return 0.4;
}

/**
 * Calculate monetization weight
 * Small boost for monetizable items (deals, products)
 * Never overrides relevance
 */
function calculateMonetizationWeight(item: FeedItem): number {
  if (item.type === 'deal' || item.type === 'product') {
    return 0.05; // Small boost
  }
  return 0;
}

/**
 * Get month name from month number
 */
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month] || 'Unknown';
}

/**
 * Generate personalized feed
 */
export async function generateFeed(
  userId: string,
  limit: number = 20
): Promise<FeedItem[]> {
  // 1. Get user profile
  const userProfile = await getUserProfile(userId);

  // 2. Get user signals (intent + destinations)
  const userSignals = await getUserSignalsData(userId);

  // 3. Get current month
  const currentMonth = new Date().getMonth();

  // 4. Build context
  const context: FeedGenerationContext = {
    userProfile,
    userSignals,
    currentMonth,
  };

  // 5. Get all content sources
  const allContent = getAllContent();

  // 6. Score and rank items
  const scoredItems: Array<FeedItem & { finalScore: number }> = allContent.map((content, index) => {
    const item: FeedItem = {
      ...content,
      id: `feed_${Date.now()}_${index}`,
      relevanceScore: 0,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random age for freshness testing
    };

    // Calculate scores
    const relevanceScore = calculateRelevanceScore(item, context);
    const freshnessScore = calculateFreshnessScore(item);
    const monetizationWeight = calculateMonetizationWeight(item);

    // Final score: relevance (70%) + freshness (25%) + monetization (5%)
    // But monetization never overrides relevance
    const finalScore = (relevanceScore * 0.7) + (freshnessScore * 0.25) + monetizationWeight;

    return {
      ...item,
      relevanceScore,
      finalScore,
    };
  });

  // 7. Sort by final score (descending)
  scoredItems.sort((a, b) => b.finalScore - a.finalScore);

  // 8. Return top N items (remove finalScore before returning)
  return scoredItems.slice(0, limit).map(({ finalScore, ...item }) => item);
}

