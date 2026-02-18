import { StreamChat } from 'stream-chat';

// Lazy initialization to ensure environment variables are loaded before client creation
let _streamServerClient: StreamChat | null = null;

function getStreamServerClient(): StreamChat {
  if (_streamServerClient) {
    return _streamServerClient;
  }

  const STREAM_API_KEY = process.env.STREAM_API_KEY;
  const STREAM_SECRET = process.env.STREAM_API_SECRET;

  if (!STREAM_API_KEY || !STREAM_SECRET) {
    throw new Error('STREAM_API_KEY and STREAM_API_SECRET must be set in environment variables');
  }

  // Validate that secret is actually set (not empty string)
  if (STREAM_SECRET.trim() === '') {
    throw new Error('STREAM_API_SECRET cannot be empty');
  }

  // Server-side Stream Chat client (uses secret key)
  // Use new StreamChat() instead of getInstance() to ensure secret is properly set
  // getInstance() can return a singleton that was created without the secret
  _streamServerClient = new StreamChat(STREAM_API_KEY, STREAM_SECRET);

  // Verify the client has the secret set
  if (!(_streamServerClient as any).secret) {
    console.error('[StreamClient] WARNING: Stream client does not have secret set!');
    console.error('[StreamClient] API Key:', STREAM_API_KEY ? `${STREAM_API_KEY.substring(0, 10)}...` : 'MISSING');
    console.error('[StreamClient] Secret:', STREAM_SECRET ? `${STREAM_SECRET.substring(0, 10)}...` : 'MISSING');
  } else {
    console.log('[StreamClient] Stream client initialized successfully');
  }

  return _streamServerClient;
}

// Export proxy that initializes on first access (after dotenv loads)
export const streamServerClient = new Proxy({} as StreamChat, {
  get(_target, prop) {
    const client = getStreamServerClient();
    const value = (client as any)[prop];
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(_target, prop, value) {
    (getStreamServerClient() as any)[prop] = value;
    return true;
  },
});

// AI Companion user ID
export const AI_COMPANION_USER_ID = 'gepanda_ai';

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
