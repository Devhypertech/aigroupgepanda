/**
 * Chat Database Service
 * Raw SQL queries for chat history persistence
 * Uses node-postgres (pg) for database operations
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

// Test connection on startup
pool.on('error', (err) => {
  console.error('[ChatDB] Unexpected error on idle client', err);
});

/**
 * Execute a query with error handling
 */
async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[ChatDB] Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('[ChatDB] Query error', { text: text.substring(0, 50), error });
    throw error;
  }
}

/**
 * User operations
 */
export async function createUser(id: string, email: string, name?: string): Promise<void> {
  await query(
    'INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET email = $2, name = $3',
    [id, email, name || null]
  );
}

export async function getUserById(id: string): Promise<{ id: string; email: string; name: string | null; created_at: Date } | null> {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getUserByEmail(email: string): Promise<{ id: string; email: string; name: string | null; created_at: Date } | null> {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

/**
 * Conversation operations
 */
export async function createConversation(userId: string, title?: string): Promise<{ id: string; user_id: string; title: string | null; created_at: Date }> {
  const id = createId();
  const result = await query(
    'INSERT INTO conversations (id, user_id, title) VALUES ($1, $2, $3) RETURNING *',
    [id, userId, title || null]
  );
  return result.rows[0];
}

export async function getConversationById(id: string): Promise<{ id: string; user_id: string; title: string | null; created_at: Date } | null> {
  const result = await query('SELECT * FROM conversations WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getConversationsByUserId(userId: string, limit: number = 50): Promise<Array<{ id: string; user_id: string; title: string | null; created_at: Date }>> {
  const result = await query(
    'SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

export async function getLastConversationByUserId(userId: string): Promise<{ id: string; user_id: string; title: string | null; created_at: Date } | null> {
  const result = await query(
    'SELECT * FROM conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Message operations
 */
export async function createMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: any
): Promise<{ id: string; conversation_id: string; role: string; content: string; metadata: any; created_at: Date }> {
  const id = createId();
  const result = await query(
    'INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [id, conversationId, role, content, metadata ? JSON.stringify(metadata) : '{}']
  );
  return {
    ...result.rows[0],
    metadata: typeof result.rows[0].metadata === 'string' ? JSON.parse(result.rows[0].metadata) : result.rows[0].metadata,
  };
}

export async function getMessagesByConversationId(conversationId: string): Promise<Array<{ id: string; conversation_id: string; role: string; content: string; metadata: any; created_at: Date }>> {
  const result = await query(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );
  return result.rows.map(row => ({
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
  }));
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

