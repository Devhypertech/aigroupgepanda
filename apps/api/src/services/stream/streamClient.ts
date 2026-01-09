import { StreamChat } from 'stream-chat';

// These are validated at startup in index.ts, so they should always be defined here
// Using non-null assertion since validation happens before this module is used
const STREAM_API_KEY = process.env.STREAM_API_KEY!;
const STREAM_SECRET = process.env.STREAM_API_SECRET!;

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
    console.log('✅ AI Companion user initialized');
  } catch (error) {
    console.error('❌ Error initializing AI Companion:', error);
  }
}
