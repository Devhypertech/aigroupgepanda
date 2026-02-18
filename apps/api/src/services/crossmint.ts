/**
 * Crossmint API Integration
 * Create checkout sessions/links for product purchases
 * Docs: https://docs.crossmint.com/
 */

const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY;
const CROSSMINT_PROJECT_ID = process.env.CROSSMINT_PROJECT_ID;
const CROSSMINT_ENV = process.env.CROSSMINT_ENV || 'sandbox';
const CROSSMINT_BASE_URL = CROSSMINT_ENV === 'production' 
  ? 'https://api.crossmint.com'
  : 'https://api.sandbox.crossmint.com';

export interface CreateCheckoutLinkParams {
  productUrl: string;
  quantity: number;
  currency: string;
  email?: string;
  userId?: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode: string;
    country: string;
  };
}

export interface CheckoutLinkResponse {
  checkoutUrl: string;
  sessionId?: string;
  expiresAt?: string;
}

/**
 * Generate request ID for logging
 */
function generateRequestId(): string {
  return `crossmint_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a Crossmint checkout link/session
 * @param params Checkout parameters
 * @returns Checkout URL and session info
 */
export async function createCheckoutLink(
  params: CreateCheckoutLinkParams
): Promise<CheckoutLinkResponse> {
  const requestId = generateRequestId();

  if (!CROSSMINT_API_KEY) {
    throw new Error('CROSSMINT_API_KEY not configured');
  }

  const {
    productUrl,
    quantity,
    currency = 'USD',
    email,
    userId,
    shippingAddress,
  } = params;

  // Validate required fields
  if (!productUrl || !productUrl.trim()) {
    throw new Error('productUrl is required');
  }

  if (!quantity || quantity < 1) {
    throw new Error('quantity must be at least 1');
  }

  try {
    // Build request body for Crossmint API
    // Adjust based on actual Crossmint API documentation
    const requestBody: any = {
      productUrl: productUrl.trim(),
      quantity: Math.max(1, Math.floor(quantity)),
      currency: currency.toUpperCase(),
    };

    // Add optional fields
    if (email) {
      requestBody.email = email;
    }

    if (userId) {
      requestBody.metadata = {
        ...(requestBody.metadata || {}),
        userId,
      };
    }

    if (shippingAddress) {
      requestBody.shippingAddress = {
        line1: shippingAddress.line1,
        ...(shippingAddress.line2 && { line2: shippingAddress.line2 }),
        city: shippingAddress.city,
        ...(shippingAddress.region && { region: shippingAddress.region }),
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
      };
    }

    // Add project ID if configured
    if (CROSSMINT_PROJECT_ID) {
      requestBody.projectId = CROSSMINT_PROJECT_ID;
    }

    const url = `${CROSSMINT_BASE_URL}/v1/checkout/sessions`;

    console.log(`[Crossmint] [${requestId}] Creating checkout session for product: ${productUrl}`);

    // Make request with timeout (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CROSSMINT_API_KEY,
        ...(CROSSMINT_PROJECT_ID && { 'X-Project-Id': CROSSMINT_PROJECT_ID }),
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const statusText = response.statusText || 'Unknown error';
      throw new Error(`Crossmint API request failed: ${response.status} ${statusText} - ${errorText}`);
    }

    const data = await response.json() as any;

    // Handle API errors
    if (data?.error || data?.errors) {
      const errorMsg = data?.error?.message || (Array.isArray(data?.errors) ? data.errors[0] : data?.errors) || 'Unknown API error';
      throw new Error(`Crossmint API error: ${errorMsg}`);
    }

    // Extract checkout URL from response
    // Adjust based on actual Crossmint API response structure
    const checkoutUrl = data?.checkoutUrl || data?.url || data?.session?.url || data?.link;

    if (!checkoutUrl) {
      throw new Error('Crossmint API did not return a checkout URL');
    }

    const result: CheckoutLinkResponse = {
      checkoutUrl: String(checkoutUrl),
    };

    // Extract session ID if available
    if (data?.sessionId || data?.session?.id || data?.id) {
      result.sessionId = String(data.sessionId || data.session?.id || data.id);
    }

    // Extract expiry if available
    if (data?.expiresAt || data?.session?.expiresAt || data?.expires_at) {
      result.expiresAt = String(data.expiresAt || data.session?.expiresAt || data.expires_at);
    }

    console.log(`[Crossmint] [${requestId}] Checkout session created successfully`);
    return result;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Crossmint request timeout (10s) for product: ${productUrl}`);
      console.error(`[Crossmint] [${requestId}]`, timeoutError.message);
      throw timeoutError;
    }
    console.error(`[Crossmint] [${requestId}] Error creating checkout session:`, error.message || error);
    throw error;
  }
}

