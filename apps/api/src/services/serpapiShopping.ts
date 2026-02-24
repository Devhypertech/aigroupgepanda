/**
 * SerpAPI Google Shopping Integration
 * Search Google Shopping products using SerpAPI
 * Docs: https://serpapi.com/google-shopping-api
 */

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

export interface GoogleShoppingSearchOptions {
  country?: string; // e.g., "US", "GB"
  language?: string; // e.g., "en", "es"
  location?: string; // e.g., "United States", "New York,New York,United States"
  page?: number; // Page number (default: 1)
}

export interface GoogleShoppingProduct {
  id: string;
  title: string;
  price?: string;
  currency?: string;
  merchant?: string;
  rating?: number;
  reviews?: number;
  image?: string;
  url?: string;
  source: 'google_shopping';
}

/**
 * Search Google Shopping products using SerpAPI
 * @param query Search query
 * @param options Search options (country, language, location, page)
 * @returns Normalized product items
 */
export async function searchGoogleShopping(
  query: string,
  options: GoogleShoppingSearchOptions = {}
): Promise<GoogleShoppingProduct[]> {
  if (!SERPAPI_API_KEY) {
    console.warn('[SerpAPI] API key not configured (SERPAPI_API_KEY missing)');
    return [];
  }

  if (!query || query.trim() === '') {
    console.warn('[SerpAPI] Empty query provided');
    return [];
  }

  const {
    country = process.env.GOOGLE_SHOPPING_COUNTRY || 'US',
    language = process.env.GOOGLE_SHOPPING_LANGUAGE || 'en',
    location = process.env.GOOGLE_SHOPPING_LOCATION || 'United States',
    page = 1,
  } = options;

  try {
    // Build query parameters
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query.trim(),
      api_key: SERPAPI_API_KEY,
      gl: country.toLowerCase(),
      hl: language.toLowerCase(),
      location: location,
      num: '20', // Results per page
      start: String((page - 1) * 20), // SerpAPI uses start parameter for pagination
    });

    const url = `${SERPAPI_BASE_URL}?${params.toString()}`;

    console.log(`[SerpAPI] Searching Google Shopping: "${query}" (page ${page})`);

    // Make request with timeout (8-10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`SerpAPI request failed: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();

    // Handle SerpAPI errors
    if (data.error) {
      console.error('[SerpAPI] API error:', data.error);
      return [];
    }

    // Extract shopping results
    const shoppingResults = data.shopping_results || [];

    if (!Array.isArray(shoppingResults)) {
      console.warn('[SerpAPI] Unexpected response format: shopping_results is not an array');
      return [];
    }

    // Normalize products to our format
    const normalizedProducts: GoogleShoppingProduct[] = shoppingResults.map((item: any, index: number) => {
      // Extract price and currency
      let price: string | undefined;
      let currency: string | undefined;

      if (item.price) {
        // Price might be in format "$24.99" or "24.99 USD"
        const priceStr = String(item.price);
        const priceMatch = priceStr.match(/([\d,]+\.?\d*)/);
        if (priceMatch) {
          price = priceMatch[1];
        }

        // Extract currency symbol or code
        const currencyMatch = priceStr.match(/[^\d,.\s]+/);
        if (currencyMatch) {
          currency = currencyMatch[0];
        } else {
          currency = 'USD'; // Default
        }
      }

      // Extract rating
      let rating: number | undefined;
      if (item.rating !== undefined) {
        rating = typeof item.rating === 'number' ? item.rating : parseFloat(String(item.rating));
      }

      // Extract reviews count
      let reviews: number | undefined;
      if (item.reviews !== undefined) {
        reviews = typeof item.reviews === 'number' ? item.reviews : parseInt(String(item.reviews), 10);
      }

      return {
        id: item.product_id || `serpapi_${index}_${Date.now()}`,
        title: item.title || 'Untitled Product',
        price,
        currency,
        merchant: item.source || item.seller || undefined,
        rating: rating && !isNaN(rating) ? rating : undefined,
        reviews: reviews && !isNaN(reviews) ? reviews : undefined,
        image: item.thumbnail || undefined,
        url: item.link || item.product_link || undefined,
        source: 'google_shopping' as const,
      };
    });

    console.log(`[SerpAPI] Found ${normalizedProducts.length} products for "${query}"`);
    return normalizedProducts;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[SerpAPI] Request timeout (10s) for query:', query);
    } else {
      console.error('[SerpAPI] Error searching Google Shopping:', error.message || error);
    }
    return [];
  }
}

