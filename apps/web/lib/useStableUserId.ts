'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { getOrCreateGuestUserId } from './guestAuth';

/**
 * Returns a stable user identity for chat init: only set after status !== "loading".
 * - If authenticated: session userId (DO NOT swap to guest later).
 * - If unauthenticated: guestId from getOrCreateGuestUserId().
 * Identity only changes on real auth change (logout/login), not on session object reference changes.
 */
export function useStableUserId(): {
  stableUserId: string | null;
  username: string;
  isReady: boolean;
} {
  const { data: session, status } = useSession();
  const [stableUserId, setStableUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('Traveler');
  const lastCommittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    const sessionUserId = (session?.user as { id?: string })?.id;
    const newResolved = sessionUserId ?? getOrCreateGuestUserId();
    const newUsername = sessionUserId
      ? ((session?.user?.name as string) || 'Traveler')
      : 'Guest Traveler';

    if (lastCommittedRef.current !== newResolved) {
      lastCommittedRef.current = newResolved;
      setStableUserId(newResolved);
      setUsername(newUsername);
    }
  }, [status, session]);

  const isReady = status !== 'loading';
  return {
    stableUserId: isReady ? (stableUserId ?? lastCommittedRef.current) : null,
    username,
    isReady,
  };
}
