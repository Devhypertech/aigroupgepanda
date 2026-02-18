import type { Metadata } from 'next';
import './globals.css';
// Import Stream Chat React CSS - required for proper styling
import 'stream-chat-react/dist/css/v2/index.css';
import { Providers } from './providers';

import { getPublicConfig } from '../lib/config';

export const metadata: Metadata = {
  title: 'GePanda - AI Travel Companion',
  description: 'AI-powered travel companion for personalized recommendations',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="h-full m-0 p-0 bg-gp-bg text-gp-text overflow-x-hidden antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
