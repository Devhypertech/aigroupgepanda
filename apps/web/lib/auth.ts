import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import { prisma } from './prisma';

// Get API URL from environment
// Prefer server-only API_URL when available, fall back to public URL for simplicity.
const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

/**
 * IMPORTANT:
 * Do NOT export authOptions from route.ts in App Router.
 * Next.js route files must only export GET/POST handlers.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Use Prisma directly to find user
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            throw new Error('Invalid email or password');
          }

          // Check if user has a passwordHash (OAuth users won't have one)
          if (!user.passwordHash) {
            throw new Error('This account was created with Google. Please sign in with Google instead.');
          }

          // Verify password using bcryptjs
          const isPasswordValid = await bcryptjs.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            throw new Error('Invalid email or password');
          }

          // Return user object for NextAuth session
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image || undefined,
          };
        } catch (error) {
          console.error('[NextAuth] Credentials authorize error:', error);
          // Re-throw to show error message to user
          throw error;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      },
    },
  },
  callbacks: {
    async signIn({ user, account }: any) {
      // After successful Google OAuth, upsert user in API database
      if (account?.provider === 'google' && user.email && user.name) {
        try {
          const response = await fetch(`${API_URL}/auth/upsert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              imageUrl: user.image || undefined,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[NextAuth] Failed to upsert user:', {
              status: response.status,
              statusText: response.statusText,
              url: `${API_URL}/auth/upsert`,
              error: errorText,
            });
            return false; // Prevent sign-in if upsert fails
          }

          const data = await response.json();

          // Store userId in user object for session
          (user as any).id = data.userId;
        } catch (error) {
          console.error('[NextAuth] Error upserting user:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            url: `${API_URL}/auth/upsert`,
            stack: error instanceof Error ? error.stack : undefined,
          });
          return false; // Prevent sign-in on error
        }
      }
      return true;
    },
    async jwt({ token, user }: any) {
      // Initial sign in
      if (user) {
        token.userId = (user as any).id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }: any) {
      // Send properties to the client
      if (session.user) {
        (session.user as any).id = token.userId as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      // If URL is a callback URL, preserve it
      if (url.startsWith(baseUrl)) {
        // Check if it's a callback URL with next parameter
        try {
          const urlObj = new URL(url);
          const nextParam = urlObj.searchParams.get('next');
          if (nextParam) {
            return `${baseUrl}${nextParam}`;
          }
        } catch (e) {
          // If URL parsing fails, continue with default behavior
        }
        return url;
      }

      // Default redirect to /feed
      // Note: The feed page will check for interests and redirect to onboarding if needed
      return `${baseUrl}/feed`;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

/**
 * NextAuth Client Helper
 * Provides typed client-side authentication utilities
 */

import { getSession, signIn, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';

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
export async function signInWithGoogle(callbackUrl: string = '/') {
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

