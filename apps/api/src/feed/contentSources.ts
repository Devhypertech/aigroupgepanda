/**
 * Mock Content Sources
 * Structured for easy replacement with real ingestion later
 */

import type { FeedItem } from '@gepanda/shared';

/**
 * Mock destination content
 */
export const DESTINATION_CONTENT: Omit<FeedItem, 'id' | 'relevanceScore' | 'createdAt'>[] = [
  {
    type: 'destination',
    title: 'Discover Kyoto in Spring',
    description: 'Experience cherry blossoms and traditional temples in Japan\'s cultural capital. Perfect weather in April-May.',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    metadata: {
      destination: 'Kyoto',
      country: 'Japan',
      bestTimeToVisit: 'April - May',
    },
  },
  {
    type: 'destination',
    title: 'Explore Santorini',
    description: 'Stunning sunsets, white-washed buildings, and crystal-clear waters. Best visited in summer months.',
    imageUrl: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800',
    metadata: {
      destination: 'Santorini',
      country: 'Greece',
      bestTimeToVisit: 'June - September',
    },
  },
  {
    type: 'destination',
    title: 'Adventure in Iceland',
    description: 'Northern lights, glaciers, and geothermal wonders. Ideal for winter and early spring.',
    imageUrl: 'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=800',
    metadata: {
      destination: 'Reykjavik',
      country: 'Iceland',
      bestTimeToVisit: 'September - March',
    },
  },
  {
    type: 'destination',
    title: 'Tropical Paradise: Maldives',
    description: 'Pristine beaches, overwater bungalows, and world-class diving. Year-round destination.',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    metadata: {
      destination: 'Maldives',
      country: 'Maldives',
      bestTimeToVisit: 'Year-round',
    },
  },
  {
    type: 'destination',
    title: 'Cultural Journey: Marrakech',
    description: 'Vibrant souks, historic medinas, and rich Moroccan culture. Best in spring and fall.',
    imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800',
    metadata: {
      destination: 'Marrakech',
      country: 'Morocco',
      bestTimeToVisit: 'March - May, September - November',
    },
  },
];

/**
 * Mock deal content
 */
export const DEAL_CONTENT: Omit<FeedItem, 'id' | 'relevanceScore' | 'createdAt'>[] = [
  {
    type: 'deal',
    title: '30% Off Flights to Bali',
    description: 'Limited time offer: Save on round-trip flights to Bali. Valid until end of month.',
    imageUrl: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800',
    metadata: {
      dealUrl: 'https://example.com/deals/bali',
      discount: '30%',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      price: '$699',
      originalPrice: '$999',
    },
  },
  {
    type: 'deal',
    title: 'Early Bird: Tokyo Hotel Discount',
    description: 'Book now and save 25% on hotels in Tokyo. Perfect for cherry blossom season.',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    metadata: {
      dealUrl: 'https://example.com/deals/tokyo',
      discount: '25%',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      price: '$120/night',
      originalPrice: '$160/night',
    },
  },
  {
    type: 'deal',
    title: 'Europe Rail Pass Sale',
    description: 'Unlimited train travel across Europe. 20% off for limited time.',
    imageUrl: 'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=800',
    metadata: {
      dealUrl: 'https://example.com/deals/eurail',
      discount: '20%',
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      price: '$299',
      originalPrice: '$374',
    },
  },
];

/**
 * Mock weather content
 */
export const WEATHER_CONTENT: Omit<FeedItem, 'id' | 'relevanceScore' | 'createdAt'>[] = [
  {
    type: 'weather',
    title: 'Weather Alert: Tokyo',
    description: 'Heavy rain expected this weekend. Consider indoor activities or rescheduling outdoor plans.',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
    metadata: {
      location: 'Tokyo, Japan',
      alertLevel: 'warning',
      forecast: 'Heavy rain, 80% chance',
    },
  },
  {
    type: 'weather',
    title: 'Perfect Beach Weather: Maldives',
    description: 'Sunny skies and calm waters expected for the next week. Ideal conditions for water activities.',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    metadata: {
      location: 'Maldives',
      alertLevel: 'info',
      forecast: 'Sunny, 28°C, light winds',
    },
  },
];

/**
 * Mock product content
 */
export const PRODUCT_CONTENT: Omit<FeedItem, 'id' | 'relevanceScore' | 'createdAt'>[] = [
  {
    type: 'product',
    title: 'Universal Travel Adapter',
    description: 'Compact adapter works in 150+ countries. Perfect for your upcoming trip.',
    imageUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    metadata: {
      productUrl: 'https://example.com/products/adapter',
      productPrice: '$24.99',
      productCategory: 'Travel Accessories',
      productId: 'prod_travel_adapter',
      isAffiliate: true,
      isSponsored: false,
    },
  },
  {
    type: 'product',
    title: 'Noise-Cancelling Headphones',
    description: 'Premium headphones for long flights. Block out engine noise and enjoy your journey.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    metadata: {
      productUrl: 'https://example.com/products/headphones',
      productPrice: '$199.99',
      productCategory: 'Electronics',
      productId: 'prod_noise_cancelling',
      isAffiliate: true,
      isSponsored: false,
    },
  },
  {
    type: 'product',
    title: 'Travel Packing Cubes Set',
    description: 'Organize your luggage efficiently. Set of 4 compression cubes in various sizes.',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    metadata: {
      productUrl: 'https://example.com/products/packing-cubes',
      productPrice: '$34.99',
      productCategory: 'Travel Accessories',
      productId: 'prod_packing_cubes',
      isAffiliate: true,
      isSponsored: false,
    },
  },
];

/**
 * Mock insight content
 */
export const INSIGHT_CONTENT: Omit<FeedItem, 'id' | 'relevanceScore' | 'createdAt'>[] = [
  {
    type: 'insight',
    title: 'Crypto-Friendly Destinations',
    description: 'Top 5 destinations where cryptocurrency is widely accepted. Plan your crypto travel adventure.',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    metadata: {
      category: 'Crypto Travel',
      source: 'GePanda AI',
      tags: ['crypto', 'blockchain', 'travel'],
    },
  },
  {
    type: 'insight',
    title: 'Sustainable Travel Trends 2024',
    description: 'How travelers are reducing their carbon footprint. Eco-friendly destinations and practices.',
    imageUrl: 'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=800',
    metadata: {
      category: 'Travel Trends',
      source: 'GePanda AI',
      tags: ['sustainability', 'eco-travel', 'trends'],
    },
  },
  {
    type: 'insight',
    title: 'AI-Powered Trip Planning',
    description: 'How artificial intelligence is revolutionizing travel planning. Personalized recommendations at scale.',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800',
    metadata: {
      category: 'Technology',
      source: 'GePanda AI',
      tags: ['ai', 'technology', 'travel-tech'],
    },
  },
];

/**
 * Get all content sources
 */
export function getAllContent(): Omit<FeedItem, 'id' | 'relevanceScore' | 'createdAt'>[] {
  return [
    ...DESTINATION_CONTENT,
    ...DEAL_CONTENT,
    ...WEATHER_CONTENT,
    ...PRODUCT_CONTENT,
    ...INSIGHT_CONTENT,
  ];
}

