/**
 * Admin Middleware
 * Protects admin-only endpoints by checking if user email is in ADMIN_EMAILS
 */

import { Request, Response, NextFunction } from 'express';
import { getCurrentUser } from './auth.js';

/**
 * Middleware to check if current user is an admin
 * Requires user to be authenticated and email to be in ADMIN_EMAILS env var
 */
export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get current user
      const currentUser = await getCurrentUser(req, res);
      
      if (!currentUser) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource',
        });
      }

      // Check if user is a real user (not guest)
      if (currentUser.type === 'guest') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Guest users cannot access admin resources',
        });
      }

      // Check if user has an email (required for admin check)
      if (!currentUser.email) {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'User email is required for admin access',
        });
      }

      // Get admin emails from environment
      const adminEmails = process.env.ADMIN_EMAILS;
      
      if (!adminEmails) {
        console.warn('[Admin] ADMIN_EMAILS not set - admin access disabled');
        return res.status(503).json({
          error: 'Admin access not configured',
          message: 'ADMIN_EMAILS environment variable is not set',
        });
      }

      // Parse comma-separated admin emails
      const adminEmailList = adminEmails
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(email => email.length > 0);

      // Check if user's email is in admin list
      const userEmail = currentUser.email?.toLowerCase();
      
      if (!userEmail || !adminEmailList.includes(userEmail)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        });
      }

      // User is admin - proceed
      next();
    } catch (error) {
      console.error('[Admin] Error checking admin access:', error);
      res.status(500).json({
        error: 'Failed to verify admin access',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

