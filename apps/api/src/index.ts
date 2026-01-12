// Load .env - dotenv/config will look in current working directory (apps/api) or project root
import 'dotenv/config';

// Validate required environment variables
const requiredEnvVars = {
  STREAM_API_KEY: process.env.STREAM_API_KEY,
  STREAM_API_SECRET: process.env.STREAM_API_SECRET,
  ZHIPU_API_KEY: process.env.ZHIPU_API_KEY,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(key => console.error(`   - ${key}`));
  console.error('\nPlease set these environment variables before starting the server.');
  console.error('For local development, create a .env file in apps/api/ with:');
  console.error('  STREAM_API_KEY=your_key');
  console.error('  STREAM_API_SECRET=your_secret');
  console.error('  ZHIPU_API_KEY=your_key');
  console.error('  DATABASE_URL=your_database_url (optional for basic functionality)');
  process.exit(1);
}

// Log environment variable status
console.log('✅ Environment Variables Status:');
console.log(`   STREAM_API_KEY: ${requiredEnvVars.STREAM_API_KEY ? '✓ Loaded' : '✗ Missing'}`);
console.log(`   STREAM_API_SECRET: ${requiredEnvVars.STREAM_API_SECRET ? '✓ Loaded' : '✗ Missing'}`);
console.log(`   ZHIPU_API_KEY: ${requiredEnvVars.ZHIPU_API_KEY ? '✓ Loaded' : '✗ Missing'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Loaded' : '⚠️  Not set (some features may not work)'}`);

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { prisma } from './db/client';
import roomsRouter from './routes/rooms';
import invitesRouter from './routes/invites';
import streamRouter from './routes/stream';
import aiRouter from './routes/ai';
import { initializeAICompanion } from './services/stream/streamClient';
import { setupStreamWebhooks } from './services/stream/webhooks';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    'https://aigroupgepanda-api.vercel.app',
  ],
  credentials: true,
}));

app.use(express.json());

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    message: 'Gepanda AI Group Chat API',
    version: '0.1.0',
    status: 'running',
    chatProvider: 'Stream Chat',
    aiModel: 'Zhipu GLM-4.6 Flash',
        endpoints: {
          stream: {
            'POST /api/stream/token': 'Generate Stream Chat token for a user',
            'POST /api/stream/channel': 'Create or get channel and add user as member',
            'POST /api/stream/webhook': 'Stream Chat webhook endpoint (for AI responses)',
          },
      ai: {
        'POST /api/ai/reply': 'Generate and post AI reply to Stream channel',
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

// API routes
app.use('/api/rooms', roomsRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/stream', streamRouter);
app.use('/api/ai', aiRouter);

// Setup Stream Chat webhooks
setupStreamWebhooks(app);

// Parse PORT from environment, default to 3001 for local development
const PORT = parseInt(process.env.PORT || '3001', 10);

if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`❌ Invalid PORT value: ${process.env.PORT}. Must be a number between 1 and 65535.`);
  process.exit(1);
}

// Ensure only ONE server listener - use httpServer.listen, not app.listen
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Server running on 0.0.0.0:${PORT}`);
  console.log(`📡 API base: /`);

  // Initialize AI Companion
  try {
    await initializeAICompanion();
    console.log('✅ AI Companion initialized');
  } catch (error) {
    console.error(
      '❌ Failed to initialize AI Companion:',
      error instanceof Error ? error.message : error
    );
  }

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
});
