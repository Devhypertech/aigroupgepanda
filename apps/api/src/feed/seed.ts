/**
 * Feed Seed Data
 * Static JSON array for initial feed items
 * Can be replaced with real ingestion later
 */

import type { FeedItemType, FeedItemCategory } from './schemas.js';

export interface SeedFeedItem {
  type: FeedItemType;
  category: FeedItemCategory | null;
  title: string;
  description: string;
  mediaUrl: string | null;
  source?: string | null; // Optional, defaults to 'Seed Data'
  affiliateUrl: string | null;
  tagsJson: string[] | null;
  score: number;
  affiliateValue?: number; // Optional affiliate value (0-1)
}

export const SEED_FEED_ITEMS: SeedFeedItem[] = [
  // Deals
  {
    type: 'deal',
    category: 'deals',
    title: '30% Off Flights to Bali',
    description: 'Limited time offer: Save on round-trip flights to Bali. Valid until end of month.',
    mediaUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800',
    source: 'TravelDeals.com',
    affiliateUrl: 'https://example.com/deals/bali?ref=gepanda',
    tagsJson: ['bali', 'flights', 'asia', 'tropical'],
    score: 0.85,
    affiliateValue: 0.9,
  },
  {
    type: 'deal',
    category: 'deals',
    title: 'Hotel Discount: Paris Spring Sale',
    description: 'Save up to 40% on luxury hotels in Paris. Book now for spring travel.',
    mediaUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    source: 'HotelDeals.com',
    affiliateUrl: 'https://example.com/deals/paris?ref=gepanda',
    tagsJson: ['paris', 'hotels', 'europe', 'luxury'],
    score: 0.78,
    affiliateValue: 0.85,
  },
  {
    type: 'deal',
    category: 'deals',
    title: 'Early Bird: Tokyo Package Deal',
    description: 'Book your Tokyo adventure now and save 25%. Includes flights and 4-star hotel.',
    mediaUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    source: 'TravelPackages.com',
    affiliateUrl: 'https://example.com/deals/tokyo?ref=gepanda',
    tagsJson: ['tokyo', 'japan', 'package', 'asia'],
    score: 0.82,
    affiliateValue: 0.88,
  },

  // Articles
  {
    type: 'article',
    category: 'travel',
    title: '10 Hidden Gems in Southeast Asia',
    description: 'Discover off-the-beaten-path destinations that will take your breath away. From secret beaches to ancient temples.',
    mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    source: 'TravelMagazine.com',
    affiliateUrl: null,
    tagsJson: ['southeast-asia', 'destinations', 'travel-tips'],
    score: 0.75,
  },
  {
    type: 'article',
    category: 'lifestyle',
    title: 'Sustainable Travel: How to Reduce Your Carbon Footprint',
    description: 'Practical tips for eco-conscious travelers. Learn how to travel sustainably without sacrificing adventure.',
    mediaUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
    source: 'EcoTravel.com',
    affiliateUrl: null,
    tagsJson: ['sustainability', 'eco-travel', 'environment'],
    score: 0.70,
  },
  {
    type: 'article',
    category: 'tech',
    title: 'Best Travel Apps for 2024',
    description: 'From AI-powered trip planners to real-time translation, these apps will revolutionize your travel experience.',
    mediaUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800',
    source: 'TechTravel.com',
    affiliateUrl: null,
    tagsJson: ['apps', 'technology', 'travel-tech'],
    score: 0.68,
  },

  // Videos
  {
    type: 'video',
    category: 'entertainment',
    title: '48 Hours in Kyoto: A Visual Journey',
    description: 'Experience the beauty of Kyoto through stunning 4K footage. Cherry blossoms, temples, and traditional culture.',
    mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder - replace with real YouTube ID
    source: 'YouTube',
    affiliateUrl: null,
    tagsJson: ['kyoto', 'japan', 'travel-vlog', 'culture'],
    score: 0.88,
  },
  {
    type: 'video',
    category: 'travel',
    title: 'Iceland Road Trip: Northern Lights Adventure',
    description: 'Follow our journey through Iceland as we chase the aurora borealis. Tips, locations, and breathtaking footage.',
    mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    source: 'YouTube',
    affiliateUrl: null,
    tagsJson: ['iceland', 'northern-lights', 'road-trip', 'adventure'],
    score: 0.85,
  },
  {
    type: 'video',
    category: 'food',
    title: 'Street Food Tour: Bangkok Night Market',
    description: 'Join us for an authentic street food experience in Bangkok. From pad thai to mango sticky rice.',
    mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    source: 'YouTube',
    affiliateUrl: null,
    tagsJson: ['bangkok', 'street-food', 'thailand', 'food-tour'],
    score: 0.80,
  },

  // Destinations
  {
    type: 'destination',
    category: 'travel',
    title: 'Discover Kyoto in Spring',
    description: 'Experience cherry blossoms and traditional temples in Japan\'s cultural capital. Perfect weather in April-May.',
    mediaUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    source: null,
    affiliateUrl: null,
    tagsJson: ['kyoto', 'japan', 'cherry-blossoms', 'spring'],
    score: 0.90,
  },
  {
    type: 'destination',
    category: 'travel',
    title: 'Explore Santorini',
    description: 'Stunning sunsets, white-washed buildings, and crystal-clear waters. Best visited in summer months.',
    mediaUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    source: null,
    affiliateUrl: null,
    tagsJson: ['santorini', 'greece', 'islands', 'summer'],
    score: 0.87,
  },

  // Products
  {
    type: 'product',
    category: 'travel',
    title: 'Universal Travel Adapter',
    description: 'Compact adapter works in 150+ countries. Perfect for your upcoming trip. USB-C, USB-A, and AC outlets.',
    mediaUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    source: 'TravelGear.com',
    affiliateUrl: 'https://example.com/products/adapter?ref=gepanda',
    tagsJson: ['adapter', 'electronics', 'travel-essentials'],
    score: 0.72,
  },
  {
    type: 'product',
    category: 'travel',
    title: 'Noise-Cancelling Headphones',
    description: 'Premium headphones for long flights. Block out engine noise and enjoy your journey. 30-hour battery life.',
    mediaUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    source: 'AudioTech.com',
    affiliateUrl: 'https://example.com/products/headphones?ref=gepanda',
    tagsJson: ['headphones', 'audio', 'travel-comfort'],
    score: 0.75,
  },
];

