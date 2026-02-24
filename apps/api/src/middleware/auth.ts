/**
 * Authentication Middleware
 * Handles both authenticated users (NextAuth) and guest users (cookie-based)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { randomUUID } from 'crypto';

export interface CurrentUser {
  id: string;
  type: 'user' | 'guest';
  name: string;
  email?: string; // Required for real users, optional for guests
  imageUrl?: string;
}

/**
 * Get current user from request
 * Priority:
 * 1. JWT session cookie (gp_session) - email/password auth
 * 2. NextAuth session (real user)
 * 3. Guest cookie (guest user)
 * 4. Create new guest user + set cookie
 */
export async function getCurrentUser(
  req: Request,
  res: Response
): Promise<CurrentUser | null> {
  // Check for JWT session cookie (email/password auth)
  const jwtToken = req.cookies['gp_session'] as string | undefined;
  
  if (jwtToken) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
      
      const decoded = jwt.verify(jwtToken, JWT_SECRET) as { userId: string; email: string };
      
      if (prisma && decoded.userId) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });
        
          if (user) {
            return {
              id: user.id,
              type: 'user',
              name: user.name || 'User',
              email: user.email,
              imageUrl: user.image || undefined,
            };
          }
      }
    } catch (error) {
      // JWT invalid or expired, continue to other auth methods
      console.warn('[Auth] JWT token invalid:', error);
    }
  }

  // Check for NextAuth session (real user)
  // Note: In a real implementation, you'd verify the session token
  // For now, we'll check for a session token in headers or cookies
  const sessionToken = req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies['next-auth.session-token'] ||
    req.cookies['__Secure-next-auth.session-token'];

  // If session exists, try to get real user
  // In production, you'd verify the session token with NextAuth
  // For MVP, we'll check if userId is provided in headers (from frontend session)
  const headerUserId = req.headers['x-user-id'] as string | undefined;
  
  if (headerUserId) {
    if (!headerUserId.startsWith('guest_')) {
      // Real user - fetch from database
      if (prisma) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: headerUserId },
          });
          
          if (user) {
            return {
              id: user.id,
              type: 'user',
              name: user.name || 'User',
              email: user.email,
              imageUrl: user.image || undefined,
            };
          }
        } catch (error) {
          console.warn('[Auth] Error fetching user:', error);
        }
      }
    } else {
      // Guest user from header - use it (create if doesn't exist)
      if (prisma) {
        try {
          let guest = await (prisma as any).guestUser.findUnique({
            where: { id: headerUserId },
          });
          
          if (!guest) {
            // Create guest user with the ID from frontend
            guest = await (prisma as any).guestUser.create({
              data: {
                id: headerUserId,
                name: 'Guest User',
              },
            });
          }
          
          // Set cookie to match
          res.cookie('gp_guest_id', guest.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
          });
          
          return {
            id: guest.id,
            type: 'guest',
            name: guest.name || 'Guest User',
          };
        } catch (error) {
          console.warn('[Auth] Error handling guest user from header:', error);
          // Fall through to cookie-based guest auth
        }
      }
    }
  }

  // Check for guest cookie
  const guestId = req.cookies['gp_guest_id'] as string | undefined;
  
  if (guestId) {
    // Validate guest user exists
    if (prisma) {
      try {
        const guest = await (prisma as any).guestUser.findUnique({
          where: { id: guestId },
        });
        
        if (guest) {
          return {
            id: guest.id,
            type: 'guest',
            name: guest.name || 'Guest User',
          };
        }
      } catch (error) {
        console.warn('[Auth] Error fetching guest user:', error);
        // Guest doesn't exist, create new one
      }
    }
  }

  // Create new guest user
  if (!prisma) {
    // No database - return null or create a temporary guest ID
    const tempGuestId = `guest_${randomUUID()}`;
    return {
      id: tempGuestId,
      type: 'guest',
      name: 'Guest User',
    };
  }

  try {
    const newGuest = await (prisma as any).guestUser.create({
      data: {
        id: `guest_${randomUUID()}`,
        name: 'Guest User',
      },
    });

    // Set httpOnly cookie
    res.cookie('gp_guest_id', newGuest.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    return {
      id: newGuest.id,
      type: 'guest',
      name: newGuest.name || 'Guest User',
    };
  } catch (error) {
    console.error('[Auth] Error creating guest user:', error);
    return null;
  }
}

/**
 * Middleware to attach current user to request
 */
export function attachCurrentUser() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getCurrentUser(req, res);
    (req as any).currentUser = user;
    next();
  };
}

