import { StreamChat } from 'stream-chat';

const STREAM_API_KEY = process.env.STREAM_API_KEY || 't42e5mmyf6zb';
const STREAM_SECRET = process.env.STREAM_SECRET || 'mqxzqa2yxmdb26kwsn457bagtk6k97ykz33vvmhdzeu6am6jwttzqnwxzhe5ckqx';

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

