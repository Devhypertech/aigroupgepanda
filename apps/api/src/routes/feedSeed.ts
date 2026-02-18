/**
 * Feed Seeding Route (Development Only)
 * Seeds demo feed items for local development
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';
import { syncFeedItemToStreamActivity } from '../feed/streamSync.js';
import { createId } from '@paralleldrive/cuid2';

const router = Router();

/**
 * Demo feed items to seed
 */
const DEMO_FEED_ITEMS = [
  // Travel Discounts
  {
    type: 'deal',
    category: 'deals',
    title: '50% Off Summer Flights to Europe',
    description: 'Limited time summer sale! Book flights to major European destinations with 50% discount. Valid until end of month. Perfect for your summer getaway.',
    mediaUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
    source: 'TravelDeals.com',
    affiliateUrl: 'https://example.com/deals/europe-summer?ref=gepanda',
    tagsJson: ['europe', 'flights', 'summer', 'sale', 'discount'],
    score: 0.95,
    affiliateValue: 0.95,
  },
  {
    type: 'deal',
    category: 'deals',
    title: 'Luxury Hotel Package: Maldives',
    description: 'All-inclusive 7-night stay at 5-star resort. Includes breakfast, spa access, and water activities. Perfect for honeymooners and couples.',
    mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    source: 'LuxuryTravel.com',
    affiliateUrl: 'https://example.com/deals/maldives-luxury?ref=gepanda',
    tagsJson: ['maldives', 'luxury', 'hotel', 'resort', 'all-inclusive'],
    score: 0.92,
    affiliateValue: 0.92,
  },
  {
    type: 'deal',
    category: 'deals',
    title: 'Early Bird: Tokyo Package Deal',
    description: 'Book your Tokyo adventure now and save 25%. Includes flights and 4-star hotel. Experience cherry blossoms and traditional culture.',
    mediaUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    source: 'TravelPackages.com',
    affiliateUrl: 'https://example.com/deals/tokyo-package?ref=gepanda',
    tagsJson: ['tokyo', 'japan', 'package', 'asia', 'cherry-blossoms'],
    score: 0.88,
    affiliateValue: 0.88,
  },
  {
    type: 'deal',
    category: 'deals',
    title: 'Bali Beach Resort Special',
    description: 'Save 30% on beachfront resorts in Bali. Includes airport transfer and daily breakfast. Book now for peak season availability.',
    mediaUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800',
    source: 'BeachResorts.com',
    affiliateUrl: 'https://example.com/deals/bali-resort?ref=gepanda',
    tagsJson: ['bali', 'beach', 'resort', 'tropical', 'indonesia'],
    score: 0.85,
    affiliateValue: 0.85,
  },

  // Travel Articles
  {
    type: 'article',
    category: 'travel',
    title: '10 Hidden Gems in Southeast Asia',
    description: 'Discover off-the-beaten-path destinations that will take your breath away. From secret beaches to ancient temples, explore the untouched beauty of Southeast Asia.',
    mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    source: 'TravelMagazine.com',
    affiliateUrl: null,
    tagsJson: ['southeast-asia', 'destinations', 'travel-tips', 'hidden-gems'],
    score: 0.75,
    affiliateValue: 0.3,
  },
  {
    type: 'article',
    category: 'travel',
    title: 'Sustainable Travel: How to Reduce Your Carbon Footprint',
    description: 'Practical tips for eco-conscious travelers. Learn how to travel sustainably without sacrificing adventure. Make a positive impact on the planet.',
    mediaUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
    source: 'EcoTravel.com',
    affiliateUrl: null,
    tagsJson: ['sustainability', 'eco-travel', 'environment', 'green-travel'],
    score: 0.70,
    affiliateValue: 0.2,
  },
  {
    type: 'article',
    category: 'travel',
    title: 'Solo Travel Guide: Safety Tips for Female Travelers',
    description: 'Essential safety tips and destination recommendations for solo female travelers. Build confidence and explore the world independently.',
    mediaUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
    source: 'SoloTraveler.com',
    affiliateUrl: null,
    tagsJson: ['solo-travel', 'safety', 'female-travelers', 'tips'],
    score: 0.68,
    affiliateValue: 0.25,
  },
  {
    type: 'article',
    category: 'travel',
    title: 'Budget Travel: How to See the World on $50/Day',
    description: 'Proven strategies for budget-conscious travelers. Learn how to stretch your travel budget and see more of the world for less.',
    mediaUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    source: 'BudgetTravel.com',
    affiliateUrl: null,
    tagsJson: ['budget-travel', 'backpacking', 'money-saving', 'tips'],
    score: 0.72,
    affiliateValue: 0.2,
  },

  // AI & Crypto News
  {
    type: 'article',
    category: 'tech',
    title: 'AI-Powered Travel Planning: The Future is Here',
    description: 'Discover how artificial intelligence is revolutionizing travel planning. From personalized itineraries to real-time recommendations, AI is changing how we explore the world.',
    mediaUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
    source: 'TechTravel.com',
    affiliateUrl: null,
    tagsJson: ['ai', 'technology', 'travel-tech', 'innovation'],
    score: 0.80,
    affiliateValue: 0.4,
  },
  {
    type: 'article',
    category: 'tech',
    title: 'Crypto Travel: Paying for Trips with Digital Currency',
    description: 'How cryptocurrency is being adopted in the travel industry. Learn which destinations accept crypto and how to use digital wallets for travel expenses.',
    mediaUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
    source: 'CryptoTravel.com',
    affiliateUrl: null,
    tagsJson: ['crypto', 'blockchain', 'digital-currency', 'travel-payment'],
    score: 0.75,
    affiliateValue: 0.35,
  },
  {
    type: 'article',
    category: 'tech',
    title: 'Best Travel Apps for 2024',
    description: 'From AI-powered trip planners to real-time translation, these apps will revolutionize your travel experience. Our top picks for modern travelers.',
    mediaUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
    source: 'AppReview.com',
    affiliateUrl: null,
    tagsJson: ['apps', 'technology', 'travel-tech', 'mobile'],
    score: 0.78,
    affiliateValue: 0.3,
  },

  // Travel Tech & Gadgets
  {
    type: 'product',
    category: 'travel',
    title: 'Universal Travel Adapter',
    description: 'Compact adapter works in 150+ countries. Perfect for your upcoming trip. USB-C, USB-A, and AC outlets. Essential for international travel.',
    mediaUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    source: 'TravelGear.com',
    affiliateUrl: 'https://example.com/products/adapter?ref=gepanda',
    tagsJson: ['adapter', 'electronics', 'travel-essentials', 'charging'],
    score: 0.72,
    affiliateValue: 0.7,
  },
  {
    type: 'product',
    category: 'travel',
    title: 'Noise-Cancelling Headphones',
    description: 'Premium headphones for long flights. Block out engine noise and enjoy your journey. 30-hour battery life. Perfect for frequent travelers.',
    mediaUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    source: 'AudioTech.com',
    affiliateUrl: 'https://example.com/products/headphones?ref=gepanda',
    tagsJson: ['headphones', 'audio', 'travel-comfort', 'noise-cancelling'],
    score: 0.75,
    affiliateValue: 0.75,
  },
  {
    type: 'product',
    category: 'travel',
    title: 'Smart Luggage with GPS Tracking',
    description: 'Never lose your luggage again. GPS-enabled smart suitcase with built-in charger and weight sensor. Track your bag in real-time via app.',
    mediaUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    source: 'SmartLuggage.com',
    affiliateUrl: 'https://example.com/products/smart-luggage?ref=gepanda',
    tagsJson: ['luggage', 'gps', 'smart-tech', 'travel-gear'],
    score: 0.78,
    affiliateValue: 0.8,
  },
  {
    type: 'product',
    category: 'travel',
    title: 'Portable WiFi Hotspot',
    description: 'Stay connected anywhere in the world. Portable WiFi device with global coverage. Share connection with up to 10 devices. Perfect for remote work.',
    mediaUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    source: 'ConnectivityTech.com',
    affiliateUrl: 'https://example.com/products/wifi-hotspot?ref=gepanda',
    tagsJson: ['wifi', 'connectivity', 'remote-work', 'travel-tech'],
    score: 0.80,
    affiliateValue: 0.75,
  },

  // Influencer Reels / Videos
  {
    type: 'video',
    category: 'entertainment',
    title: 'Top 10 Hidden Beaches in Thailand',
    description: 'Discover secret beaches away from the crowds. Perfect for solo travelers and couples. Stunning footage of Thailand\'s most beautiful hidden gems.',
    mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    source: 'TravelInfluencer',
    affiliateUrl: null,
    tagsJson: ['thailand', 'beaches', 'travel-vlog', 'hidden-gems', 'influencer'],
    score: 0.88,
    affiliateValue: 0.4,
  },
  {
    type: 'video',
    category: 'entertainment',
    title: 'Tokyo Street Food Tour in 60 Seconds',
    description: 'Fast-paced tour of Tokyo\'s best street food spots. From ramen to takoyaki! Experience authentic Japanese street food culture.',
    mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    source: 'FoodTraveler',
    affiliateUrl: null,
    tagsJson: ['tokyo', 'street-food', 'japan', 'food-tour', 'influencer'],
    score: 0.85,
    affiliateValue: 0.35,
  },
  {
    type: 'video',
    category: 'entertainment',
    title: '48 Hours in Kyoto: A Visual Journey',
    description: 'Experience the beauty of Kyoto through stunning 4K footage. Cherry blossoms, temples, and traditional culture. A must-watch for Japan travelers.',
    mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    source: 'TravelVlogger',
    affiliateUrl: null,
    tagsJson: ['kyoto', 'japan', 'travel-vlog', 'culture', 'influencer'],
    score: 0.90,
    affiliateValue: 0.4,
  },
  {
    type: 'video',
    category: 'entertainment',
    title: 'Iceland Road Trip: Northern Lights Adventure',
    description: 'Follow our journey through Iceland as we chase the aurora borealis. Tips, locations, and breathtaking footage. Perfect for adventure seekers.',
    mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    source: 'AdventureSeeker',
    affiliateUrl: null,
    tagsJson: ['iceland', 'northern-lights', 'road-trip', 'adventure', 'influencer'],
    score: 0.87,
    affiliateValue: 0.4,
  },
  {
    type: 'video',
    category: 'entertainment',
    title: 'Bali Instagram Spots: Best Photo Locations',
    description: 'Discover the most Instagram-worthy spots in Bali. From rice terraces to infinity pools, capture stunning photos for your feed.',
    mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    source: 'InstaTraveler',
    affiliateUrl: null,
    tagsJson: ['bali', 'instagram', 'photography', 'social-media', 'influencer'],
    score: 0.82,
    affiliateValue: 0.35,
  },

  // More Travel Articles
  {
    type: 'article',
    category: 'travel',
    title: 'Digital Nomad Guide: Best Cities for Remote Work',
    description: 'Top destinations for digital nomads. From affordable living costs to reliable internet, find your perfect remote work base.',
    mediaUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
    source: 'NomadLife.com',
    affiliateUrl: null,
    tagsJson: ['digital-nomad', 'remote-work', 'travel', 'lifestyle'],
    score: 0.80,
    affiliateValue: 0.3,
  },
  {
    type: 'article',
    category: 'travel',
    title: 'Travel Insurance: What You Need to Know',
    description: 'Comprehensive guide to travel insurance. Learn what\'s covered, when to buy, and how to choose the right policy for your trip.',
    mediaUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
    source: 'TravelInsurance.com',
    affiliateUrl: null,
    tagsJson: ['insurance', 'travel-tips', 'safety', 'planning'],
    score: 0.70,
    affiliateValue: 0.25,
  },
  {
    type: 'article',
    category: 'travel',
    title: 'Packing Hacks: Travel Light Like a Pro',
    description: 'Expert packing tips to maximize space and minimize weight. Learn how to pack for any trip in a carry-on bag.',
    mediaUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    source: 'PackingPro.com',
    affiliateUrl: null,
    tagsJson: ['packing', 'travel-tips', 'organization', 'light-travel'],
    score: 0.68,
    affiliateValue: 0.2,
  },

  // More Deals
  {
    type: 'deal',
    category: 'deals',
    title: 'Last Minute: Paris Weekend Getaway',
    description: 'Spontaneous trip to Paris? Book now and save 40% on hotels and flights. Perfect for a romantic weekend escape.',
    mediaUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    source: 'LastMinuteDeals.com',
    affiliateUrl: 'https://example.com/deals/paris-weekend?ref=gepanda',
    tagsJson: ['paris', 'weekend', 'last-minute', 'europe'],
    score: 0.90,
    affiliateValue: 0.90,
  },
  {
    type: 'deal',
    category: 'deals',
    title: 'Group Travel Discount: 15% Off for 4+ People',
    description: 'Planning a group trip? Get 15% off flights and hotels when booking for 4 or more people. Perfect for family vacations.',
    mediaUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
    source: 'GroupTravel.com',
    affiliateUrl: 'https://example.com/deals/group-discount?ref=gepanda',
    tagsJson: ['group-travel', 'family', 'discount', 'vacation'],
    score: 0.85,
    affiliateValue: 0.85,
  },
];

