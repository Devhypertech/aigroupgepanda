/**
 * Order Database Service
 * Raw SQL queries for order persistence
 */

import { Pool } from 'pg';
import { createId } from '@paralleldrive/cuid2';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[OrderDB] Unexpected error on idle client', err);
});

/**
 * Execute a query with error handling
 */
async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[OrderDB] Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('[OrderDB] Query error', { text: text.substring(0, 50), error });
    throw error;
  }
}

export interface Order {
  id: string;
  user_id: string;
  product_id: string | null;
  amount: number;
  currency: string;
  status: string;
  checkout_provider: string | null;
  tracking_id: string | null;
  created_at: Date;
}

/**
 * Create a new order
 */
export async function createOrder(params: {
  userId: string;
  productId?: string;
  amount: number;
  currency: string;
  status?: string;
  checkoutProvider?: string;
  trackingId?: string;
}): Promise<Order> {
  const id = createId();
  const status = params.status || 'pending';
  
  const result = await query(
    `INSERT INTO orders (id, user_id, product_id, amount, currency, status, checkout_provider, tracking_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      params.userId,
      params.productId || null,
      params.amount,
      params.currency,
      status,
      params.checkoutProvider || null,
      params.trackingId || null,
    ]
  );

  return result.rows[0];
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string, userId?: string): Promise<Order | null> {
  let result;
  if (userId) {
    result = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [orderId, userId]);
  } else {
    result = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  }
  return result.rows[0] || null;
}

/**
 * Get orders by user ID
 */
export async function getOrdersByUserId(userId: string, limit: number = 50): Promise<Order[]> {
  const result = await query(
    'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingId?: string
): Promise<Order | null> {
  const updates: string[] = ['status = $2'];
  const params: any[] = [orderId, status];

  if (trackingId) {
    updates.push('tracking_id = $3');
    params.push(trackingId);
  }

  const result = await query(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );

  return result.rows[0] || null;
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

