/**
 * Checkout Links & Intent
 * Generate checkout/affiliate links and checkout intent (Rye or product link)
 */

import { z } from 'zod';
import { getProductById } from './products.js';
import { createCheckoutSession as createRyeSession } from '../services/travel/rye.js';

// Request validation schema
export const checkoutLinkSchema = z.object({
  productId: z.string().min(1),
  userId: z.string().optional(), // For tracking (optional)
});

// Checkout intent: confirm item, shipping, payment -> get checkout URL or Rye session
export const checkoutIntentSchema = z.object({
  productId: z.string().optional(), // Single product (catalog)
  productType: z.enum(['product', 'esim', 'flight', 'hotel', 'package']).optional().default('product'),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive().optional().default(1),
    price: z.number().optional(),
  })).optional(),
  shippingAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    region: z.string().optional(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
  paymentPreference: z.enum(['card', 'paypal', 'crypto', 'wallet']).optional(),
});

export interface CheckoutLinkResponse {
  url: string;
  productId: string;
  isAffiliate: boolean;
  isSponsored: boolean;
}

/**
 * Generate checkout link for a product
 * Returns affiliate URL or checkout URL
 */
export async function generateCheckoutLink(
  productId: string,
  userId?: string
): Promise<CheckoutLinkResponse | null> {
  try {
    const product = getProductById(productId);
    
    if (!product) {
      return null;
    }

    // Use checkout URL if available, otherwise use affiliate URL
    const url = product.checkoutUrl || product.affiliateUrl;
    
    if (!url) {
      return null;
    }

    // Add user tracking if provided (for analytics)
    let finalUrl = url;
    if (userId && url.includes('?')) {
      finalUrl = `${url}&userId=${encodeURIComponent(userId)}`;
    } else if (userId) {
      finalUrl = `${url}&userId=${encodeURIComponent(userId)}`;
    }

    return {
      url: finalUrl,
      productId: product.id,
      isAffiliate: product.isAffiliate,
      isSponsored: product.isSponsored,
    };
  } catch (error) {
    console.error('[Checkout] Error generating checkout link:', error);
    return null;
  }
}

export interface CheckoutIntentResponse {
  checkoutUrl: string;
  sessionId?: string;
  expiresAt?: string;
  message?: string;
}

/**
 * Create checkout intent: returns URL for payment (product link or Rye session)
 */
export async function createCheckoutIntent(
  params: z.infer<typeof checkoutIntentSchema>,
  userId?: string
): Promise<CheckoutIntentResponse | null> {
  try {
    // Single catalog product
    if (params.productId && params.productType === 'product') {
      const link = await generateCheckoutLink(params.productId, userId);
      if (!link) return null;
      return { checkoutUrl: link.url, message: 'Proceed to checkout' };
    }

    // eSIM / flight / hotel / package -> Rye (mock or real)
    if (params.productType === 'esim' || params.productType === 'flight' || params.productType === 'hotel' || params.productType === 'package') {
      const session = await createRyeSession({
        productType: params.productType === 'esim' ? 'package' : params.productType,
        productId: params.productId || 'esim_default',
        travelers: [{ firstName: 'Guest', lastName: 'User', email: 'guest@example.com' }],
        paymentMethod: params.paymentPreference === 'paypal' ? { type: 'paypal' } : { type: 'card' },
      });
      return {
        checkoutUrl: session.checkoutUrl,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        message: 'Complete payment in the checkout window',
      };
    }

    // Multiple items: use first product's checkout link for now
    if (params.items && params.items.length > 0) {
      const first = params.items[0];
      const link = await generateCheckoutLink(first.productId, userId);
      if (!link) return null;
      return { checkoutUrl: link.url, message: 'Proceed to checkout' };
    }

    return null;
  } catch (error) {
    console.error('[Checkout] Error creating checkout intent:', error);
    return null;
  }
}

