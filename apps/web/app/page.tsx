'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect based on auth status
  useEffect(() => {
    if (status === 'loading') return;
    
    // Check if there's a redirect parameter from auth
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      
      if (next) {
        router.replace(next);
        return;
      }
    }
    
    // If logged in, redirect to feed; otherwise redirect to login
    if (session) {
      router.replace('/feed');
        } else {
      router.replace('/login');
    }
  }, [status, session, router]);

    return (
    <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      background: 'var(--gp-bg)',
    }}>
      <div style={{ color: 'var(--gp-text)' }}>Redirecting...</div>
    </div>
  );
}
