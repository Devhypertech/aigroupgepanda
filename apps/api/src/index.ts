// ============================================================================
// ENVIRONMENT VARIABLE LOADING
// ============================================================================
// Load .env FIRST - before any other imports that might use process.env
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

// Get current directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine env file paths
const apiEnvPath = resolve(__dirname, '../.env');
const rootEnvPath = resolve(__dirname, '../../../.env');

// Set NODE_ENV if not already set (defaults to development)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Load environment files with logging
const loadedEnvFiles: string[] = [];

// Try to load apps/api/.env first (preferred)
if (existsSync(apiEnvPath)) {
  const result = config({ path: apiEnvPath });
  if (!result.error) {
    loadedEnvFiles.push(apiEnvPath);
    console.log(`✅ Loaded env file: ${apiEnvPath}`);
  } else {
    console.warn(`⚠️  Failed to load ${apiEnvPath}: ${result.error.message}`);
  }
} else {
  console.log(`ℹ️  Env file not found: ${apiEnvPath} (this is OK if using root .env)`);
}

// Try to load root .env as fallback
if (existsSync(rootEnvPath)) {
  const result = config({ path: rootEnvPath });
  if (!result.error) {
    loadedEnvFiles.push(rootEnvPath);
    console.log(`✅ Loaded env file: ${rootEnvPath}`);
  } else {
    console.warn(`⚠️  Failed to load ${rootEnvPath}: ${result.error.message}`);
  }
} else {
  console.log(`ℹ️  Env file not found: ${rootEnvPath} (this is OK if using apps/api/.env)`);
}

if (loadedEnvFiles.length === 0) {
  console.warn(`\n⚠️  WARNING: No .env files found!`);
  console.warn(`   Tried:`);
  console.warn(`   - ${apiEnvPath}`);
  console.warn(`   - ${rootEnvPath}`);
  console.warn(`   Server will use environment variables from system or defaults.\n`);
} else {
  console.log(`\n📁 Loaded ${loadedEnvFiles.length} env file(s) successfully\n`);
}

// ============================================================================
// STARTUP DIAGNOSTICS
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('🚀 API SERVER STARTUP');
console.log('='.repeat(70));

