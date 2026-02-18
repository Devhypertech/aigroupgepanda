/**
 * Checkout API Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { getCurrentUser } from '../middleware/auth.js';
import { generateCheckoutLink, checkoutLinkSchema, createCheckoutIntent, checkoutIntentSchema } from '../commerce/checkout.js';
import { createCheckoutLink as createCrossmintCheckoutLink } from '../services/crossmint.js';
import { createCheckoutIntent as createAgentCheckoutIntent, validateCheckoutConfirmation } from '../services/checkoutAgent.js';
import { createOrder } from '../db/orderDb.js';

const router = Router();

// Product schema for buy_now action
const productSchema = z.object({
  title: z.string(),
  image: z.string().url().optional(),
  price: z.number().positive(),
  currency: z.string().default('USD'),
  url: z.string().url(),
  merchant: z.string().optional(),
  source: z.string().optional(),
});

// Crossmint checkout link schema
const crossmintCheckoutLinkSchema = z.object({
  productUrl: z.string().url('productUrl must be a valid URL'),
  productTitle: z.string().optional(), // Product name/title
  price: z.number().positive().optional(), // Product price
  image: z.string().url().optional(), // Product image URL
  quantity: z.number().int().positive('quantity must be a positive integer'),
  currency: z.string().default('USD'),
  userId: z.string().optional(),
  email: z.string().email('email must be a valid email address').optional(),
  shippingAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    region: z.string().optional(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
  // New: Accept product object directly
  product: productSchema.optional(),
});

/**
 * POST /api/checkout/link
 * Generate checkout/affiliate link for a product
 * 
 * Supports two modes:
 * 1. Legacy: { productId, userId? } - Returns catalog product checkout link
 * 2. Crossmint: { productUrl, quantity, currency, userId?, email?, shippingAddress? } - Returns Crossmint checkout session
 * 
 * Returns:
 * - Legacy: { url, productId, isAffiliate, isSponsored }
 * - Crossmint: { ok: true, checkoutUrl, provider: "crossmint" }
 */
