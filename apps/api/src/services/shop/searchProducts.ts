/**
 * Shop Product Search Service
 * Searches for products using SerpAPI (Google Shopping) and Doba as fallback
 * Returns normalized product data for UI rendering
 */

import { searchShopping } from '../productSearch/serpApiShopping.js';
import { dobaSearch } from '../doba.js';

export interface ShopProduct {
  id: string;
  title: string;
  price: number | string;
  currency: string;
  imageUrl: string;
  provider: string;
  merchant?: string;
  url: string;
  source: string;
  subtitle?: string;
}

export interface SearchProductsOptions {
  query: string;
  userId?: string;
  limit?: number;
}

/**
 * Search for products using SerpAPI first, then Doba as fallback
 * Returns normalized products for UI rendering
 */
export async function searchProducts(options: SearchProductsOptions): Promise<ShopProduct[]> {
  const logPrefix = '[SHOP_SEARCH]';
  const { query, userId, limit = 5 } = options;

  if (!query || query.trim().length === 0) {
    console.warn(`${logPrefix} Empty query provided`);
    return [];
  }

  const searchQuery = query.trim();
  console.log(`${logPrefix} Searching products:`, {
    query: searchQuery,
    userId: userId ? `${userId.substring(0, 8)}...` : 'anonymous',
    limit,
  });

  let products: ShopProduct[] = [];

  // Try SerpAPI Google Shopping first
  try {
    console.log(`${logPrefix} Trying SerpAPI Google Shopping...`);
    const serpApiProducts = await searchShopping(searchQuery);
    
    if (serpApiProducts && serpApiProducts.length > 0) {
      // Normalize SerpAPI products to ShopProduct format
      products = serpApiProducts.slice(0, limit).map((product) => ({
        id: product.id,
        title: product.title,
        price: product.price,
        currency: product.currency,
        imageUrl: product.image || '',
        provider: product.merchant || 'Google Shopping',
        merchant: product.merchant,
        url: product.url,
        source: product.source,
      }));

      console.log(`${logPrefix} ✅ SerpAPI found ${products.length} products`);
      return products;
    } else {
      console.log(`${logPrefix} SerpAPI returned no results, trying Doba...`);
    }
  } catch (error) {
    console.error(`${logPrefix} SerpAPI error:`, error instanceof Error ? error.message : String(error));
    // Continue to Doba fallback
  }

  // Fallback to Doba API
  try {
    console.log(`${logPrefix} Trying Doba API...`);
    const dobaProducts = await dobaSearch(searchQuery, {
      page: 1,
      limit: limit * 2, // Get more results to filter
    });

    if (dobaProducts && dobaProducts.length > 0) {
      // Normalize Doba products to ShopProduct format
      products = dobaProducts.slice(0, limit).map((product: any) => {
        // Extract price and currency from Doba product
        let price: number | string = 0;
        let currency = 'USD';

        if (product.price) {
          if (typeof product.price === 'number') {
            price = product.price;
          } else if (typeof product.price === 'string') {
            const priceMatch = product.price.match(/([\d,]+\.?\d*)/);
            if (priceMatch) {
              price = parseFloat(priceMatch[1].replace(/,/g, ''));
            } else {
              price = product.price;
            }
          }
        }

        if (product.currency) {
          currency = product.currency;
        }

        return {
          id: product.id || product.productId || `doba_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: product.title || product.name || 'Untitled Product',
          price,
          currency,
          imageUrl: product.image || product.imageUrl || product.thumbnail || '',
          provider: product.provider || product.merchant || 'Doba',
          merchant: product.merchant || product.seller,
          url: product.url || product.link || product.productUrl || '',
          source: 'doba',
          subtitle: product.description || product.subtitle,
        };
      });

      console.log(`${logPrefix} ✅ Doba found ${products.length} products`);
      return products;
    } else {
      console.log(`${logPrefix} Doba returned no results`);
    }
  } catch (error) {
    console.error(`${logPrefix} Doba error:`, error instanceof Error ? error.message : String(error));
    
    // Check for rate limit errors
    if (error instanceof Error && (
      error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('too many requests')
    )) {
      console.warn(`${logPrefix} Rate limit detected, returning empty results gracefully`);
      return [];
    }
  }

  console.log(`${logPrefix} ❌ No products found from any source`);
  return [];
}

