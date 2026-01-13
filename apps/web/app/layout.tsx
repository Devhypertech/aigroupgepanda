import type { Metadata } from 'next';
import './globals.css';
// Import Stream Chat React CSS - required for proper styling
import 'stream-chat-react/dist/css/v2/index.css';

import { getPublicConfig } from '../lib/config';

export const metadata: Metadata = {
  title: 'Gepanda AI Group Chat',
  description: 'AI-powered group chat for travelers',
};

// Lazy function to log config status - only called when needed, not at module scope
function logConfigStatus() {
  if (typeof window === 'undefined') {
    // Server-side only - log during build/startup
    const config = getPublicConfig();
    
    console.log('🔍 NEXT_PUBLIC Environment Variables Status:');
    console.log(`   ${config.streamApiKey ? '✓' : '✗'} NEXT_PUBLIC_STREAM_API_KEY: ${config.streamApiKey ? `${config.streamApiKey.substring(0, 20)}...` : 'NOT SET'}`);
    console.log(`   ${config.apiUrl ? '✓' : '✗'} NEXT_PUBLIC_API_URL: ${config.apiUrl || 'NOT SET'}`);
    
    if (!config.streamApiKey) {
      console.warn('⚠️  NEXT_PUBLIC_STREAM_API_KEY is not set. Chat functionality will not work.');
    }
    if (!config.apiUrl || config.apiUrl === 'http://localhost:3001') {
      console.warn('⚠️  NEXT_PUBLIC_API_URL is not set. Defaulting to http://localhost:3001');
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Call log function lazily inside component (runs on server during render)
  logConfigStatus();
  
  return (
    <html lang="en" style={{ height: '100%', backgroundColor: '#0a0a0a' }}>
      <body style={{ height: '100%', margin: 0, padding: 0, backgroundColor: '#0a0a0a' }}>{children}</body>
    </html>
  );
}

