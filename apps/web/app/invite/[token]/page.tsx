'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Invite route - Disabled in PRD_STRICT_MODE
 * All invite functionality has been removed
 * This route now always redirects to /feed
 */
export default function InvitePage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to feed - invite links are disabled
    router.replace('/feed');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gp-bg)',
      color: 'var(--gp-text)',
    }}>
      <div>Redirecting...</div>
    </div>
  );
}
