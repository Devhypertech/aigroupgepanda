/**
 * Orders API Routes
 * Order status and shipping tracking (stub; plug in real provider later)
 */

import { Router } from 'express';
import { z } from 'zod';
import { getCurrentUser } from '../middleware/auth.js';
import { storeOrder, getOrder, getUserOrders, getOrderStatus, updateOrderStatus } from '../services/orderTracking.js';
import { createOrder, getOrderById, getOrdersByUserId, updateOrderStatus as updateOrderStatusDb } from '../db/orderDb.js';

const router = Router();

// Request validation schemas
const storeOrderSchema = z.object({
  product: z.object({
    id: z.string(),
    title: z.string(),
    image: z.string().optional(),
    price: z.string().optional(),
    currency: z.string().optional(),
    url: z.string().optional(),
    source: z.string().optional(),
  }),
  quantity: z.number().int().positive(),
  amount: z.number().positive(),
  currency: z.string().optional().default('USD'),
  checkoutId: z.string().optional(),
  checkoutUrl: z.string().optional(),
  shippingAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    region: z.string().optional(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
});

/**
 * POST /api/orders/store
 * Store order after payment
 */
router.post('/store', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validationResult = storeOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    // Store order in database
    const { product, quantity, amount, currency, checkoutId, shippingAddress } = validationResult.data;
    
    const dbOrder = await createOrder({
      userId,
      productId: product.id,
      amount,
      currency: currency || 'USD',
      status: 'pending',
      checkoutProvider: 'crossmint', // Default, can be updated
      trackingId: checkoutId,
    });

    // Also store in legacy in-memory storage for backward compatibility
    const legacyOrder = storeOrder({
      userId,
      ...validationResult.data,
    });

    res.json({
      ok: true,
      orderId: dbOrder.id,
      status: dbOrder.status,
    });
  } catch (error) {
    console.error('[Orders] Error storing order:', error);
    res.status(500).json({
      error: 'Failed to store order',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/orders
 * List current user's orders
 */
router.get('/', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get orders from database
    const dbOrders = await getOrdersByUserId(userId);
    
    // Also get from legacy storage for backward compatibility
    const legacyOrders = getUserOrders(userId);

    // Combine and deduplicate (prefer database orders)
    const orderMap = new Map();
    
    // Add database orders
    dbOrders.forEach(order => {
      orderMap.set(order.id, {
        orderId: order.id,
        productId: order.product_id,
        amount: parseFloat(order.amount.toString()),
        currency: order.currency,
        status: order.status,
        checkoutProvider: order.checkout_provider,
        trackingId: order.tracking_id,
        createdAt: order.created_at,
      });
    });

    // Add legacy orders that aren't in database
    legacyOrders.forEach(order => {
      if (!orderMap.has(order.orderId)) {
        orderMap.set(order.orderId, {
          orderId: order.orderId,
          product: order.product,
          quantity: order.quantity,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          createdAt: order.createdAt,
        });
      }
    });

    const allOrders = Array.from(orderMap.values());

    res.json({
      orders: allOrders,
      count: allOrders.length,
    });
  } catch (error) {
    console.error('[Orders] Error listing orders:', error);
    res.status(500).json({
      error: 'Failed to list orders',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/orders/status/:orderId
 * Get order status (alias for /:orderId)
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { orderId } = req.params;
    
    // Try database first
    const dbOrder = await getOrderById(orderId, userId);
    if (dbOrder) {
      return res.json({
        orderId: dbOrder.id,
        status: dbOrder.status,
        amount: parseFloat(dbOrder.amount.toString()),
        currency: dbOrder.currency,
        checkoutProvider: dbOrder.checkout_provider,
        trackingId: dbOrder.tracking_id,
        createdAt: dbOrder.created_at,
      });
    }

    // Fallback to legacy storage
    const status = getOrderStatus(orderId, userId);
    if (!status) {
      return res.status(404).json({
        error: 'Order not found',
        orderId,
      });
    }

    res.json(status);
  } catch (error) {
    console.error('[Orders] Error getting order status:', error);
    res.status(500).json({
      error: 'Failed to get order status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/orders/:orderId
 * Get order details
 */
router.get('/:orderId', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { orderId } = req.params;
    
    // Try database first
    const dbOrder = await getOrderById(orderId, userId);
    if (dbOrder) {
      return res.json({
        orderId: dbOrder.id,
        userId: dbOrder.user_id,
        productId: dbOrder.product_id,
        amount: parseFloat(dbOrder.amount.toString()),
        currency: dbOrder.currency,
        status: dbOrder.status,
        checkoutProvider: dbOrder.checkout_provider,
        trackingId: dbOrder.tracking_id,
        createdAt: dbOrder.created_at,
      });
    }

    // Fallback to legacy storage
    const order = getOrder(orderId, userId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        orderId,
      });
    }

    res.json(order);
  } catch (error) {
    console.error('[Orders] Error getting order:', error);
    res.status(500).json({
      error: 'Failed to get order',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/orders/:orderId/tracking
 * Get shipping tracking for an order
 */
router.get('/:orderId/tracking', async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    const userId = currentUser?.id ?? (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { orderId } = req.params;
    const order = getOrder(orderId, userId);
    
    if (!order) {
      return res.status(404).json({
        error: 'Order not found',
        orderId,
      });
    }

    if (!order.tracking) {
      return res.json({
        orderId,
        status: order.status,
        tracking: null,
        message: 'Tracking will be available once the order ships.',
      });
    }

    res.json({
      orderId,
      status: order.status,
      tracking: order.tracking,
      lastUpdated: order.updatedAt,
    });
  } catch (error) {
    console.error('[Orders] Error getting tracking:', error);
    res.status(500).json({
      error: 'Failed to get tracking',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