router.post('/link', async (req, res) => {
  try {
    // Check if this is a product object request (buy_now action)
    if (req.body.product) {
      const productValidation = productSchema.safeParse(req.body.product);
      if (!productValidation.success) {
        return res.status(400).json({
          error: 'Invalid product object',
          details: productValidation.error.issues,
        });
      }

      const product = productValidation.data;
      const userId = req.body.userId || req.headers['x-user-id'] as string;

      // Create Crossmint checkout link using product data
      const checkoutLink = await createCrossmintCheckoutLink({
        productUrl: product.url,
        quantity: 1, // Default quantity
        currency: product.currency || 'USD',
        userId: userId,
      });

      return res.json({
        checkoutUrl: checkoutLink.checkoutUrl,
        checkoutId: checkoutLink.sessionId || `checkout_${Date.now()}`,
      });
    }

    // Check if this is a Crossmint request (has productUrl)
    if (req.body.productUrl) {
      // Validate Crossmint request body
      const validationResult = crossmintCheckoutLinkSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validationResult.error.issues,
        });
      }

      const params = validationResult.data;

      // Create Crossmint checkout link
      const checkoutLink = await createCrossmintCheckoutLink({
        productUrl: params.productUrl,
        quantity: params.quantity,
        currency: params.currency,
        email: params.email,
        userId: params.userId,
        shippingAddress: params.shippingAddress,
      });

      return res.json({
        ok: true,
        checkoutUrl: checkoutLink.checkoutUrl,
        provider: 'crossmint',
        ...(checkoutLink.sessionId && { sessionId: checkoutLink.sessionId }),
        ...(checkoutLink.expiresAt && { expiresAt: checkoutLink.expiresAt }),
      });
    }

    // Legacy: Validate request body for catalog product
    const validationResult = checkoutLinkSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { productId, userId } = validationResult.data;

    // Generate checkout link
    const checkoutLink = await generateCheckoutLink(productId, userId);

    if (!checkoutLink) {
      return res.status(404).json({
        error: 'Product not found',
        message: `Product with ID ${productId} does not exist`,
      });
    }

    res.json(checkoutLink);
  } catch (error) {
    console.error('[Checkout] Error generating checkout link:', error);
    res.status(500).json({
      error: 'Failed to generate checkout link',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/checkout/confirm
 * Agent confirmation flow - validates and creates checkout intent
 * Body: { product, quantity, shippingAddress?, paymentPreference?, email? }
 * Returns: { checkoutUrl, sessionId?, expiresAt?, provider }
 */
router.post('/confirm', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string) ?? undefined;

    // Validate confirmation
    const validation = validateCheckoutConfirmation(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid confirmation',
        details: validation.errors,
      });
    }

    // Create checkout intent
    const intent = await createAgentCheckoutIntent(req.body, userId);
    if (!intent) {
      return res.status(500).json({
        error: 'Failed to create checkout intent',
        message: 'Could not create checkout session.',
      });
    }

    res.json(intent);
  } catch (error) {
    console.error('[Checkout] Error in confirmation flow:', error);
    res.status(500).json({
      error: 'Failed to process confirmation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/checkout/intent
 * Create checkout intent: confirm item, shipping, payment -> returns checkout URL (Rye or product link)
 * Body: { productId?, productType?, items?, shippingAddress?, paymentPreference? }
 * OR simplified: { userId, productUrl OR productId, quantity, currencyPreference }
 * Returns: { checkoutUrl, sessionId?, expiresAt?, message? }
 */
router.post('/intent', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string) ?? req.body.userId ?? undefined;

    // Check if this is the simplified format (productUrl OR productId, quantity, currencyPreference)
    if (req.body.productUrl || req.body.productId) {
      const simplifiedSchema = z.object({
        userId: z.string().optional(),
        productUrl: z.string().url().optional(),
        productId: z.string().optional(),
        quantity: z.number().int().positive().optional().default(1),
        currencyPreference: z.string().optional().default('USD'),
        shippingCountry: z.string().optional(),
      });

      const validationResult = simplifiedSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: validationResult.error.issues,
        });
      }

      const { productUrl, productId, quantity, currencyPreference, shippingCountry } = validationResult.data;

      // Check if Crossmint is configured
      const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY;
      const CROSSMINT_PROJECT_ID = process.env.CROSSMINT_PROJECT_ID;

      if (CROSSMINT_API_KEY && CROSSMINT_PROJECT_ID && productUrl) {
        // Use Crossmint if configured and productUrl provided
        try {
          const { createCheckoutLink } = await import('../services/crossmint.js');
          const checkoutLink = await createCheckoutLink({
            productUrl,
            quantity: quantity || 1,
            currency: currencyPreference || 'USD',
            userId,
          });

          if (checkoutLink && checkoutLink.checkoutUrl) {
            return res.json({
              checkoutUrl: checkoutLink.checkoutUrl,
              expiresAt: checkoutLink.expiresAt || new Date(Date.now() + 3600000).toISOString(), // 1 hour default
            });
          }
        } catch (crossmintError) {
          console.error('[Checkout Intent] Crossmint error, falling back to mock:', crossmintError);
          // Fall through to mock URL
        }
      }

      // Return mock URL if provider not connected or Crossmint failed
      const mockCheckoutUrl = productUrl 
        ? `${productUrl}?checkout=true&quantity=${quantity || 1}&currency=${currencyPreference || 'USD'}${shippingCountry ? `&shipping=${encodeURIComponent(shippingCountry)}` : ''}`
        : `https://checkout.example.com/product/${productId || 'unknown'}?quantity=${quantity || 1}&currency=${currencyPreference || 'USD'}`;

      console.log('[Checkout Intent] Returning mock checkout URL (provider not connected)');

      return res.json({
        checkoutUrl: mockCheckoutUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      });
    }

    // Legacy format: use existing checkoutIntentSchema
    const validationResult = checkoutIntentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const intent = await createCheckoutIntent(validationResult.data, userId);
    if (!intent) {
      return res.status(404).json({
        error: 'Checkout intent failed',
        message: 'Could not create checkout session for the given items.',
      });
    }

    res.json(intent);
  } catch (error) {
    console.error('[Checkout] Error creating intent:', error);
    res.status(500).json({
      error: 'Failed to create checkout intent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/checkout/create
 * AI-driven checkout flow: create checkout intent after AI confirmation
 * Body: { product, quantity, shippingAddress, paymentPreference, email }
 * Returns: { checkoutUrl, sessionId, provider, expiresAt }
 */
router.post('/create', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string);
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User ID is required for checkout',
      });
    }

    // Validate request body
    const createCheckoutSchema = z.object({
      product: z.object({
        id: z.string(),
        title: z.string(),
        image: z.string().optional(),
        price: z.union([z.number(), z.string()]),
        currency: z.string().optional().default('USD'),
        url: z.string().optional(),
      }),
      quantity: z.number().int().positive().default(1),
      shippingAddress: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string(),
        region: z.string().optional(),
        postalCode: z.string(),
        country: z.string(),
      }).optional(),
      paymentPreference: z.enum(['card', 'apple_pay', 'crypto']).optional(),
      email: z.string().email().optional(),
    });

    const validationResult = createCheckoutSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { product, quantity, shippingAddress, paymentPreference, email } = validationResult.data;

    // Parse price
    const price = typeof product.price === 'number' 
      ? product.price 
      : parseFloat(String(product.price).replace(/[^0-9.]/g, ''));

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        error: 'Invalid product price',
        message: 'Product price must be a valid positive number',
      });
    }

    // Validate checkout confirmation
    const confirmation = {
      product: {
        ...product,
        price,
      },
      quantity,
      shippingAddress,
      paymentPreference,
      email,
    };

    const validation = validateCheckoutConfirmation(confirmation);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid checkout confirmation',
        details: validation.errors,
      });
    }

    // Create checkout intent
    const intent = await createAgentCheckoutIntent(confirmation, userId);
    
    if (!intent) {
      return res.status(500).json({
        error: 'Failed to create checkout intent',
        message: 'Could not create checkout session.',
      });
    }

    // Create order record in database (status: pending)
    try {
      await createOrder({
        userId,
        productId: product.id,
        amount: price * quantity,
        currency: product.currency || 'USD',
        status: 'pending',
        checkoutProvider: intent.provider,
        trackingId: intent.sessionId,
      });
    } catch (orderError) {
      console.error('[Checkout] Error creating order record:', orderError);
      // Don't fail the checkout if order creation fails - log and continue
    }

    res.json({
      checkoutUrl: intent.checkoutUrl,
      sessionId: intent.sessionId,
      provider: intent.provider,
      expiresAt: intent.expiresAt,
    });
  } catch (error) {
    console.error('[Checkout] Error in POST /create:', error);
    res.status(500).json({
      error: 'Failed to create checkout',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/checkout/success
 * Payment success callback - update order status
 * Body: { sessionId, orderId?, status }
 */
router.post('/success', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string);
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const successSchema = z.object({
      sessionId: z.string(),
      orderId: z.string().optional(),
      status: z.enum(['completed', 'paid', 'success']).default('completed'),
    });

    const validationResult = successSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { sessionId, orderId, status } = validationResult.data;

    // Update order status in database
    const { updateOrderStatus } = await import('../db/orderDb.js');
    const order = await updateOrderStatus(
      orderId || sessionId,
      status === 'completed' ? 'completed' : 'paid',
      sessionId
    );

    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        message: `Order with sessionId ${sessionId} not found`,
      });
    }

    res.json({
      ok: true,
      orderId: order.id,
      status: order.status,
    });
  } catch (error) {
    console.error('[Checkout] Error in POST /success:', error);
    res.status(500).json({
      error: 'Failed to process payment success',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

