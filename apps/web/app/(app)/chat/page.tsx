'use client';

import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Load chat UI only on the client to avoid SSR/webpack errors (stream-chat, next-auth)
const ChatPageClient = dynamic(() => import('./ChatPageClient'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--gp-bg)',
        color: 'var(--gp-text)',
      }}
    >
      Loading chat...
    </div>
  ),
});

export default function ChatPage() {
  const searchParams = useSearchParams();
  const followUp = searchParams.get('followUp') || searchParams.get('message') || undefined;
  const sessionId = searchParams.get('sessionId') || undefined;
  return <ChatPageClient initialFollowUpMessage={followUp ? decodeURIComponent(followUp) : undefined} initialSessionId={sessionId || undefined} />;
}
