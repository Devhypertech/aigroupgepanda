/**
 * Order Tracking Service
 * Stores and tracks orders after payment
 */

import { v4 as uuidv4 } from 'uuid';

export interface Order {
  orderId: string;
  userId: string;
  product: {
    id: string;
    title: string;
    image?: string;
    price?: string;
    currency?: string;
    url?: string;
    source?: string;
  };
  quantity: number;
  amount: number;
  currency: string;
  checkoutId?: string;
  checkoutUrl?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  tracking?: {
    carrier: string;
    number: string;
    url?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// In-memory storage (replace with database in production)
const orders: Map<string, Order> = new Map();

/**
 * Store order after payment
 */
export function storeOrder(params: {
  userId: string;
  product: Order['product'];
  quantity: number;
  amount: number;
  currency?: string;
  checkoutId?: string;
  checkoutUrl?: string;
  shippingAddress?: Order['shippingAddress'];
}): Order {
  const orderId = uuidv4();
  const now = new Date().toISOString();

  const order: Order = {
    orderId,
    userId: params.userId,
    product: params.product,
    quantity: params.quantity,
    amount: params.amount,
    currency: params.currency || 'USD',
    checkoutId: params.checkoutId,
    checkoutUrl: params.checkoutUrl,
    status: 'pending',
    shippingAddress: params.shippingAddress,
    createdAt: now,
    updatedAt: now,
  };

  orders.set(orderId, order);
  console.log(`[OrderTracking] Stored order ${orderId} for user ${params.userId}`);

  return order;
}

/**
 * Get order by ID
 */
export function getOrder(orderId: string, userId?: string): Order | null {
  const order = orders.get(orderId);
  
  if (!order) {
    return null;
  }

  // Verify user owns the order if userId is provided
  if (userId && order.userId !== userId) {
    return null;
  }

  return order;
}

/**
 * Get all orders for a user
 */
export function getUserOrders(userId: string): Order[] {
  return Array.from(orders.values())
    .filter(order => order.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Update order status
 */
export function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  tracking?: Order['tracking']
): Order | null {
  const order = orders.get(orderId);
  
  if (!order) {
    return null;
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  
  if (tracking) {
    order.tracking = tracking;
  }

  orders.set(orderId, order);
  console.log(`[OrderTracking] Updated order ${orderId} status to ${status}`);

  return order;
}

/**
 * Get order status
 */
export function getOrderStatus(orderId: string, userId?: string): {
  orderId: string;
  status: Order['status'];
  tracking?: Order['tracking'];
  createdAt: string;
  updatedAt: string;
} | null {
  const order = getOrder(orderId, userId);
  
  if (!order) {
    return null;
  }

  return {
    orderId: order.orderId,
    status: order.status,
    tracking: order.tracking,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Get full tracking details for an order.
 * Alias used by trackingAgent for clarity.
 */
export function getOrderTracking(orderId: string, userId?: string): Order['tracking'] | null {
  const order = getOrder(orderId, userId);
  return order?.tracking || null;
}

