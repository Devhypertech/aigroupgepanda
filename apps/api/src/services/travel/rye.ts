/**
 * Rye.com API Integration
 * Travel booking and checkout API
 * Docs: https://docs.rye.com/
 */

const RYE_API_KEY = process.env.RYE_API_KEY;
const RYE_API_URL = process.env.RYE_API_URL || 'https://api.rye.com';

export interface RyeBookingParams {
  productType: 'flight' | 'hotel' | 'package';
  productId: string;
  travelers: Array<{
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth?: string;
  }>;
  paymentMethod?: {
    type: 'card' | 'paypal';
    token?: string;
  };
}

export interface RyeCheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  expiresAt: string;
}

/**
 * Create a checkout session with Rye
 */
export async function createCheckoutSession(params: RyeBookingParams): Promise<RyeCheckoutSession> {
  if (!RYE_API_KEY) {
    console.warn('[Rye] API key not configured');
    // Return mock session for development
    return {
      sessionId: `mock_session_${Date.now()}`,
      checkoutUrl: `https://checkout.rye.com/mock/${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };
  }

  try {
    const response = await fetch(`${RYE_API_URL}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RYE_API_KEY}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Rye API error: ${response.status}`);
    }

    const data: any = await response.json();
    return {
      sessionId: data.session_id,
      checkoutUrl: data.checkout_url,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error('[Rye] Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Get booking status
 */
export async function getBookingStatus(sessionId: string): Promise<{
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  bookingId?: string;
}> {
  if (!RYE_API_KEY) {
    return { status: 'pending' };
  }

  try {
    const response = await fetch(`${RYE_API_URL}/v1/checkout/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${RYE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Rye API error: ${response.status}`);
    }

    const data: any = await response.json();
    return {
      status: data.status,
      bookingId: data.booking_id,
    };
  } catch (error) {
    console.error('[Rye] Error getting booking status:', error);
    return { status: 'pending' };
  }
}

