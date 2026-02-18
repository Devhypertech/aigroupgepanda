/**
 * Interests Seed Data
 * Seeds interest catalog for onboarding (~25 interests)
 */

import { createId } from '@paralleldrive/cuid2';

export const INTERESTS_SEED = [
  // User-requested core interests
  { slug: 'japan', label: 'Japan', group: 'travel' },
  { slug: 'europe', label: 'Europe', group: 'travel' },
  { slug: 'budget-travel', label: 'Budget Travel', group: 'lifestyle' },
  { slug: 'luxury', label: 'Luxury', group: 'lifestyle' },
  { slug: 'food', label: 'Food', group: 'travel' },
  { slug: 'nature', label: 'Nature', group: 'travel' },
  { slug: 'ai-news', label: 'AI News', group: 'ai-news' },
  { slug: 'startup', label: 'Startup', group: 'tech' },
  { slug: 'investing', label: 'Investing', group: 'tech' },
  { slug: 'deals', label: 'Deals', group: 'deals' },
  { slug: 'safety', label: 'Safety', group: 'travel' },
  { slug: 'weather', label: 'Weather', group: 'travel' },
  
  // Additional travel interests
  { slug: 'traveling', label: 'Traveling', group: 'travel' },
  { slug: 'adventures', label: 'Adventures', group: 'travel' },
  { slug: 'tour-deals', label: 'Tour Deals', group: 'deals' },
  { slug: 'tour-meals', label: 'Tour Meals', group: 'travel' },
  { slug: 'air-tickets', label: 'Air Tickets', group: 'deals' },
  { slug: 'free-visa', label: 'Free Visa', group: 'travel' },
  { slug: 'visa-policies', label: 'Visa Policies', group: 'travel' },
  { slug: 'tour-guides', label: 'Tour Guides', group: 'travel' },
  { slug: 'tour-partners', label: 'Tour Partners', group: 'travel' },
  { slug: 'season-deals', label: 'Season Deals', group: 'deals' },
  { slug: 'picnic', label: 'Picnic', group: 'travel' },
  { slug: 'beach-spots', label: 'Beach Spots', group: 'travel' },
  { slug: 'accommodation', label: 'Accommodation', group: 'travel' },
  { slug: 'beach-vacations', label: 'Beach Vacations', group: 'travel' },
  { slug: 'mountain-adventures', label: 'Mountain Adventures', group: 'travel' },
  { slug: 'city-breaks', label: 'City Breaks', group: 'travel' },
  { slug: 'solo-travel', label: 'Solo Travel', group: 'travel' },
  { slug: 'family-trips', label: 'Family Trips', group: 'travel' },
  { slug: 'adventure-travel', label: 'Adventure Travel', group: 'travel' },
  { slug: 'cultural-tourism', label: 'Cultural Tourism', group: 'travel' },
  { slug: 'food-travel', label: 'Food & Culinary Travel', group: 'travel' },
  
  // Deals & Discounts
  { slug: 'flight-deals', label: 'Flight Deals', group: 'deals' },
  { slug: 'hotel-deals', label: 'Hotel Deals', group: 'deals' },
  { slug: 'package-deals', label: 'Package Deals', group: 'deals' },
  { slug: 'last-minute-deals', label: 'Last Minute Deals', group: 'deals' },
  
  // Travel Tech & Gadgets
  { slug: 'travel-tech', label: 'Travel Technology', group: 'gadgets' },
  { slug: 'travel-apps', label: 'Travel Apps', group: 'gadgets' },
  { slug: 'travel-gadgets', label: 'Travel Gadgets', group: 'gadgets' },
  
  // Reels & Videos
  { slug: 'travel-reels', label: 'Travel Reels', group: 'reels' },
  { slug: 'travel-vlogs', label: 'Travel Vlogs', group: 'reels' },
  { slug: 'destination-shorts', label: 'Destination Shorts', group: 'reels' },
  
  // AI & Crypto News
  { slug: 'ai-travel', label: 'AI Travel Planning', group: 'ai-news' },
  { slug: 'crypto-travel', label: 'Crypto Travel', group: 'crypto' },
  { slug: 'blockchain-news', label: 'Blockchain News', group: 'crypto' },
  
  // Lifestyle
  { slug: 'luxury-travel', label: 'Luxury Travel', group: 'lifestyle' },
  { slug: 'digital-nomad', label: 'Digital Nomad Lifestyle', group: 'lifestyle' },
  { slug: 'sustainable-travel', label: 'Sustainable Travel', group: 'lifestyle' },
  { slug: 'wellness-travel', label: 'Wellness & Spa Travel', group: 'lifestyle' },
  
  // Additional interests
  { slug: 'road-trips', label: 'Road Trips', group: 'travel' },
  { slug: 'cruise-travel', label: 'Cruise Travel', group: 'travel' },
  { slug: 'backpacking', label: 'Backpacking', group: 'travel' },
];

export async function seedInterests(prisma: any): Promise<void> {
  if (!prisma) {
    console.warn('[Interests Seed] Prisma not available');
    return;
  }

  try {
    let created = 0;
    let skipped = 0;

    for (const interest of INTERESTS_SEED) {
      try {
        await (prisma as any).interest.upsert({
          where: { slug: interest.slug },
          update: {
            label: interest.label,
            group: interest.group,
          },
          create: {
            id: createId(),
            slug: interest.slug,
            label: interest.label,
            group: interest.group,
          },
        });
        created++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          skipped++;
        } else {
          console.error(`[Interests Seed] Error seeding interest "${interest.slug}":`, error);
          skipped++;
        }
      }
    }

    console.log(`[Interests Seed] Complete: ${created} created, ${skipped} skipped`);
  } catch (error) {
    console.error('[Interests Seed] Error seeding interests:', error);
  }
}
