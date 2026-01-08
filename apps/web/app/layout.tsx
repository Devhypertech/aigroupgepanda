import type { Metadata } from 'next';
import './globals.css';
// Import Stream Chat React CSS - required for proper styling
import 'stream-chat-react/dist/css/v2/index.css';

export const metadata: Metadata = {
  title: 'Gepanda AI Group Chat',
  description: 'AI-powered group chat for travelers',
};

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

