/**
 * SerpAPI Google Shopping Product Search
 * Searches Google Shopping using SerpAPI
 */

export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  merchant: string;
  url: string;
  source: 'serpapi_google_shopping';
}

/**
 * Search Google Shopping products using SerpAPI
 * @param query Search query string
 * @returns Array of normalized Product objects
 */
export async function searchShopping(query: string): Promise<Product[]> {
  const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
  
  if (!SERPAPI_API_KEY) {
    console.warn('[SerpAPI Shopping] SERPAPI_API_KEY not configured');
    return [];
  }

  if (!query || query.trim() === '') {
    console.warn('[SerpAPI Shopping] Empty query provided');
    return [];
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_shopping',
      q: query.trim(),
      api_key: SERPAPI_API_KEY,
      gl: 'us', // Country code
      hl: 'en', // Language
      num: '20', // Number of results
    });

    const url = `https://serpapi.com/search.json?${params.toString()}`;
    
    console.log(`[SerpAPI Shopping] Searching for: "${query}"`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`SerpAPI request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;

    // Handle SerpAPI errors
    if (data.error) {
      console.error('[SerpAPI Shopping] API error:', data.error);
      return [];
    }

    // Extract shopping results
    const shoppingResults = data.shopping_results || [];

    if (!Array.isArray(shoppingResults)) {
      console.warn('[SerpAPI Shopping] Unexpected response format: shopping_results is not an array');
      return [];
    }

    // Normalize products to Product format
    const products: Product[] = shoppingResults.map((item: any, index: number) => {
      // Extract price and currency
      let price = 0;
      let currency = 'USD';

      if (item.price) {
        // Price might be in format "$24.99" or "24.99 USD" or just "24.99"
        const priceStr = String(item.price);
        const priceMatch = priceStr.match(/([\d,]+\.?\d*)/);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/,/g, ''));
        }

        // Extract currency symbol or code
        const currencyMatch = priceStr.match(/[^\d,.\s]+/);
        if (currencyMatch) {
          const currencyStr = currencyMatch[0].toUpperCase();
          // Map common currency symbols to codes
          if (currencyStr === '$' || currencyStr.includes('USD')) {
            currency = 'USD';
          } else if (currencyStr === '€' || currencyStr.includes('EUR')) {
            currency = 'EUR';
          } else if (currencyStr === '£' || currencyStr.includes('GBP')) {
            currency = 'GBP';
          } else {
            currency = currencyStr;
          }
        }
      }

      return {
        id: item.product_id || `serpapi_${index}_${Date.now()}`,
        title: item.title || 'Untitled Product',
        price,
        currency,
        image: item.thumbnail || item.image || '',
        merchant: item.source || item.seller || 'Unknown Merchant',
        url: item.link || item.product_link || '',
        source: 'serpapi_google_shopping' as const,
      };
    });

    console.log(`[SerpAPI Shopping] Found ${products.length} products for "${query}"`);
    return products;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error('[SerpAPI Shopping] Request timeout (10s) for query:', query);
    } else {
      console.error('[SerpAPI Shopping] Error searching:', error.message || error);
    }
    return [];
  }
}