/**
 * POST /api/feed/seed
 * Seed demo feed items
 * Allowed if: NODE_ENV === "development" OR ALLOW_FEED_SEED === "true"
 */
router.post('/seed', async (req, res) => {
  // SECURITY: Only allow in development or if explicitly enabled
  const isDevelopment = process.env.NODE_ENV === 'development';
  const allowSeed = process.env.ALLOW_FEED_SEED === 'true';
  
  if (!isDevelopment && !allowSeed) {
    return res.status(403).json({
      error: 'Feed seeding is not available',
      message: 'Set NODE_ENV=development or ALLOW_FEED_SEED=true to enable seeding',
    });
  }

  if (!prisma) {
    return res.status(503).json({
      error: 'Database not available',
      message: 'Prisma client is not initialized',
    });
  }

  try {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const insertedItems: any[] = [];

    for (const item of DEMO_FEED_ITEMS) {
      try {
        // Use title as externalId for deduplication
        const externalId = `demo_${item.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
        
        // Try to find existing item by source + title (unique constraint)
        let existing = await prisma.feedItem.findFirst({
          where: {
            source: item.source,
            title: item.title,
          },
        });

        // Ensure tags include category tag for proper filtering
        const tagsWithCategory = [
          ...(item.tagsJson || []),
          // Add category as a tag if not already present (for filtering)
          ...(item.category && !item.tagsJson?.includes(item.category) ? [item.category] : []),
        ];

        const itemData = {
          type: item.type,
          category: item.category,
          title: item.title,
          description: item.description,
          mediaUrl: item.mediaUrl || null,
          source: item.source,
          externalId,
          affiliateUrl: item.affiliateUrl || null,
          tagsJson: tagsWithCategory as any, // Include category tag
          score: item.score,
          affiliateValue: item.affiliateValue ?? null,
          updatedAt: new Date(),
        };

        let feedItem;
        if (existing) {
          // Update existing item
          feedItem = await prisma.feedItem.update({
            where: { id: existing.id },
            data: itemData,
          });
          updated++;
        } else {
          // Create new item
          feedItem = await prisma.feedItem.create({
            data: {
              id: createId(),
              ...itemData,
              createdAt: new Date(),
            },
          });
          created++;
          // Track newly created items (first 20 for response)
          if (insertedItems.length < 20) {
            insertedItems.push({
              id: feedItem.id,
              type: feedItem.type,
              category: feedItem.category,
              title: feedItem.title,
              description: feedItem.description,
              mediaUrl: feedItem.mediaUrl,
              source: feedItem.source,
              affiliateUrl: feedItem.affiliateUrl,
              tagsJson: feedItem.tagsJson,
              score: feedItem.score,
              createdAt: feedItem.createdAt.toISOString(),
              updatedAt: feedItem.updatedAt.toISOString(),
            });
          }
        }

        // Sync to Stream (non-blocking)
        try {
          await syncFeedItemToStreamActivity({
            ...feedItem,
            tagsJson: feedItem.tagsJson as string[] | null,
            createdAt: feedItem.createdAt.toISOString(),
            updatedAt: feedItem.updatedAt.toISOString(),
          });
        } catch (error) {
          console.warn(`[Feed Seed] Failed to sync item ${feedItem.id} to Stream:`, error);
          // Continue even if Stream sync fails
        }
      } catch (error: any) {
        // Handle unique constraint violations
        if (error.code === 'P2002') {
          skipped++;
        } else {
          console.error(`[Feed Seed] Error processing item "${item.title}":`, error);
          skipped++;
        }
      }
    }

    res.json({
      success: true,
      message: 'Feed seeded successfully',
      inserted: created, // Number of newly created items
      stats: {
        created,
        updated,
        skipped,
        total: DEMO_FEED_ITEMS.length,
      },
      // Return first batch of items for immediate display
      items: insertedItems,
    });
  } catch (error) {
    console.error('[Feed Seed] Error seeding feed:', error);
    res.status(500).json({
      error: 'Failed to seed feed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
    });
  }
});

export default router;
