import { StreamChat } from 'stream-chat';

const STREAM_API_KEY = process.env.STREAM_API_KEY;
const STREAM_SECRET = process.env.STREAM_SECRET;

if (!STREAM_API_KEY || !STREAM_SECRET) {
  throw new Error('STREAM_API_KEY and STREAM_SECRET environment variables are required');
}

// Server-side Stream Chat client (uses secret key)
export const streamServerClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_SECRET);

// AI Companion user ID
export const AI_COMPANION_USER_ID = 'gepanda-ai';

// Initialize AI Companion user
export async function initializeAICompanion() {
  try {
    // Upsert the AI Companion user
    await streamServerClient.upsertUser({
      id: AI_COMPANION_USER_ID,
      name: 'GePanda AI',
      role: 'admin',
    });
    console.log('AI Companion user initialized');
  } catch (error) {
    console.error('Error initializing AI Companion:', error);
  }
}

