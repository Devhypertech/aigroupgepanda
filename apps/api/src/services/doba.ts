/**
 * Doba API Integration
 * Product search using Doba API
 * Docs: https://www.doba.com/api/
 * 
 * Note: This implementation uses a generic HMAC signature approach.
 * Adjust authentication method based on actual Doba API documentation.
 */

import { createHmac, randomBytes } from 'crypto';

const DOBA_PUBLIC_KEY = process.env.DOBA_PUBLIC_KEY;
const DOBA_PRIVATE_KEY = process.env.DOBA_PRIVATE_KEY;
const DOBA_API_URL = process.env.DOBA_API_URL || 'https://api.doba.com';
const DOBA_API_VERSION = process.env.DOBA_API_VERSION || 'v1';

export interface DobaSearchOptions {
  page?: number; // Page number (default: 1)
  limit?: number; // Results per page (default: 20, max: 50)
}

export interface DobaProduct {
  id: string;
  title: string;
  price?: string;
  currency?: string;
  merchant?: string;
  rating?: number;
  reviews?: number;
  image?: string;
  url?: string;
  source: 'doba';
}

// In-memory token cache (if Doba requires token exchange)
interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
const TOKEN_CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes (refresh before 1 hour expiry)

/**
 * Generate request ID for logging
 */
