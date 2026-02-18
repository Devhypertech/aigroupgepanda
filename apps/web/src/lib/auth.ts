/**
 * NextAuth Client Helper
 * Provides typed client-side authentication utilities
 */

import { getSession, signIn, signOut, Session } from 'next-auth/react';

export interface GePandaSession extends Session {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
}

/**
 * Get current session (client-side)
 */
export async function getAuthSession(): Promise<GePandaSession | null> {
  const session = await getSession();
  return session as GePandaSession | null;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(callbackUrl: string = '/chat') {
  await signIn('google', { callbackUrl });
}

/**
 * Sign out
 */
export async function signOutUser(callbackUrl: string = '/') {
  await signOut({ callbackUrl });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getAuthSession();
  return !!session;
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getAuthSession();
  return session?.user?.id || null;
}

