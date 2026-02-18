/**
 * Rye Checkout Service
 * Payment processing with Rye Checkout
 * Supports: Apple Pay, Card, Crypto
 */

const RYE_API_KEY = process.env.RYE_API_KEY;
const RYE_API_URL = process.env.RYE_API_URL || 'https://api.rye.com';

export interface RyeCheckoutParams {
  productId: string;
  productTitle: string;
  amount: number;
  currency: string;
  userId: string;
  email?: string;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  paymentMethods?: ('apple_pay' | 'card' | 'crypto')[];
}

export interface RyeCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  expiresAt?: string;
}

/**
 * Create Rye checkout session
 */
export async function createRyeCheckout(params: RyeCheckoutParams): Promise<RyeCheckoutResponse> {
  if (!RYE_API_KEY) {
    throw new Error('RYE_API_KEY not configured');
  }

  try {
    const requestBody = {
      productId: params.productId,
      productTitle: params.productTitle,
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      userId: params.userId,
      email: params.email,
      shippingAddress: params.shippingAddress,
      paymentMethods: params.paymentMethods || ['card', 'apple_pay', 'crypto'],
    };

    const url = `${RYE_API_URL}/v1/checkout/sessions`;

    console.log('[Rye Checkout] Creating checkout session:', { productId: params.productId, amount: params.amount });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RYE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Rye API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;

    if (data?.error) {
      throw new Error(`Rye API error: ${data.error.message || data.error}`);
    }

    return {
      checkoutUrl: data.checkoutUrl || data.url || data.session?.url,
      sessionId: data.sessionId || data.id || data.session?.id,
      expiresAt: data.expiresAt || data.expires_at,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Rye checkout request timeout (10s)');
    }
    console.error('[Rye Checkout] Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Get Rye checkout session status
 */
export async function getRyeCheckoutStatus(sessionId: string): Promise<{ status: string; orderId?: string }> {
  if (!RYE_API_KEY) {
    throw new Error('RYE_API_KEY not configured');
  }

  try {
    const url = `${RYE_API_URL}/v1/checkout/sessions/${sessionId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RYE_API_KEY}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Rye API request failed: ${response.status}`);
    }

    const data = await response.json() as any;

    return {
      status: data.status || 'pending',
      orderId: data.orderId || data.order?.id,
    };
  } catch (error) {
    console.error('[Rye Checkout] Error getting checkout status:', error);
    throw error;
  }
}