// Print environment diagnostics
console.log(`\n📋 Environment Configuration:`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV} (${process.env.NODE_ENV === 'production' ? 'production' : 'development'})`);
console.log(`   PORT: ${process.env.PORT || '3001 (default)'} ${process.env.PORT ? '(from env)' : '(default fallback)'}`);

// Parse PORT (ensure it's a number)
const PORT = Number(process.env.PORT || 3001);

// Print process.cwd()
console.log(`   Working Directory: ${process.cwd()}`);

// Print loaded env keys (names only, not values)
console.log(`\n🔑 Loaded Environment Variables (keys only):`);
const envKeys = Object.keys(process.env)
  .filter(key =>
    key.startsWith('STREAM_') ||
    key.startsWith('ZHIPU_') ||
    key.startsWith('DATABASE_') ||
    key.startsWith('CROSSMINT_') ||
    key.startsWith('SERPAPI_') ||
    key.startsWith('DOBA_') ||
    key.startsWith('RYE_') ||
    key.startsWith('TRAVELPAYOUTS_') ||
    key.startsWith('WEATHER_') ||
    key === 'PORT' ||
    key === 'NODE_ENV'
  )
  .sort();
if (envKeys.length > 0) {
  envKeys.forEach(key => {
    const value = process.env[key];
    const displayValue = value ? `${value.substring(0, 10)}...` : '(not set)';
    console.log(`   ✓ ${key}: ${value ? 'set' : 'not set'}`);
  });
} else {
  console.log('   ⚠️  No relevant environment variables found');
}

console.log('\n' + '='.repeat(70));

// Check environment variables (warn but don't crash)
const criticalEnvVars = {
  STREAM_API_KEY: process.env.STREAM_API_KEY,
  STREAM_API_SECRET: process.env.STREAM_API_SECRET,
};

const missingCriticalVars = Object.entries(criticalEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingCriticalVars.length > 0) {
  console.warn('\n' + '⚠️'.repeat(35));
  console.warn('⚠️  WARNING: Missing critical environment variables:');
  missingCriticalVars.forEach(key => console.warn(`   - ${key}`));
  console.warn('\n⚠️  Some features may not work without these variables.');
  console.warn('⚠️  For local development, create a .env file in apps/api/ with:');
  console.warn('   STREAM_API_KEY=your_key');
  console.warn('   STREAM_API_SECRET=your_secret');
  console.warn('\n⚠️  Server will start anyway, but Stream Chat features will be disabled.');
  console.warn('⚠️'.repeat(35) + '\n');
} else {
  console.log('✅ Critical environment variables (STREAM_API_KEY, STREAM_API_SECRET) are set\n');
}

// Log environment variable status
console.log('\n✅ Environment Variables Status:');
console.log(`   STREAM_API_KEY: ${criticalEnvVars.STREAM_API_KEY ? '✓ Loaded' : '✗ Missing'}`);
console.log(`   STREAM_API_SECRET: ${criticalEnvVars.STREAM_API_SECRET ? '✓ Loaded' : '✗ Missing'}`);
console.log(`   STREAM_FEEDS_API_KEY: ${process.env.STREAM_FEEDS_API_KEY || process.env.STREAM_API_KEY ? '✓ Loaded' : '⚠️  Not set (Activity Feeds will use Chat key or be disabled)'}`);
console.log(`   STREAM_FEEDS_API_SECRET: ${process.env.STREAM_FEEDS_API_SECRET || process.env.STREAM_API_SECRET ? '✓ Loaded' : '⚠️  Not set (Activity Feeds will use Chat secret or be disabled)'}`);
console.log(`   ZHIPU_API_KEY: ${process.env.ZHIPU_API_KEY ? '✓ Loaded' : '⚠️  Not set (AI features will not work)'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Loaded' : '⚠️  Not set (database features will not work)'}`);
console.log(`   RYE_API_KEY: ${process.env.RYE_API_KEY ? '✓ Loaded' : '⚠️  Not set (checkout features will not work)'}`);
console.log(`   TRAVELPAYOUTS_TOKEN/API_KEY: ${(process.env.TRAVELPAYOUTS_TOKEN || process.env.TRAVELPAYOUTS_API_KEY) ? '✓ Loaded' : '⚠️  Not set (flight search will use mock data)'}`);
console.log(`   DOBA_PUBLIC_KEY: ${process.env.DOBA_PUBLIC_KEY ? '✓ Loaded' : '⚠️  Not set'}`);
console.log(`   DOBA_PRIVATE_KEY: ${process.env.DOBA_PRIVATE_KEY ? '✓ Loaded' : '⚠️  Not set (product recommendations will use mock data)'}`);
console.log(`   CROSSMINT_API_KEY: ${process.env.CROSSMINT_API_KEY ? '✓ Loaded' : '⚠️  Not set (checkout link creation will not work)'}`);
console.log(`   SERPAPI_API_KEY: ${process.env.SERPAPI_API_KEY ? '✓ Loaded' : '⚠️  Not set (Google shopping searches will not work)'}`);
console.log(`   WEATHER_API_KEY: ${process.env.WEATHER_API_KEY ? '✓ Loaded' : '⚠️  Not set (weather features will use mock data)'}`);
console.log(`   ADMIN_EMAILS: ${process.env.ADMIN_EMAILS ? `✓ Loaded (${process.env.ADMIN_EMAILS.split(',').length} admin(s))` : '⚠️  Not set (admin endpoints disabled)'}`);

// ============================================================================
// CHAT & AI CONFIGURATION VALIDATION
// ============================================================================
console.log('\n🤖 Chat & AI Configuration:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// LLM Configuration (Required for chat)
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
if (!ZHIPU_API_KEY) {
  console.warn('   ⚠️  ZHIPU_API_KEY: Missing');
  console.warn('      Chat will return fallback messages without AI responses');
  console.warn('      Set ZHIPU_API_KEY in apps/api/.env to enable AI chat');
} else {
  console.log(`   ✅ ZHIPU_API_KEY: Configured (${ZHIPU_API_KEY.substring(0, 10)}...)`);
}

// Shopping APIs (Optional - chat works without these)
console.log('\n🛒 Shopping Features (Optional):');
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const DOBA_PUBLIC_KEY = process.env.DOBA_PUBLIC_KEY;
const DOBA_PRIVATE_KEY = process.env.DOBA_PRIVATE_KEY;
const CROSSMINT_API_KEY = process.env.CROSSMINT_API_KEY;

if (!SERPAPI_API_KEY) {
  console.warn('   ⚠️  SERPAPI_API_KEY: Missing (Google Shopping search disabled)');
} else {
  console.log(`   ✅ SERPAPI_API_KEY: Configured (${SERPAPI_API_KEY.substring(0, 10)}...)`);
}

if (!DOBA_PUBLIC_KEY || !DOBA_PRIVATE_KEY) {
  console.warn('   ⚠️  DOBA keys: Missing (Doba product recommendations disabled)');
} else {
  console.log(`   ✅ DOBA keys: Configured`);
}

if (!CROSSMINT_API_KEY) {
  console.warn('   ⚠️  CROSSMINT_API_KEY: Missing (Checkout link creation disabled)');
} else {
  console.log(`   ✅ CROSSMINT_API_KEY: Configured (${CROSSMINT_API_KEY.substring(0, 10)}...)`);
}

console.log('\n💡 Note: Chat works with just ZHIPU_API_KEY. Shopping features are optional.');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Health check summary on startup
console.log('\n🔍 Health Check Summary:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Server: ✅ OK`);
console.log(`   Database: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing DATABASE_URL'}`);
console.log(`   Stream API: ${criticalEnvVars.STREAM_API_KEY && criticalEnvVars.STREAM_API_SECRET ? '✅ Configured' : '⚠️  Missing keys (server will start but Stream Chat disabled)'}`);
if (!criticalEnvVars.STREAM_API_KEY) console.log('      - Missing STREAM_API_KEY');
if (!criticalEnvVars.STREAM_API_SECRET) console.log('      - Missing STREAM_API_SECRET');
console.log(`   Zhipu AI: ${ZHIPU_API_KEY ? '✅ Configured' : '⚠️  Missing ZHIPU_API_KEY (chat will use fallback responses)'}`);
console.log(`   Shopping APIs: ${SERPAPI_API_KEY ? '✅ SerpAPI configured' : '⚠️  SerpAPI disabled'} | ${CROSSMINT_API_KEY ? '✅ Crossmint configured' : '⚠️  Crossmint disabled'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { prisma, getDatabaseInfo } from './db/client.js';
import roomsRouter from './routes/rooms.js';
import invitesRouter from './routes/invites.js';
import streamRouter from './routes/stream.js';
import aiRouter from './routes/ai.js';
import companionRouter from './routes/companion.js';
import chatRouter from './routes/chat.js';
import feedRouter from './routes/feed.js';
import flightsRouter from './routes/flights.js';
import { initializeAICompanion } from './services/stream/streamClient.js';
import { setupStreamWebhooks } from './services/stream/webhooks.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration - allow requests from web app
const allowedOrigins: string[] = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  // Production web app (frontend) – add all domains that host the frontend
  'https://aiplatform.gepanda.com',
  'http://aiplatform.gepanda.com',
  'https://aigroupgepanda-api.vercel.app',
];

// Add web app origin(s) from environment (comma-separated, no trailing slash). Overrides/adds to list above.
if (process.env.WEB_APP_URL) {
  const urls = process.env.WEB_APP_URL.split(',').map((u) => u.trim().replace(/\/+$/, '')).filter(Boolean);
  allowedOrigins.push(...urls);
}

app.use(cors({
  origin: (origin, callback) => {
    // Normalize origin for comparison (no trailing slash)
    const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : '';

    // In development, always allow localhost and 127.0.0.1
    if (process.env.NODE_ENV !== 'production') {
      if (!origin ||
        origin === 'http://localhost:3000' ||
        origin === 'http://127.0.0.1:3000' ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }

    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    const allowed = origin && (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin));
    if (allowed) {
      callback(null, true);
    } else if (!origin) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked origin:', origin, 'Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
}));

app.use(express.json());
app.use(cookieParser());

// Track registered routes for debugging
const registeredRoutesList: string[] = [];

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    message: 'Gepanda AI Group Chat API',
    version: '0.1.0',
    status: 'running',
    chatProvider: 'Stream Chat',
    aiModel: 'Zhipu GLM-4.6 Flash',
    registeredRoutes: registeredRoutesList.sort(),
    endpoints: {
      stream: {
        'POST /api/stream/token': 'Generate Stream Chat token for a user',
        'POST /api/stream/channel': 'Create or get channel and add user as member',
        'POST /api/stream/webhook': 'Stream Chat webhook endpoint (for AI responses)',
      },
      companion: {
        'POST /api/companion/channel': 'Create or get companion channel with AI',
      },
      ai: {
        'POST /api/ai/reply': 'Generate and post AI reply to Stream channel',
      },
      vision: {
        'POST /api/vision/analyze': 'Upload image, OCR, and AI analysis',
        'POST /api/vision/ocr': 'Extract text from image (OCR only)',
      },
      voice: {
        'POST /api/voice/transcribe': 'Upload voice, convert to text (speech-to-text)',
        'POST /api/voice/translate': 'Translate text to another language',
        'POST /api/voice/speak': 'Convert text to speech (future)',
      },
      rooms: {
        'POST /api/rooms/:roomId/invite': 'Create an invite link for a room',
        'GET /api/rooms/:roomId/context': 'Get trip context for a room',
        'PUT /api/rooms/:roomId/context': 'Update trip context for a room',
      },
      invites: {
        'GET /api/invites/:token': 'Resolve an invite token to get roomId',
      },
    },
  });
});

// Seed feed items on startup (if database available) - moved to server startup callback
// Note: This only runs if database is empty. Regular ingestion is handled by cron.

// Start feed ingestion cron job - moved to server startup callback

// ============================================================================
// ROUTE LOADING (NON-BLOCKING, GRACEFUL FAILURES)
// ============================================================================
// Load /api/healthz FIRST so it's always available even if other routes fail
console.log('\n📦 Loading routes...');
try {
  const healthzRouter = await import('./routes/healthz.js');
  app.use('/api/healthz', healthzRouter.default);
  console.log('✅ Health check route loaded');
} catch (error) {
  console.error('❌ CRITICAL: Failed to load healthz route:', error);
  // Still register a basic healthz endpoint
  app.get('/api/healthz', (req, res) => {
    res.status(200).json({
      ok: false,
      time: new Date().toISOString(),
      checks: {
        server: 'ok',
        db: 'error: Route loading failed',
        streamKeys: 'unknown',
        zhipuKey: 'unknown',
      },
      message: 'Server is running but route loading failed',
    });
  });
  console.log('⚠️  Using fallback healthz endpoint');
}

// Load other routes (non-blocking, continue even if some fail)
const loadRoutes = async () => {
  // Register pre-imported routers directly (they're already loaded)
  // These are critical routes that must always be available
  const preImportedRouters = [
    { name: 'rooms', router: roomsRouter, path: '/api/rooms' },
    { name: 'invites', router: invitesRouter, path: '/api/invites' },
    { name: 'stream', router: streamRouter, path: '/api/stream' },
    { name: 'ai', router: aiRouter, path: '/api/ai' },
    { name: 'companion', router: companionRouter, path: '/api/companion' },
    { name: 'chat', router: chatRouter, path: '/api/chat' },
    { name: 'feed', router: feedRouter, path: '/api/feed' },
    { name: 'flights', router: flightsRouter, path: '/api/flights' },
  ];

  // Register pre-imported routers first
  preImportedRouters.forEach(({ name, router, path }) => {
    try {
      if (!router || typeof router.use !== 'function') {
        throw new Error(`Invalid router for ${name}`);
      }
      app.use(path, router);
      registeredRoutesList.push(path);
      console.log(`   ✓ Registered route: ${path} (router has ${router.stack?.length || 0} middleware/routes)`);
    } catch (error) {
      console.warn(`⚠️  Failed to register pre-imported route '${name}':`, error instanceof Error ? error.message : error);
    }
  });

  const routeLoaders = [
    // feed route moved to pre-imported routes above (critical route)
    { name: 'feedSeed', loader: () => import('./routes/feedSeed.js'), path: '/api/feed' },
    { name: 'feedDev', loader: () => import('./routes/feedDev.js'), path: '/api/feed/dev' },
    { name: 'feedWhy', loader: () => import('./routes/feedWhy.js'), path: '/api/feed' },
    { name: 'feedInteractions', loader: () => import('./routes/feedInteractions.js'), path: '/api/feed/interactions' },
    { name: 'feedInteract', loader: () => import('./routes/feedInteract.js'), path: '/api/feed/interact' },
    { name: 'feedSaved', loader: () => import('./routes/feedSaved.js'), path: '/api/feed' },
    { name: 'saved', loader: () => import('./routes/saved.js'), path: '/api/saved' },
    { name: 'feedNotInterested', loader: () => import('./routes/feedNotInterested.js'), path: '/api/feed/not-interested' },
    { name: 'products', loader: () => import('./routes/products.js'), path: '/api/products' },
    { name: 'checkout', loader: () => import('./routes/checkout.js'), path: '/api/checkout' },
    { name: 'orders', loader: () => import('./routes/orders.js'), path: '/api/orders' },
    { name: 'channels', loader: () => import('./routes/channels.js'), path: '/api/channels' },
    // chat route moved to pre-imported routes above (critical route)
    { name: 'chatHistory', loader: () => import('./routes/chatHistory.js'), path: '/api/chat' },
    { name: 'routes', loader: () => import('./routes/routes.js'), path: '/api/routes' },
    { name: 'auth', loader: () => import('./routes/auth.js'), path: '/api/auth' },
    { name: 'authUpsert', loader: () => import('./routes/auth.js'), path: '/auth' },
    { name: 'interests', loader: () => import('./routes/interests.js'), path: '/api/interests' },
    { name: 'usersInterests', loader: () => import('./routes/interests.js'), path: '/api/users' },
    { name: 'users', loader: () => import('./routes/users.js'), path: '/api/users' },
    { name: 'admin', loader: () => import('./routes/admin.js'), path: '/api/admin' },
    { name: 'vision', loader: () => import('./routes/vision.js'), path: '/api/vision' },
    { name: 'voice', loader: () => import('./routes/voice.js'), path: '/api/voice' },
    { name: 'tools', loader: () => import('./routes/tools.js'), path: '/api/tools' },
    { name: 'db', loader: () => import('./routes/db.js'), path: '/db' },
  ];

  const results = await Promise.allSettled(
    routeLoaders.map(async ({ name, loader, path }) => {
      try {
        const module = await loader();
        // Handle both default export and direct router export
        let router: any = null;

        if (module && typeof module === 'object') {
          // Check for default export first
          if ('default' in module && module.default && typeof module.default === 'object' && 'use' in module.default) {
            router = module.default;
          }
          // Check if module itself is a router (for Promise.resolve() cases where router is already imported)
          else if ('use' in module && typeof (module as any).use === 'function') {
            router = module;
          }
        }

        if (!router || typeof router.use !== 'function') {
          // Debug info for troubleshooting
          console.error(`[Route Loader] Failed to extract router for '${name}':`, {
            hasModule: !!module,
            moduleType: typeof module,
            hasDefault: module && 'default' in module,
            hasUse: module && 'use' in module,
            moduleKeys: module && typeof module === 'object' ? Object.keys(module).slice(0, 10) : [],
          });
          throw new Error(`Invalid router export for ${name} - expected Express Router`);
        }

        app.use(path, router);
        registeredRoutesList.push(path);
        console.log(`   ✓ Registered route: ${path} (router has ${router.stack?.length || 0} middleware/routes)`);
        return { name, success: true };
      } catch (error) {
        console.warn(`⚠️  Failed to load route '${name}':`, error instanceof Error ? error.message : error);
        return { name, success: false, error: error instanceof Error ? error.message : String(error) };
      }
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

  console.log(`\n✅ Routes loaded: ${successful} successful, ${failed} failed`);
  if (failed > 0) {
    console.warn('\n⚠️  Some routes failed to load but server will continue:');
    results.forEach((result, idx) => {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)) {
        const routeName = routeLoaders[idx].name;
        const routePath = routeLoaders[idx].path;
        const error = result.status === 'rejected'
          ? (result.reason instanceof Error ? result.reason.message : String(result.reason))
          : result.value.error;
        console.warn(`   ❌ ${routeName} (${routePath}): ${error}`);
        if (result.status === 'rejected' && result.reason instanceof Error && result.reason.stack) {
          console.warn(`      Stack: ${result.reason.stack.split('\n').slice(0, 3).join('\n      ')}`);
        }
      }
    });
    console.warn('');
  }

  // List all successfully registered routes for verification
  console.log('\n📋 Registered Routes Summary:');
  const registeredRoutes = results
    .map((result, idx) => {
      if (result.status === 'fulfilled' && result.value.success) {
        return routeLoaders[idx].path;
      }
      return null;
    })
    .filter(Boolean);

  // Add pre-imported routes
  preImportedRouters.forEach(({ path }) => {
    registeredRoutes.push(path);
  });

  registeredRoutes.sort().forEach(path => {
    console.log(`   ✓ ${path}`);
  });

  // Verify critical routes are registered
  const criticalRoutes = ['/api/stream', '/api/companion'];
  const missingCritical = criticalRoutes.filter(route => !registeredRoutesList.includes(route));
  if (missingCritical.length > 0) {
    console.error('\n❌ CRITICAL: Missing required routes:');
    missingCritical.forEach(route => console.error(`   - ${route}`));
    console.error('   Server will start but these endpoints will return 404\n');
  } else {
    console.log('\n✅ All critical routes registered (/api/stream, /api/companion)');
  }

  // Add debug endpoint to list all registered routes
  app.get('/api/debug/routes', (req, res) => {
    res.json({
      registeredRoutes: registeredRoutesList.sort(),
      criticalRoutes: {
        '/api/stream': registeredRoutesList.includes('/api/stream'),
        '/api/companion': registeredRoutesList.includes('/api/companion'),
        '/api/flights': registeredRoutesList.includes('/api/flights'),
      },
      allRoutes: app._router?.stack?.map((layer: any) => {
        if (layer.route) {
          return `${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`;
        }
        return null;
      }).filter(Boolean) || [],
    });
  });

  // Debug: list env keys (mask secrets)
  app.get('/api/debug/env', (req, res) => {
    const mask = (v: string) => (v && v.length > 4 ? `${v.substring(0, 4)}***` : '(empty)');
    const env: Record<string, string> = {};
    for (const key of Object.keys(process.env).sort()) {
      if (key.startsWith('TRAVELPAYOUTS_') || key.startsWith('ZHIPU_') || key === 'PORT' || key === 'NODE_ENV') {
        env[key] = process.env[key] ? mask(process.env[key]) : '(not set)';
      }
    }
    res.json({
      TRAVELPAYOUTS_TOKEN: env.TRAVELPAYOUTS_TOKEN ?? '(not in list)',
      TRAVELPAYOUTS_API_KEY: env.TRAVELPAYOUTS_API_KEY ?? '(not in list)',
      TRAVELPAYOUTS_MARKER: env.TRAVELPAYOUTS_MARKER ?? '(not in list)',
      TRAVELPAYOUTS_BASE_URL: process.env.TRAVELPAYOUTS_BASE_URL || '(default)',
      ZHIPU_API_KEY: env.ZHIPU_API_KEY ?? '(not in list)',
      PORT: process.env.PORT || '3001',
      NODE_ENV: process.env.NODE_ENV || 'development',
    });
  });

  console.log('');
};

// Setup Stream Chat webhooks (non-blocking, graceful failure)
try {
  setupStreamWebhooks(app);
  console.log('✅ Stream webhooks configured');
} catch (error) {
  console.warn('⚠️  Failed to setup Stream webhooks (server will continue):', error instanceof Error ? error.message : error);
}

// Load routes BEFORE starting server (await to ensure routes are registered)
// This ensures all routes are available when server starts listening
await loadRoutes().catch((error) => {
  console.error('❌ Critical error during route loading:', error);
  console.warn('⚠️  Server will start but some routes may be unavailable');
});

// Add catch-all 404 handler AFTER all routes are loaded
// This helps debug routing issues by showing what routes are available
app.use((req, res, next) => {
  // Skip if this is a static file request or already handled
  if (req.path.startsWith('/_next') || req.path.startsWith('/static')) {
    return next();
  }

  // Return JSON 404 with helpful info
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: registeredRoutesList.sort(),
    hint: 'Check /api/debug/routes for detailed route information',
  });
});

// Log registered feed routes
console.log('\n📋 Feed Routes Registered:');
console.log('   GET  /api/feed - Get feed items with filters');
console.log('   POST /api/feed/dev/seed - Seed demo feed items (dev only)');
console.log('   POST /api/feed/seed - Seed feed items (if enabled)');
console.log('   POST /api/feed/:id/why - Generate/retrieve why this matters');
console.log('   GET  /api/feed/saved - Get saved feed items');
console.log('   POST /api/feed/interact - Track feed interaction');
console.log('   POST /api/feed/not-interested - Mark item as not interested');

// PORT is already set above in startup diagnostics
// Validate PORT
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`\n❌ FATAL ERROR: Invalid PORT value: ${process.env.PORT}`);
  console.error(`   PORT must be a number between 1 and 65535`);
  console.error(`   Current value: ${process.env.PORT}`);
  process.exit(1);
}

// Health check endpoint
// Legacy health endpoint (kept for backwards compatibility)
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'api',
    time: new Date().toISOString(),
  });
});

// ============================================================================
// PROCESS-LEVEL ERROR HANDLERS
// ============================================================================
process.on('uncaughtException', (error: Error) => {
  console.error('\n' + '='.repeat(70));
  console.error('❌ UNCAUGHT EXCEPTION - Server will exit');
  console.error('='.repeat(70));
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  console.error('='.repeat(70) + '\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('\n' + '='.repeat(70));
  console.error('❌ UNHANDLED REJECTION - Server will exit');
  console.error('='.repeat(70));
  console.error('Reason:', reason);
  if (reason instanceof Error) {
    console.error('Message:', reason.message);
    console.error('Stack:', reason.stack);
  }
  console.error('Promise:', promise);
  console.error('='.repeat(70) + '\n');
  process.exit(1);
});

// ============================================================================
// ROBUST PORT BINDING WITH AUTO-FALLBACK
// ============================================================================
/**
 * Try to bind server to a port, with automatic fallback to next available port
 * @param server - HTTP server instance
 * @param preferredPort - Preferred port (from env or default)
 * @param maxAttempts - Maximum number of ports to try (default: 3)
 * @returns Promise that resolves with the port number that was bound
 */
const bindServerToPort = (
  server: ReturnType<typeof createServer>,
  preferredPort: number,
  maxAttempts: number = 3
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const portsToTry = [preferredPort];

    // Generate fallback ports (3001 -> 3002 -> 3003, etc.)
    for (let i = 1; i < maxAttempts; i++) {
      portsToTry.push(preferredPort + i);
    }

    let attemptIndex = 0;

    const tryNextPort = () => {
      if (attemptIndex >= portsToTry.length) {
        const error = new Error(`Failed to bind to any port after ${maxAttempts} attempts`);
        (error as any).code = 'EADDRINUSE_ALL';
        reject(error);
        return;
      }

      const currentPort = portsToTry[attemptIndex];
      attemptIndex++;

      console.log(`\n🔌 Attempting to bind to port ${currentPort}...`);
      if (attemptIndex > 1) {
        console.log(`   (Previous port ${portsToTry[attemptIndex - 2]} was in use)`);
      }

      // Remove any existing error listeners to avoid duplicate handlers
      server.removeAllListeners('error');

      // Set up error handler for this attempt
      const errorHandler = (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`   ⚠️  Port ${currentPort} is already in use`);

          // Try next port
          if (attemptIndex < portsToTry.length) {
            console.log(`   🔄 Trying next port: ${portsToTry[attemptIndex]}...`);
            setTimeout(tryNextPort, 100); // Small delay before retry
          } else {
            // All ports exhausted
            server.removeAllListeners('error');
            const finalError = new Error(
              `All ports exhausted. Tried: ${portsToTry.join(', ')}`
            );
            (finalError as any).code = 'EADDRINUSE_ALL';
            (finalError as any).triedPorts = portsToTry;
            reject(finalError);
          }
        } else {
          // Other error (not port in use)
          server.removeAllListeners('error');
          reject(error);
        }
      };

      server.once('error', errorHandler);

      // Try to listen on current port
      server.listen(currentPort, '0.0.0.0', () => {
        // Success! Remove error handler and resolve
        server.removeAllListeners('error');
        resolve(currentPort);
      });
    };

    // Start trying ports
    tryNextPort();
  });
};

// ============================================================================
// START SERVER
// ============================================================================
// Ensure PORT is valid, use default if not
const finalPort = (isNaN(PORT) || PORT < 1 || PORT > 65535) ? 3001 : PORT;

console.log(`\n🌐 Starting HTTP server...`);
console.log(`   Preferred port: ${finalPort} ${process.env.PORT && !isNaN(PORT) && PORT >= 1 && PORT <= 65535 ? '(from env)' : '(default)'}`);
console.log(`   Fallback ports: ${finalPort + 1}, ${finalPort + 2}`);
console.log(`   Binding host: 0.0.0.0 (allows localhost + network interfaces)`);
console.log(`   Max attempts: 3 ports\n`);

// Bind server to port with automatic fallback
bindServerToPort(httpServer, finalPort, 3)
  .then((boundPort: number) => {
    console.log('\n' + '='.repeat(70));
    console.log('✅ SERVER STARTED SUCCESSFULLY');
    console.log('='.repeat(70));

    if (boundPort !== finalPort) {
      console.log(`\n⚠️  Port ${finalPort} was in use, using port ${boundPort} instead`);
      console.log(`   Update your frontend NEXT_PUBLIC_API_URL if needed:`);
      console.log(`   NEXT_PUBLIC_API_URL=http://localhost:${boundPort}`);
    } else {
      console.log(`\n✅ Using preferred port ${finalPort}`);
    }

    console.log(`\n🚀 API Server is now listening:`);
    console.log(`   Local:    http://localhost:${boundPort}`);
    console.log(`   Network:  http://0.0.0.0:${boundPort}`);
    console.log(`   Health:   http://localhost:${boundPort}/api/healthz`);
    console.log(`\n📡 Available endpoints:`);
    console.log(`   GET  /api/healthz - Health check`);
    console.log(`   GET  /health - Legacy health check`);
    console.log(`   GET  / - API info`);
    console.log('\n' + '='.repeat(70) + '\n');

    // Initialize AI Companion (non-blocking)
    initializeAICompanion()
      .then(() => console.log('✅ AI Companion initialized'))
      .catch((error) => {
        console.error(
          '❌ Failed to initialize AI Companion:',
          error instanceof Error ? error.message : error
        );
      });

    // Test database connection (non-blocking)
    if (prisma) {
      prisma.$connect()
        .then(() => console.log('✅ Database connection successful'))
        .catch((error) => {
          console.warn('⚠️  Database connection failed (server will continue):', error.message);
        });
    } else {
      console.warn('⚠️  DATABASE_URL not set - database features will not be available');
    }

    // Seed feed items on startup (if database available) - non-blocking
    import('./feed/repository.js')
      .then(({ seedFeedItems }) => seedFeedItems())
      .catch((error) => {
        console.warn('[Startup] Could not seed feed items:', error);
      });

    // Start feed ingestion cron job - non-blocking
    import('./feed/cron.js')
      .then(({ startFeedCron }) => startFeedCron())
      .catch((error) => {
        console.warn('[Startup] Could not start feed ingestion cron:', error);
      });
  })
  .catch((error: NodeJS.ErrnoException & { triedPorts?: number[] }) => {
    console.error('\n' + '='.repeat(70));
    console.error('❌ FAILED TO START SERVER');
    console.error('='.repeat(70));

    if (error.code === 'EADDRINUSE_ALL' && error.triedPorts) {
      console.error(`\n⚠️  All ports are in use!`);
      console.error(`   Tried ports: ${error.triedPorts.join(', ')}`);
      console.error(`\n💡 Solutions:`);
      console.error(`   1. Stop processes using these ports:`);
      error.triedPorts.forEach(port => {
        console.error(`      - Port ${port}: Get-NetTCPConnection -LocalPort ${port} | Select-Object OwningProcess`);
      });
      console.error(`\n   2. Kill processes using these ports:`);
      error.triedPorts.forEach(port => {
        console.error(`      - Port ${port}: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -Force`);
      });
      console.error(`\n   3. Set a different PORT in .env file:`);
      console.error(`      PORT=4001`);
      console.error(`\n   4. Check what's using the ports:`);
      console.error(`      netstat -ano | Select-String ":3001|:3002|:3003"`);
    } else {
      console.error(`\n❌ Error: ${error.message}`);
      if (error.stack) {
        console.error(`\nStack trace:`);
        console.error(error.stack);
      }
    }

    console.error('\n' + '='.repeat(70) + '\n');
    process.exit(1);
  });
