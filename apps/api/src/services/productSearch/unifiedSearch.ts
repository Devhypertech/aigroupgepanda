/**
 * Unified Product Search Service
 * Searches across SerpAPI, Google Shopping, and Doba APIs
 */

import { searchShopping } from './serpApiShopping.js';
import { dobaSearch } from '../doba.js';
import { searchGoogleShopping } from '../serpapiShopping.js';
import {
  normalizeSerpApiProduct,
  normalizeDobaProduct,
  normalizeGoogleShoppingProduct,
  filterByBudget,
  type NormalizedProduct,
} from './normalize.js';
import { detectProductIntent, type ProductSearchIntent } from './intentDetection.js';

export interface UnifiedSearchOptions {
  category?: string;
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

/**
 * Unified product search across all sources
 */
export async function unifiedProductSearch(
  query: string,
  options: UnifiedSearchOptions = {}
): Promise<NormalizedProduct[]> {
  // Detect intent from query if not provided
  const intent = detectProductIntent(query);
  
  // Use detected intent or provided options
  const searchQuery = intent.productName || query;
  const category = options.category || intent.category;
  const budget = options.budget || intent.budget;

  console.log('[UnifiedSearch] Searching products:', {
    query: searchQuery,
    category,
    budget,
  });

  // Search all sources in parallel
  const searchPromises: Promise<NormalizedProduct[]>[] = [];

  // SerpAPI search
  searchPromises.push(
    searchShopping(searchQuery)
      .then(products => products.map((p, i) => normalizeSerpApiProduct(p as any, i)))
      .catch(error => {
        console.error('[UnifiedSearch] SerpAPI error:', error);
        return [];
      })
  );

  // Google Shopping API search (via SerpAPI)
  searchPromises.push(
    searchGoogleShopping(searchQuery, {
      country: process.env.GOOGLE_SHOPPING_COUNTRY || 'US',
      language: process.env.GOOGLE_SHOPPING_LANGUAGE || 'en',
      location: process.env.GOOGLE_SHOPPING_LOCATION || 'United States',
    })
      .then(products => products.map((p, i) => normalizeGoogleShoppingProduct(p as any, i)))
      .catch(error => {
        console.error('[UnifiedSearch] Google Shopping error:', error);
        return [];
      })
  );

  // Doba search
  searchPromises.push(
    dobaSearch(searchQuery, { page: 1, limit: 10 })
      .then(products => products.map((p, i) => normalizeDobaProduct(p as any, i)))
      .catch(error => {
        console.error('[UnifiedSearch] Doba error:', error);
        return [];
      })
  );

  // Wait for all searches to complete
  const results = await Promise.allSettled(searchPromises);

  // Combine all results
  const allProducts: NormalizedProduct[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allProducts.push(...result.value);
    }
  }

  // Filter by category if specified
  let filteredProducts = allProducts;
  if (category) {
    filteredProducts = filteredProducts.filter(product => {
      const titleLower = product.title.toLowerCase();
      const categoryKeywords: Record<string, string[]> = {
        electronics: ['phone', 'laptop', 'tablet', 'headphones', 'speaker', 'camera', 'tv'],
        clothing: ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'hat'],
        home: ['furniture', 'chair', 'table', 'bed', 'sofa', 'lamp'],
        sports: ['bike', 'bicycle', 'running', 'gym', 'fitness'],
        beauty: ['makeup', 'skincare', 'perfume', 'shampoo'],
        books: ['book', 'novel', 'textbook'],
        toys: ['toy', 'game', 'puzzle', 'doll'],
        automotive: ['car', 'tire', 'battery', 'oil'],
      };
      
      const keywords = categoryKeywords[category.toLowerCase()] || [];
      return keywords.some(keyword => titleLower.includes(keyword));
    });
  }

  // Filter by budget if specified
  filteredProducts = filterByBudget(filteredProducts, budget);

  // Remove duplicates based on URL or title similarity
  const uniqueProducts = deduplicateProducts(filteredProducts);

  // Sort by relevance (price, rating, etc.)
  uniqueProducts.sort((a, b) => {
    // Prioritize products with ratings
    if (a.rating && !b.rating) return -1;
    if (!a.rating && b.rating) return 1;
    if (a.rating && b.rating) {
      return b.rating - a.rating; // Higher rating first
    }
    // Then by price (lower first)
    return (a.price || 0) - (b.price || 0);
  });

  // Return top 10
  return uniqueProducts.slice(0, 10);
}

/**
 * Deduplicate products based on URL or title similarity
 */
function deduplicateProducts(products: NormalizedProduct[]): NormalizedProduct[] {
  const seen = new Set<string>();
  const unique: NormalizedProduct[] = [];

  for (const product of products) {
    // Use URL as primary key for deduplication
    const key = product.url || product.id;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(product);
    }
  }

  return unique;
}

