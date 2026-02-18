/**
 * Checkout Agent Service
 * Handles AI-driven checkout confirmation flow
 */

import { createUnifiedCheckout, type UnifiedCheckoutResponse } from './checkout/unifiedCheckout.js';

export interface CheckoutConfirmation {
  product: {
    id: string;
    title: string;
    image?: string;
    price: number | string;
    currency?: string;
    url?: string;
  };
  quantity: number;
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  paymentPreference?: 'card' | 'apple_pay' | 'crypto';
  email?: string;
}

export interface CheckoutIntent {
  checkoutUrl: string;
  sessionId: string;
  expiresAt?: string;
  provider: 'crossmint' | 'rye';
}

/**
 * Create checkout intent after AI confirmation
 */
export async function createCheckoutIntent(
  confirmation: CheckoutConfirmation,
  userId?: string
): Promise<CheckoutIntent | null> {
  if (!userId) {
    throw new Error('userId is required for checkout');
  }

  try {
    // Parse price - handle both number and string formats
    let priceValue: number;
    if (typeof confirmation.product.price === 'number') {
      priceValue = confirmation.product.price;
    } else if (typeof confirmation.product.price === 'string') {
      const priceMatch = confirmation.product.price.match(/([\d,]+\.?\d*)/);
      priceValue = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;
    } else {
      throw new Error('Product price is required');
    }

    if (priceValue <= 0) {
      throw new Error('Product price must be greater than 0');
    }

    // Create unified checkout (supports Crossmint, Rye, and payment rails)
    const checkout = await createUnifiedCheckout({
      product: {
        id: confirmation.product.id,
        title: confirmation.product.title,
        image: confirmation.product.image,
        price: priceValue,
        currency: confirmation.product.currency || 'USD',
        url: confirmation.product.url || '',
      },
      quantity: confirmation.quantity,
      userId: userId,
      email: confirmation.email,
      shippingAddress: confirmation.shippingAddress,
      paymentPreference: confirmation.paymentPreference,
    });

    return {
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      expiresAt: checkout.expiresAt,
      provider: checkout.provider,
    };
  } catch (error) {
    console.error('[CheckoutAgent] Error creating checkout intent:', error);
    throw error;
  }
}

/**
 * Validate checkout confirmation
 */
export function validateCheckoutConfirmation(
  confirmation: Partial<CheckoutConfirmation>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!confirmation.product) {
    errors.push('Product is required');
  } else {
    if (!confirmation.product.title) {
      errors.push('Product title is required');
    }
    if (!confirmation.product.url && !confirmation.product.id) {
      errors.push('Product URL or ID is required');
    }
  }

  if (!confirmation.quantity || confirmation.quantity < 1) {
    errors.push('Quantity must be at least 1');
  }

  if (confirmation.shippingAddress) {
    const addr = confirmation.shippingAddress;
    if (!addr.line1) errors.push('Shipping address line1 is required');
    if (!addr.city) errors.push('Shipping city is required');
    if (!addr.postalCode) errors.push('Shipping postal code is required');
    if (!addr.country) errors.push('Shipping country is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