function generateRequestId(): string {
  return `doba_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

/**
 * Build HMAC signature for Doba API requests
 * Adjust this based on actual Doba API authentication requirements
 */
function buildSignature(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body?: string
): string {
  if (!DOBA_PRIVATE_KEY) {
    throw new Error('DOBA_PRIVATE_KEY not configured');
  }

  // Build signature string (adjust format based on Doba API docs)
  const signatureString = [
    method.toUpperCase(),
    path,
    timestamp,
    nonce,
    body || '',
  ].join('\n');

  // Generate HMAC-SHA256 signature
  const signature = createHmac('sha256', DOBA_PRIVATE_KEY)
    .update(signatureString)
    .digest('hex');

  return signature;
}

/**
 * Get or refresh authentication token (if Doba requires token exchange)
 * Implements in-memory caching with expiry
 */
async function getAuthToken(requestId: string): Promise<string | null> {
  // Check cache first
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  if (!DOBA_PUBLIC_KEY || !DOBA_PRIVATE_KEY) {
    return null;
  }

  try {
    // If Doba requires token exchange, implement it here
    // For now, we'll use the public key as a token placeholder
    // Adjust based on actual Doba API authentication flow
    
    // Example token exchange (uncomment and adjust when Doba API docs are available):
    /*
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString('hex');
    const signature = buildSignature('POST', '/auth/token', timestamp, nonce);
    
    const response = await fetch(`${DOBA_API_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Public-Key': DOBA_PUBLIC_KEY,
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature,
      },
      body: JSON.stringify({
        publicKey: DOBA_PUBLIC_KEY,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data: any = await response.json();
    const token = data.token || data.accessToken;
    const expiresIn = data.expiresIn || 3600; // Default 1 hour

    tokenCache = {
      token,
      expiresAt: Date.now() + (expiresIn * 1000) - (5 * 60 * 1000), // Refresh 5 min early
    };

    return token;
    */

    // Placeholder: return public key as token (adjust based on actual API)
    return DOBA_PUBLIC_KEY;
  } catch (error: any) {
    console.error(`[Doba] [${requestId}] Token exchange failed:`, error.message);
    return null;
  }
}

/**
 * Search products using Doba API
 * @param query Search query
 * @param options Search options (page, limit)
 * @returns Normalized product items
 */
export async function dobaSearch(
  query: string,
  options: DobaSearchOptions = {}
): Promise<DobaProduct[]> {
  const requestId = generateRequestId();

  if (!DOBA_PUBLIC_KEY || !DOBA_PRIVATE_KEY) {
    console.warn(`[Doba] [${requestId}] API credentials not configured`);
    return [];
  }

  if (!query || query.trim() === '') {
    console.warn(`[Doba] [${requestId}] Empty query provided`);
    return [];
  }

  const {
    page = 1,
    limit = 20,
  } = options;

  try {
    // Get authentication token
    const token = await getAuthToken(requestId);
    if (!token) {
      console.error(`[Doba] [${requestId}] Failed to obtain authentication token`);
      return [];
    }

    // Build request parameters
    const timestamp = Date.now().toString();
    const nonce = randomBytes(16).toString('hex');
    const path = `/${DOBA_API_VERSION}/products/search`;
    
    // Build request body
    const requestBody = {
      query: query.trim(),
      page: Math.max(1, page),
      limit: Math.min(50, Math.max(1, limit)),
    };

    const bodyString = JSON.stringify(requestBody);

    // Build signature
    const signature = buildSignature('POST', path, timestamp, nonce, bodyString);

    // Build request URL
    const url = `${DOBA_API_URL}${path}`;

    console.log(`[Doba] [${requestId}] Searching products: "${query}" (page ${page}, limit ${limit})`);

    // Make request with timeout (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Public-Key': DOBA_PUBLIC_KEY,
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Signature': signature,
        'Authorization': `Bearer ${token}`,
      },
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Doba API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;

    // Handle API errors
    if (data?.error || data?.errors) {
      const errorMsg = data?.error?.message || (Array.isArray(data?.errors) ? data.errors[0] : data?.errors) || 'Unknown API error';
      console.error(`[Doba] [${requestId}] API error:`, errorMsg);
      return [];
    }

    // Extract products from response
    // Adjust based on actual Doba API response structure
    const products = data?.products || data?.items || data?.data || [];

    if (!Array.isArray(products)) {
      console.warn(`[Doba] [${requestId}] Unexpected response format: products is not an array`);
      return [];
    }

    // Normalize products to our format
    const normalizedProducts: DobaProduct[] = products.map((item: any, index: number) => {
      // Extract price and currency
      let price: string | undefined;
      let currency: string | undefined;

      if (item.price !== undefined) {
        const priceValue = typeof item.price === 'number' ? item.price : parseFloat(String(item.price));
        if (!isNaN(priceValue)) {
          price = priceValue.toFixed(2);
        }
      }

      if (item.currency) {
        currency = String(item.currency).toUpperCase();
      } else if (item.priceCurrency) {
        currency = String(item.priceCurrency).toUpperCase();
      } else {
        currency = 'USD'; // Default
      }

      // Extract rating
      let rating: number | undefined;
      if (item.rating !== undefined) {
        rating = typeof item.rating === 'number' ? item.rating : parseFloat(String(item.rating));
        if (isNaN(rating)) rating = undefined;
      }

      // Extract reviews count
      let reviews: number | undefined;
      if (item.reviews !== undefined) {
        reviews = typeof item.reviews === 'number' ? item.reviews : parseInt(String(item.reviews), 10);
        if (isNaN(reviews)) reviews = undefined;
      }

      return {
        id: item.id || item.productId || `doba_${index}_${Date.now()}`,
        title: item.title || item.name || item.productName || 'Untitled Product',
        price,
        currency,
        merchant: item.merchant || item.seller || item.vendor || undefined,
        rating: rating && !isNaN(rating) ? rating : undefined,
        reviews: reviews && !isNaN(reviews) ? reviews : undefined,
        image: item.image || item.imageUrl || item.thumbnail || undefined,
        url: item.url || item.productUrl || item.link || undefined,
        source: 'doba' as const,
      };
    });

    console.log(`[Doba] [${requestId}] Found ${normalizedProducts.length} products for "${query}"`);
    return normalizedProducts;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`[Doba] [${requestId}] Request timeout (10s) for query:`, query);
    } else {
      console.error(`[Doba] [${requestId}] Error searching products:`, error.message || error);
    }
    return [];
  }
}

