// Load .env - dotenv/config will look in current working directory (apps/api) or project root
import 'dotenv/config';

// Log API key status for debugging (without exposing key)
console.log('ZHIPU_API_KEY:', process.env.ZHIPU_API_KEY ? '✓ Loaded' : '✗ NOT FOUND');
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
  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002'],
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

const PORT = process.env.PORT || 3001;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

httpServer.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'DATABASE_URL set' : 'DATABASE_URL not set'}`);
  
  // Initialize AI Companion
  await initializeAICompanion();
  
  // Test database connection (non-blocking)
  prisma.$connect()
    .then(() => {
      console.log('Database connection successful');
    })
    .catch((error) => {
      console.warn('Database connection failed (server will continue):', error.message);
      console.warn('Note: Some features requiring database will not work until database is available');
    });
});

