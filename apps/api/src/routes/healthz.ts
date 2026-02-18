/**
 * Health Check Endpoint
 * GET /api/healthz - Returns health status of various services
 */

import { Router } from 'express';
import { prisma } from '../db/client.js';

const router = Router();

/**
 * GET /api/healthz
 * Health check endpoint
 * Returns status of server, database, and external services
 */
router.get('/', async (req, res) => {
  const checks: {
    server: string;
    db: string;
    streamKeys: string;
    zhipuKey: string;
    crossmintKey?: string;
    serpApiKey?: string;
    dobaKeys?: string;
    streamPing?: string;
  } = {
    server: 'ok',
    db: 'fail',
    streamKeys: 'missing',
    zhipuKey: 'missing',
  };

  // Check database
  try {
    if (!process.env.DATABASE_URL) {
      checks.db = 'error: DATABASE_URL not set';
    } else if (!prisma) {
      checks.db = 'error: PrismaClient not initialized';
    } else {
      // Try to query database with timeout
      const queryPromise = prisma.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      await Promise.race([queryPromise, timeoutPromise]);
      checks.db = 'ok';
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Health] Database check failed:', errorMessage);
    checks.db = `error: ${errorMessage}`;
  }

  // Check Stream API keys
  const streamApiKey = process.env.STREAM_API_KEY;
  const streamApiSecret = process.env.STREAM_API_SECRET;
  if (streamApiKey && streamApiSecret) {
    checks.streamKeys = 'ok';
  } else {
    const missing = [];
    if (!streamApiKey) missing.push('STREAM_API_KEY');
    if (!streamApiSecret) missing.push('STREAM_API_SECRET');
    checks.streamKeys = `error: Missing ${missing.join(', ')}`;
  }

  // Check Zhipu API key
  const zhipuApiKey = process.env.ZHIPU_API_KEY;
  if (zhipuApiKey) {
    checks.zhipuKey = 'ok';
  } else {
    checks.zhipuKey = 'error: ZHIPU_API_KEY not set';
  }

  // Check Crossmint API key
  const crossmintApiKey = process.env.CROSSMINT_API_KEY;
  if (crossmintApiKey) {
    checks.crossmintKey = 'ok';
  }

  // Check SerpAPI key
  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (serpApiKey) {
    checks.serpApiKey = 'ok';
  }

  // Check Doba keys (both required)
  const dobaPublicKey = process.env.DOBA_PUBLIC_KEY;
  const dobaPrivateKey = process.env.DOBA_PRIVATE_KEY;
  if (dobaPublicKey && dobaPrivateKey) {
    checks.dobaKeys = 'ok';
  }

  // Check Stream ping (optional, can be slow)
  // Only check if streamKeys are ok
  if (checks.streamKeys === 'ok' && streamApiKey && streamApiSecret) {
    try {
      // Try to ping Stream API (lightweight check)
      const { streamServerClient } = await import('../services/stream/streamClient.js');
      // Simple validation - if client exists, consider it ok
      // In production, you might want to do an actual API call
      if (streamServerClient) {
        checks.streamPing = 'ok';
      } else {
        checks.streamPing = 'fail';
      }
    } catch (error) {
      console.error('[Health] Stream ping check failed:', error);
      checks.streamPing = 'fail';
    }
  }

  // Overall health: server is always ok (it's running), but services may be down
  // Return 200 OK even if services are down - this allows monitoring tools to see the status
  const ok = checks.server === 'ok' && checks.db === 'ok';

  // Always return 200 - the 'ok' field indicates if all critical services are healthy
  res.status(200).json({
    ok,
    time: new Date().toISOString(),
    checks,
    message: ok 
      ? 'All systems operational' 
      : 'Server is running but some services are unavailable. Check individual checks for details.',
  });
});

export default router;

