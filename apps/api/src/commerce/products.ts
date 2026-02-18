/**
 * Commerce Products
 * Product catalog and search
 */

import { z } from 'zod';
import type { FeedItem } from '@gepanda/shared';

export interface Product {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  price: string;
  originalPrice?: string;
  category: string;
  affiliateUrl?: string;
  checkoutUrl?: string;
  isAffiliate: boolean;
  isSponsored: boolean;
  tags?: string[];
  createdAt: string;
}

/**
 * Mock product catalog
 * Structured for easy replacement with real product API later
 */
const PRODUCT_CATALOG: Product[] = [
  {
    id: 'prod_travel_adapter',
    title: 'Universal Travel Adapter',
    description: 'Compact adapter works in 150+ countries. Perfect for your upcoming trip. USB-C, USB-A, and AC outlets.',
    imageUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    price: '$24.99',
    originalPrice: '$29.99',
    category: 'Travel Accessories',
    affiliateUrl: 'https://example.com/products/adapter?ref=gepanda',
    checkoutUrl: 'https://example.com/checkout/adapter?ref=gepanda',
    isAffiliate: true,
    isSponsored: false,
    tags: ['adapter', 'electronics', 'travel'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_noise_cancelling',
    title: 'Noise-Cancelling Headphones',
    description: 'Premium headphones for long flights. Block out engine noise and enjoy your journey. 30-hour battery life.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    price: '$199.99',
    originalPrice: '$249.99',
    category: 'Electronics',
    affiliateUrl: 'https://example.com/products/headphones?ref=gepanda',
    checkoutUrl: 'https://example.com/checkout/headphones?ref=gepanda',
    isAffiliate: true,
    isSponsored: false,
    tags: ['headphones', 'audio', 'travel'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_packing_cubes',
    title: 'Travel Packing Cubes Set',
    description: 'Organize your luggage efficiently. Set of 4 compression cubes in various sizes. Water-resistant fabric.',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    price: '$34.99',
    originalPrice: '$39.99',
    category: 'Travel Accessories',
    affiliateUrl: 'https://example.com/products/packing-cubes?ref=gepanda',
    checkoutUrl: 'https://example.com/checkout/packing-cubes?ref=gepanda',
    isAffiliate: true,
    isSponsored: false,
    tags: ['packing', 'organization', 'luggage'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_luggage_scale',
    title: 'Digital Luggage Scale',
    description: 'Never pay overweight fees again. Portable digital scale with backlit display. Weighs up to 110 lbs.',
    imageUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    price: '$19.99',
    category: 'Travel Accessories',
    affiliateUrl: 'https://example.com/products/luggage-scale?ref=gepanda',
    checkoutUrl: 'https://example.com/checkout/luggage-scale?ref=gepanda',
    isAffiliate: true,
    isSponsored: false,
    tags: ['luggage', 'scale', 'travel'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_travel_pillow',
    title: 'Memory Foam Travel Pillow',
    description: 'Comfortable neck support for long flights. Ergonomic design with washable cover. Compact and portable.',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
    price: '$29.99',
    category: 'Travel Accessories',
    affiliateUrl: 'https://example.com/products/travel-pillow?ref=gepanda',
    checkoutUrl: 'https://example.com/checkout/travel-pillow?ref=gepanda',
    isAffiliate: true,
    isSponsored: false,
    tags: ['pillow', 'comfort', 'travel'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_portable_charger',
    title: 'Portable Power Bank 20,000mAh',
    description: 'Fast-charging power bank for all your devices. USB-C and USB-A ports. Charges phones, tablets, and more.',
    imageUrl: 'https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=800',
    price: '$39.99',
    category: 'Electronics',
    affiliateUrl: 'https://example.com/products/power-bank?ref=gepanda',
    checkoutUrl: 'https://example.com/checkout/power-bank?ref=gepanda',
    isAffiliate: true,
    isSponsored: false,
    tags: ['charger', 'power', 'electronics'],
    createdAt: new Date().toISOString(),
  },
];

/**
 * Search products by query
 */
export function searchProducts(query: string, limit: number = 20): Product[] {
  if (!query || query.trim() === '') {
    return PRODUCT_CATALOG.slice(0, limit);
  }

  const lowerQuery = query.toLowerCase().trim();
  const queryTerms = lowerQuery.split(/\s+/);

  // Score products based on query match
  const scored = PRODUCT_CATALOG.map(product => {
    let score = 0;
    const searchText = `${product.title} ${product.description} ${product.category} ${product.tags?.join(' ') || ''}`.toLowerCase();

    // Exact title match
    if (product.title.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // Category match
    if (product.category.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }

    // Tag matches
    if (product.tags) {
      for (const tag of product.tags) {
        if (tag.toLowerCase().includes(lowerQuery)) {
          score += 3;
        }
      }
    }

    // Term matches in description
    for (const term of queryTerms) {
      if (searchText.includes(term)) {
        score += 1;
      }
    }

    return { product, score };
  });

  // Sort by score and return top results
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.product);
}

/**
 * Get product by ID
 */
export function getProductById(productId: string): Product | null {
  return PRODUCT_CATALOG.find(p => p.id === productId) || null;
}

const FEED_CATEGORIES = ['travel', 'deals', 'news', 'entertainment', 'lifestyle', 'tech', 'food', 'adventure'] as const;

/**
 * Convert Product to FeedItem (shared FeedItem type)
 */
export function productToFeedItem(product: Product): FeedItem {
  const cat = product.category?.toLowerCase();
  const category = cat && FEED_CATEGORIES.includes(cat as any) ? (cat as FeedItem['category']) : null;
  return {
    id: product.id,
    type: 'product',
    category,
    title: product.title,
    description: product.description,
    mediaUrl: product.imageUrl ?? null,
    source: product.category,
    affiliateUrl: product.affiliateUrl || product.checkoutUrl || null,
    tagsJson: product.tags ?? null,
    score: 1,
    createdAt: product.createdAt,
    updatedAt: product.createdAt,
  };
}

