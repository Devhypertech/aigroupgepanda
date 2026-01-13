import type { Metadata } from 'next';
import './globals.css';
// Import Stream Chat React CSS - required for proper styling
import 'stream-chat-react/dist/css/v2/index.css';

export const metadata: Metadata = {
  title: 'Gepanda AI Group Chat',
  description: 'AI-powered group chat for travelers',
};

// Runtime config check for NEXT_PUBLIC environment variables
if (typeof window === 'undefined') {
  // Server-side only - log during build/startup
  const nextPublicVars = {
    NEXT_PUBLIC_STREAM_API_KEY: process.env.NEXT_PUBLIC_STREAM_API_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  };
  
  console.log('🔍 NEXT_PUBLIC Environment Variables Status:');
  Object.entries(nextPublicVars).forEach(([key, value]) => {
    if (value) {
      console.log(`   ✓ ${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    } else {
      console.log(`   ✗ ${key}: NOT SET`);
    }
  });
  
  if (!nextPublicVars.NEXT_PUBLIC_STREAM_API_KEY) {
    console.warn('⚠️  NEXT_PUBLIC_STREAM_API_KEY is not set. Chat functionality will not work.');
  }
  if (!nextPublicVars.NEXT_PUBLIC_API_URL) {
    console.warn('⚠️  NEXT_PUBLIC_API_URL is not set. Defaulting to http://localhost:3001');
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: '100%', backgroundColor: '#0a0a0a' }}>
      <body style={{ height: '100%', margin: 0, padding: 0, backgroundColor: '#0a0a0a' }}>{children}</body>
    </html>
  );
}

