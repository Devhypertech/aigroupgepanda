/**
 * Feed Dev Seed Route (Development Only)
 * POST /api/feed/dev/seed - Seeds demo feed items for local development
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';
import { createId } from '@paralleldrive/cuid2';

const router = Router();

/**
 * Demo feed items to seed (~25 items)
 * Categories: "for-you", "deals", "guides", "reels", "ai-news"
 * Each item includes: id, source, title, url(optional), imageUrl(optional), 
 * category, tags[], publishedAt, contentSnippet, lens ("traveler" | "founder" | "investor")
 */
const DEMO_FEED_ITEMS = [
  // For-You items
  {
    source: 'TravelBlog.com',
    title: '10 Hidden Gems in Southeast Asia',
    url: 'https://example.com/articles/southeast-asia-gems',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    category: 'for-you',
    tags: ['travel', 'southeast-asia', 'destinations', 'hidden-gems'],
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    contentSnippet: 'Discover off-the-beaten-path destinations that will take your breath away. From secret beaches to ancient temples.',
    lens: 'traveler',
  },
  {
    source: 'TechStartup.com',
    title: 'Building a Travel Tech Startup: Lessons Learned',
    url: 'https://example.com/articles/travel-startup-lessons',
    imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
    category: 'for-you',
    tags: ['startup', 'travel-tech', 'entrepreneurship', 'lessons'],
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    contentSnippet: 'Key insights from building a travel technology startup. What worked, what didn\'t, and what we\'d do differently.',
    lens: 'founder',
  },
  {
    source: 'VCInsights.com',
    title: 'Travel Tech Investment Trends 2024',
    url: 'https://example.com/articles/travel-tech-investment',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    category: 'for-you',
    tags: ['investment', 'travel-tech', 'vc', 'trends', '2024'],
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    contentSnippet: 'Analysis of travel technology investment trends. Where VCs are putting their money in 2024.',
    lens: 'investor',
  },
  {
    source: 'Wanderlust.com',
    title: 'Solo Travel Guide: Safety Tips for Female Travelers',
    url: 'https://example.com/guides/solo-female-travel',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
    category: 'for-you',
    tags: ['solo-travel', 'safety', 'female-travelers', 'tips'],
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    contentSnippet: 'Essential safety tips and destination recommendations for solo female travelers. Build confidence and explore independently.',
    lens: 'traveler',
  },
  {
    source: 'StartupLife.com',
    title: 'How to Fundraise for Your Travel Startup',
    url: 'https://example.com/articles/fundraising-travel-startup',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
    category: 'for-you',
    tags: ['fundraising', 'startup', 'travel', 'vc'],
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    contentSnippet: 'A comprehensive guide to fundraising for travel startups. Pitch deck tips, investor targeting, and common pitfalls.',
    lens: 'founder',
  },

  // Deals
  {
    source: 'TravelDeals.com',
    title: '50% Off Summer Flights to Europe',
    url: 'https://example.com/deals/europe-summer',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
    category: 'deals',
    tags: ['deals', 'europe', 'flights', 'summer', 'sale'],
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    contentSnippet: 'Limited time summer sale! Book flights to major European destinations with 50% discount. Valid until end of month.',
    lens: 'traveler',
  },
  {
    source: 'LuxuryTravel.com',
    title: 'Luxury Hotel Package: Maldives',
    url: 'https://example.com/deals/maldives-luxury',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    category: 'deals',
    tags: ['deals', 'maldives', 'luxury', 'hotel', 'resort'],
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    contentSnippet: 'All-inclusive 7-night stay at 5-star resort. Includes breakfast, spa access, and water activities.',
    lens: 'traveler',
  },
  {
    source: 'TravelPackages.com',
    title: 'Early Bird: Tokyo Package Deal',
    url: 'https://example.com/deals/tokyo-package',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    category: 'deals',
    tags: ['deals', 'tokyo', 'japan', 'package', 'asia'],
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    contentSnippet: 'Book your Tokyo adventure now and save 25%. Includes flights and 4-star hotel.',
    lens: 'traveler',
  },
  {
    source: 'BeachResorts.com',
    title: 'Bali Beach Resort Special',
    url: 'https://example.com/deals/bali-resort',
    imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800',
    category: 'deals',
    tags: ['deals', 'bali', 'beach', 'resort', 'tropical'],
    publishedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
    contentSnippet: 'Save 30% on beachfront resorts in Bali. Includes airport transfer and daily breakfast.',
    lens: 'traveler',
  },
  {
    source: 'LuxuryHotels.com',
    title: 'Dubai Luxury Stay: 40% Off',
    url: 'https://example.com/deals/dubai-luxury',
    imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800',
    category: 'deals',
    tags: ['deals', 'dubai', 'luxury', 'middle-east'],
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    contentSnippet: 'Experience the opulence of Dubai with our exclusive hotel deal. Perfect for luxury travelers.',
    lens: 'traveler',
  },

  // Guides
  {
    source: 'TravelMagazine.com',
    title: 'Sustainable Travel: How to Reduce Your Carbon Footprint',
    url: 'https://example.com/guides/sustainable-travel',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
    category: 'guides',
    tags: ['guides', 'sustainability', 'eco-travel', 'environment'],
    publishedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 days ago
    contentSnippet: 'Practical tips for eco-conscious travelers. Learn how to travel sustainably without sacrificing adventure.',
    lens: 'traveler',
  },
  {
    source: 'SoloTraveler.com',
    title: 'Budget Travel: How to See the World on $50/Day',
    url: 'https://example.com/guides/budget-travel',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    category: 'guides',
    tags: ['guides', 'budget', 'backpacking', 'tips'],
    publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
    contentSnippet: 'Proven strategies for budget-conscious travelers. Hostels, local food, and smart planning.',
    lens: 'traveler',
  },
  {
    source: 'TravelEssentials.com',
    title: 'Packing Like a Pro: Ultimate Travel Checklist',
    url: 'https://example.com/guides/packing-checklist',
    imageUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    category: 'guides',
    tags: ['guides', 'packing', 'checklist', 'tips'],
    publishedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), // 13 days ago
    contentSnippet: 'Never forget essentials again. Complete packing guide for every type of trip and destination.',
    lens: 'traveler',
  },
  {
    source: 'PassportGuide.com',
    title: 'Visa-Free Destinations for US Passport Holders',
    url: 'https://example.com/guides/visa-free-destinations',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    category: 'guides',
    tags: ['guides', 'visa', 'passport', 'destinations'],
    publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
    contentSnippet: 'Explore 180+ countries without a visa. Complete guide to visa-free travel destinations.',
    lens: 'traveler',
  },
  {
    source: 'StartupGuide.com',
    title: 'How to Build a Travel Tech MVP in 30 Days',
    url: 'https://example.com/guides/travel-mvp',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
    category: 'guides',
    tags: ['guides', 'startup', 'mvp', 'travel-tech'],
    publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    contentSnippet: 'Step-by-step guide to building a travel technology MVP quickly. Tools, frameworks, and best practices.',
    lens: 'founder',
  },

  // Reels
  {
    source: 'YouTube',
    title: '48 Hours in Kyoto: A Visual Journey',
    url: 'https://youtube.com/watch?v=kyoto-journey',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    category: 'reels',
    tags: ['reels', 'kyoto', 'japan', 'travel-vlog', 'culture'],
    publishedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), // 16 days ago
    contentSnippet: 'Experience the beauty of Kyoto through stunning 4K footage. Cherry blossoms, temples, and traditional culture.',
    lens: 'traveler',
  },
  {
    source: 'YouTube',
    title: 'Iceland Road Trip: Northern Lights Adventure',
    url: 'https://youtube.com/watch?v=iceland-lights',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    category: 'reels',
    tags: ['reels', 'iceland', 'northern-lights', 'road-trip', 'adventure'],
    publishedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000), // 17 days ago
    contentSnippet: 'Follow our journey through Iceland as we chase the aurora borealis. Tips, locations, and breathtaking footage.',
    lens: 'traveler',
  },
  {
    source: 'YouTube',
    title: 'Street Food Tour: Bangkok Night Market',
    url: 'https://youtube.com/watch?v=bangkok-food',
    imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800',
    category: 'reels',
    tags: ['reels', 'bangkok', 'street-food', 'thailand', 'food-tour'],
    publishedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
    contentSnippet: 'Join us for an authentic street food experience in Bangkok. From pad thai to mango sticky rice.',
    lens: 'traveler',
  },
  {
    source: 'YouTube',
    title: 'Santorini Sunset: Most Beautiful Views',
    url: 'https://youtube.com/watch?v=santorini-sunset',
    imageUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    category: 'reels',
    tags: ['reels', 'santorini', 'greece', 'sunset', 'islands'],
    publishedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), // 19 days ago
    contentSnippet: 'Watch the most stunning sunsets in Santorini. White-washed buildings and crystal-clear waters.',
    lens: 'traveler',
  },
  {
    source: 'YouTube',
    title: 'Startup Pitch: Travel Tech Innovation',
    url: 'https://youtube.com/watch?v=startup-pitch',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800',
    category: 'reels',
    tags: ['reels', 'startup', 'pitch', 'travel-tech', 'innovation'],
    publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
    contentSnippet: 'Watch our startup pitch for a revolutionary travel technology platform. Innovation meets wanderlust.',
    lens: 'founder',
  },

  // AI News
  {
    source: 'TechTravel.com',
    title: 'AI-Powered Travel Planning: The Future is Here',
    url: 'https://example.com/ai-news/ai-travel-planning',
    imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
    category: 'ai-news',
    tags: ['ai-news', 'ai', 'travel-tech', 'innovation'],
    publishedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
    contentSnippet: 'How artificial intelligence is revolutionizing travel planning. Personalized recommendations and smart itineraries.',
    lens: 'founder',
  },
  {
    source: 'TechTravel.com',
    title: 'Best Travel Apps for 2024',
    url: 'https://example.com/ai-news/travel-apps-2024',
    imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
    category: 'ai-news',
    tags: ['ai-news', 'apps', 'technology', 'travel-tech'],
    publishedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), // 22 days ago
    contentSnippet: 'From AI-powered trip planners to real-time translation, these apps will revolutionize your travel experience.',
    lens: 'traveler',
  },
  {
    source: 'TechTravel.com',
    title: 'Virtual Reality Travel: Explore Before You Go',
    url: 'https://example.com/ai-news/vr-travel',
    imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
    category: 'ai-news',
    tags: ['ai-news', 'vr', 'virtual-reality', 'innovation'],
    publishedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000), // 23 days ago
    contentSnippet: 'Experience destinations in VR before booking. The future of travel planning is immersive.',
    lens: 'founder',
  },
  {
    source: 'TechGadgets.com',
    title: 'Smart Luggage: Tech Gadgets for Modern Travelers',
    url: 'https://example.com/ai-news/smart-luggage',
    imageUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    category: 'ai-news',
    tags: ['ai-news', 'gadgets', 'smart-luggage', 'innovation'],
    publishedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000), // 24 days ago
    contentSnippet: 'GPS tracking, USB charging, and more. The latest tech gadgets that make travel easier.',
    lens: 'traveler',
  },
  {
    source: 'AITravel.com',
    title: 'ChatGPT Travel Assistant: Your AI Companion',
    url: 'https://example.com/ai-news/chatgpt-travel',
    imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
    category: 'ai-news',
    tags: ['ai-news', 'chatgpt', 'ai-assistant', 'travel-planning'],
    publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
    contentSnippet: 'How to use ChatGPT for travel planning. Tips, prompts, and real-world examples.',
    lens: 'traveler',
  },
  {
    source: 'VCWeekly.com',
    title: 'AI Startups in Travel: Investment Opportunities',
    url: 'https://example.com/ai-news/ai-travel-investment',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    category: 'ai-news',
    tags: ['ai-news', 'investment', 'startups', 'travel-tech', 'ai'],
    publishedAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000), // 26 days ago
    contentSnippet: 'Analysis of AI-powered travel startups attracting VC funding. Market opportunities and trends.',
    lens: 'investor',
  },
];

