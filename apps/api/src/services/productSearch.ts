/**
 * Unified Product Search Service
 * Searches across multiple sources: SerpAPI (Google Shopping), Amazon (via SerpAPI), and Doba
 */

import { searchGoogleShopping } from './serpapiShopping.js';
import { dobaSearch } from './doba.js';

export interface NormalizedProduct {
  id: string;
  title: string;
  image?: string;
  price?: string;
  currency?: string;
  merchant?: string;
  rating?: number;
  reviews?: number;
  source: 'google_shopping' | 'amazon' | 'doba';
  url?: string;
}

export interface ProductSearchOptions {
  sources?: ('google_shopping' | 'amazon' | 'doba')[];
  limit?: number;
  page?: number;
  country?: string;
  language?: string;
  location?: string;
}

/**
 * Search Amazon products using SerpAPI
 */
async function searchAmazon(
  query: string,
  options: { page?: number; country?: string; language?: string; location?: string } = {}
): Promise<NormalizedProduct[]> {
  const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
  if (!SERPAPI_API_KEY) {
    console.warn('[ProductSearch] SerpAPI key not configured, skipping Amazon search');
    return [];
  }

  try {
    const params = new URLSearchParams({
      engine: 'amazon',
      api_key: SERPAPI_API_KEY,
      search_query: query,
      gl: options.country || 'us',
      hl: options.language || 'en',
      page: String(options.page || 1),
    });

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn('[ProductSearch] Amazon search failed:', response.status);
      return [];
    }

    const data = await response.json() as any;
    const products = data.organic_results || data.products || [];

    return products.map((item: any, index: number) => ({
      id: item.asin || `amazon_${index}_${Date.now()}`,
      title: item.title || item.product_title || 'Untitled Product',
      image: item.thumbnail || item.image,
      price: item.price?.raw || item.price,
      currency: 'USD',
      merchant: 'Amazon',
      rating: item.rating ? parseFloat(String(item.rating)) : undefined,
      reviews: item.reviews ? parseInt(String(item.reviews), 10) : undefined,
      source: 'amazon' as const,
      url: item.link || item.product_link,
    }));
  } catch (error) {
    console.error('[ProductSearch] Error searching Amazon:', error);
    return [];
  }
}

/**
 * Unified product search across all sources
 */
export async function searchProducts(
  query: string,
  options: ProductSearchOptions = {}
): Promise<NormalizedProduct[]> {
  const sources = options.sources || ['google_shopping', 'amazon', 'doba'];
  const limit = options.limit || 20;

  const allResults: NormalizedProduct[] = [];

  // Search all sources in parallel
  const searchPromises: Promise<NormalizedProduct[]>[] = [];

  if (sources.includes('google_shopping')) {
    searchPromises.push(
      searchGoogleShopping(query, {
        country: options.country,
        language: options.language,
        location: options.location,
        page: options.page,
      })
    );
  }

  if (sources.includes('amazon')) {
    searchPromises.push(
      searchAmazon(query, {
        page: options.page,
        country: options.country,
        language: options.language,
        location: options.location,
      })
    );
  }

  if (sources.includes('doba')) {
    searchPromises.push(
      dobaSearch(query, {
        page: options.page,
        limit: Math.ceil(limit / sources.length),
      })
    );
  }

  // Wait for all searches to complete
  const results = await Promise.allSettled(searchPromises);

  // Combine results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    } else {
      console.error('[ProductSearch] Search source failed:', result.reason);
    }
  }

  // Remove duplicates based on URL or title similarity
  const uniqueResults = deduplicateProducts(allResults);

  // Sort by relevance (you could add ranking logic here)
  // For now, just limit results
  return uniqueResults.slice(0, limit);
}

/**
 * Deduplicate products based on URL or title similarity
 */
function deduplicateProducts(products: NormalizedProduct[]): NormalizedProduct[] {
  const seen = new Set<string>();
  const unique: NormalizedProduct[] = [];

  for (const product of products) {
    // Use URL as primary key, fallback to title
    const key = product.url || product.title.toLowerCase().trim();
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(product);
    }
  }

  return unique;
}

/**
 * Extract product name or URL from user message
 */
export function extractProductQuery(message: string): { query?: string; url?: string } {
  // Extract URL
  const urlPattern = /(https?:\/\/[^\s\)]+|www\.[^\s\)]+)/gi;
  const urlMatch = message.match(urlPattern);
  if (urlMatch && urlMatch.length > 0) {
    return { url: urlMatch[0] };
  }

  // Extract product name (look for product mentions)
  // Common patterns: "buy X", "find X", "search for X", "I need X"
  const productPatterns = [
    /(?:buy|find|search for|need|want|looking for|show me)\s+(.+?)(?:\s|$|\.|,)/i,
    /(.+?)\s+(?:smartwatch|watch|phone|laptop|adapter|charger|product)/i,
  ];

  for (const pattern of productPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const query = match[1].trim();
      if (query.length > 3 && query.length < 100) {
        return { query };
      }
    }
  }

  // Fallback: use the whole message if it's short enough
  if (message.length > 3 && message.length < 100) {
    return { query: message.trim() };
  }

  return {};
}

