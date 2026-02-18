/**
 * Database Health Check Routes
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';

const router = Router();

/**
 * GET /db/health
 * Check database connection health
 * Returns 200 if connected, 503 if not
 */
router.get('/health', async (req, res) => {
  if (!prisma) {
    return res.status(503).json({
      ok: false,
      error: 'Database not configured',
      message: 'DATABASE_URL is not set',
    });
  }

  try {
    // Test connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    return res.json({
      ok: true,
      message: 'Database connection healthy',
    });
  } catch (error) {
    console.error('[DB Health] Connection test failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDev = process.env.NODE_ENV === 'development';
    
    return res.status(503).json({
      ok: false,
      error: 'Database unreachable',
      message: isDev ? errorMessage : 'Database connection failed',
      ...(isDev && { details: errorMessage }),
    });
  }
});

export default router;