/**
 * POST /api/feed/dev/seed
 * Development-only endpoint to seed demo feed items
 * Only works when NODE_ENV !== 'production'
 */
router.post('/seed', async (req, res) => {
  // Only allow when not in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'This endpoint is only available in development mode',
    });
  }

  if (!prisma) {
    return res.status(500).json({
      error: 'Database not available',
    });
  }

  try {
    let inserted = 0;

    // Process each item with upsert logic
    for (const item of DEMO_FEED_ITEMS) {
      const externalId = `dev_seed_${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      
      try {
        // Try to find existing item by source + externalId or source + title
        const existing = await prisma.feedItem.findFirst({
          where: {
            OR: [
              { source: item.source, externalId },
              { source: item.source, title: item.title },
            ],
          },
        });

        // Ensure tags include category tag for proper filtering
        const tagsWithCategory = [
          ...(item.tags || []),
          // Add category as a tag if not already present (for filtering)
          ...(item.category && !item.tags?.includes(item.category) ? [item.category] : []),
        ];

        if (existing) {
          // Update existing item
          await prisma.feedItem.update({
            where: { id: existing.id },
            data: {
              type: 'article', // Default type
              category: item.category,
              title: item.title,
              description: item.contentSnippet || item.title,
              mediaUrl: item.imageUrl,
              url: item.url || null,
              source: item.source,
              externalId,
              tagsJson: tagsWithCategory, // Include category tag
              publishedAt: item.publishedAt || null,
              contentSnippet: item.contentSnippet || null,
              lens: item.lens || null,
              score: item.category === 'deals' ? 0.9 : 0.7, // Higher score for deals
              affiliateValue: item.category === 'deals' ? 0.8 : 0.3,
              updatedAt: new Date(),
            } as any, // Type assertion for new fields until Prisma client is regenerated
          });
        } else {
          // Create new item
          await prisma.feedItem.create({
            data: {
              id: createId(),
              type: 'article', // Default type
              category: item.category,
              title: item.title,
              description: item.contentSnippet || item.title,
              mediaUrl: item.imageUrl,
              url: item.url || null,
              source: item.source,
              externalId,
              tagsJson: tagsWithCategory, // Include category tag
              publishedAt: item.publishedAt || null,
              contentSnippet: item.contentSnippet || null,
              lens: item.lens || null,
              score: item.category === 'deals' ? 0.9 : 0.7, // Higher score for deals
              affiliateValue: item.category === 'deals' ? 0.8 : 0.3,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any, // Type assertion for new fields until Prisma client is regenerated
          });
          inserted++;
        }
      } catch (error: any) {
        // Handle unique constraint violations gracefully
        if (error.code === 'P2002') {
          console.warn(`[Feed Dev Seed] Skipping duplicate: ${item.title}`);
          continue;
        }
        throw error;
      }
    }

    console.log(`[FEED_DEV_SEED] Completed: ${inserted} items inserted, ${DEMO_FEED_ITEMS.length - inserted} items already existed`);
    
    res.json({
      ok: true,
      inserted,
    });
  } catch (error) {
    console.error('[Feed Dev Seed] Error seeding feed items:', error);
    res.status(500).json({
      error: 'Failed to seed feed items',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
