/**
 * Unified Checkout Service
 * Supports multiple checkout providers: Crossmint, Rye, and payment rails
 */

import { createCheckoutLink, type CheckoutLinkResponse } from '../crossmint.js';
import { createRyeCheckout, type RyeCheckoutResponse } from './ryeCheckout.js';

export type CheckoutProvider = 'crossmint' | 'rye';

export interface UnifiedCheckoutParams {
  product: {
    id: string;
    title: string;
    image?: string;
    price: number;
    currency: string;
    url: string;
  };
  quantity: number;
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
  paymentPreference?: 'card' | 'apple_pay' | 'crypto';
  provider?: CheckoutProvider; // If not specified, will choose based on payment preference
}

export interface UnifiedCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  provider: CheckoutProvider;
  expiresAt?: string;
}

/**
 * Determine checkout provider based on payment preference
 */
function determineProvider(paymentPreference?: string, explicitProvider?: CheckoutProvider): CheckoutProvider {
  if (explicitProvider) {
    return explicitProvider;
  }

  // Choose provider based on payment preference
  if (paymentPreference === 'crypto') {
    return 'crossmint'; // Crossmint supports crypto
  }

  if (paymentPreference === 'apple_pay' || paymentPreference === 'card') {
    return 'rye'; // Rye supports Apple Pay and Card
  }

  // Default to Rye for traditional payments
  return 'rye';
}

/**
 * Create unified checkout session
 */
export async function createUnifiedCheckout(params: UnifiedCheckoutParams): Promise<UnifiedCheckoutResponse> {
  const provider = determineProvider(params.paymentPreference, params.provider);

  console.log('[Unified Checkout] Creating checkout with provider:', provider, {
    productId: params.product.id,
    amount: params.product.price * params.quantity,
    paymentPreference: params.paymentPreference,
  });

  try {
    if (provider === 'crossmint') {
      const checkoutLink = await createCheckoutLink({
        productUrl: params.product.url,
        quantity: params.quantity,
        currency: params.product.currency,
        userId: params.userId,
        email: params.email,
        shippingAddress: params.shippingAddress,
      });

      return {
        checkoutUrl: checkoutLink.checkoutUrl,
        sessionId: checkoutLink.sessionId || `crossmint_${Date.now()}`,
        provider: 'crossmint',
        expiresAt: checkoutLink.expiresAt,
      };
    }

    if (provider === 'rye') {
      const paymentMethods: ('apple_pay' | 'card' | 'crypto')[] = [];
      
      if (params.paymentPreference === 'apple_pay') {
        paymentMethods.push('apple_pay');
      } else if (params.paymentPreference === 'crypto') {
        paymentMethods.push('crypto');
      } else {
        paymentMethods.push('card'); // Default to card
      }

      const ryeCheckout = await createRyeCheckout({
        productId: params.product.id,
        productTitle: params.product.title,
        amount: params.product.price * params.quantity,
        currency: params.product.currency,
        userId: params.userId,
        email: params.email,
        shippingAddress: params.shippingAddress,
        paymentMethods,
      });

      return {
        checkoutUrl: ryeCheckout.checkoutUrl,
        sessionId: ryeCheckout.sessionId,
        provider: 'rye',
        expiresAt: ryeCheckout.expiresAt,
      };
    }

    throw new Error(`Unsupported checkout provider: ${provider}`);
  } catch (error) {
    console.error('[Unified Checkout] Error creating checkout:', error);
    throw error;
  }
}

