import { Router } from 'express';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client.js';
import { streamServerClient } from '../services/stream/streamClient.js';

const router = Router();

// JWT secret (use env var in production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days

// Validation schemas
const upsertUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/signup
 * Create new user with email/password
 * Body: { name?, email, password }
 * Returns: { ok: true, user: { id, name, email } }
 * 
 * Note: This endpoint only accepts POST requests. Use curl or a REST client to test.
 */
router.post('/signup', async (req, res) => {
  try {
    // Validate input
    const validationResult = signupSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { email, password, name } = validationResult.data;

    if (!prisma) {
      const isDev = process.env.NODE_ENV === 'development';
      return res.status(503).json({
        error: 'Database not available',
        message: isDev 
          ? 'DATABASE_URL is not set or PrismaClient failed to initialize. Check your .env file and ensure the database is running.'
          : 'Database service is temporarily unavailable. Please try again later.',
        ...(isDev && { 
          hint: 'Make sure DATABASE_URL is set in apps/api/.env and run: npx prisma migrate dev' 
        }),
      });
    }

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email },
      });
    } catch (dbError) {
      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
      console.error('[Auth] Database error during signup:', dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      return res.status(503).json({
        error: 'Database error',
        message: isDev 
          ? `Database query failed: ${errorMessage}`
          : 'Database service is temporarily unavailable. Please try again later.',
        ...(isDev && { 
          details: errorMessage,
          hint: 'Check database connection: GET /db/health',
          troubleshooting: [
            '1. Verify DATABASE_URL is set in apps/api/.env',
            '2. Check if PostgreSQL is running: psql -U postgres -d gepanda',
            '3. Test connection: curl http://localhost:3001/db/health',
            '4. Run migrations: cd apps/api && npx prisma migrate dev --schema=../../prisma/schema.prisma'
          ]
        }),
      });
    }

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'An account with this email already exists. Please sign in instead.',
      });
    }

    // Hash password with bcryptjs
    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(password, saltRounds);

    // Create user
    // Note: Run `npx prisma generate` after schema changes to update Prisma client
    let user;
    try {
      user = await (prisma as any).user.create({
        data: {
          email,
          passwordHash,
          name: name || null,
        },
      });
    } catch (dbError) {
      const isDev = process.env.NODE_ENV === 'development';
      console.error('[Auth] Database error creating user:', dbError);
      
      // Check if it's a unique constraint violation (duplicate email)
      if (dbError instanceof Error && dbError.message.includes('Unique constraint')) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists. Please sign in instead.',
        });
      }
      
      return res.status(503).json({
        error: 'Database error',
        message: isDev 
          ? `Failed to create user: ${dbError instanceof Error ? dbError.message : String(dbError)}`
          : 'Failed to create account. Please try again later.',
        ...(isDev && { 
          details: dbError instanceof Error ? dbError.message : String(dbError),
          hint: 'Check database connection: GET /db/health' 
        }),
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set httpOnly cookie
    res.cookie('gp_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Ensure user exists in Stream Chat
    try {
      await streamServerClient.upsertUser({
        id: user.id,
        name: user.name || email.split('@')[0],
        image: user.image || undefined,
      });
    } catch (streamError) {
      console.warn('[Auth] Stream Chat upsert failed (non-critical):', streamError);
    }

    // Return response in required format
    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[Auth] Error signing up:', error);
    res.status(500).json({
      error: 'Failed to create account',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user with email/password
 * Body: { email, password }
 * Returns: { user: { id, email, name } }
 */
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { email, password } = validationResult.data;

    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Find user
    const user = await (prisma as any).user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // Check if user has a passwordHash (OAuth users won't have one)
    if (!user.passwordHash) {
      return res.status(401).json({
        error: 'Invalid login method',
        message: 'This account was created with Google. Please sign in with Google instead.',
      });
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set httpOnly cookie
    res.cookie('gp_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('[Auth] Error logging in:', error);
    res.status(500).json({
      error: 'Failed to authenticate',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user from session cookie
 * Returns: { user: { id, email, name } } or 401 if not authenticated
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies['gp_session'] as string | undefined;

    if (!token) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'No session found',
      });
    }

    // Verify JWT token
    let decoded: { userId: string; email: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid session',
        message: 'Session expired or invalid',
      });
    }

    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        imageUrl: user.image || undefined,
      },
    });
  } catch (error) {
    console.error('[Auth] Error fetching current user:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /auth/upsert
 * Upsert user in database and Stream Chat
 * Called after successful OAuth authentication
 * 
 * Body: { email, name?, imageUrl? }
 * Returns: { userId }
 */
router.post('/upsert', async (req, res) => {
  try {
    // Validate input
    const validationResult = upsertUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { email, name, imageUrl } = validationResult.data;

    // Generate userId from email (consistent across sessions)
    // Use email as base, but make it URL-safe
    const userId = `user_${email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

    let user;
    
    if (prisma) {
      try {
        // Upsert user in database
        // Note: Run `npx prisma generate` after schema changes to update Prisma client
        user = await (prisma as any).user.upsert({
          where: { email },
          update: {
            name: name || undefined,
            image: imageUrl || undefined,
          },
          create: {
            email,
            name: name || null,
            image: imageUrl || null,
            passwordHash: null, // OAuth users don't have passwords
          },
        });
      } catch (dbError) {
        console.error('[Auth] Database error:', dbError);
        // Continue to Stream upsert even if DB fails
      }
    }

    // Ensure user exists in Stream Chat
    try {
      await streamServerClient.upsertUser({
        id: userId,
        name: name || email.split('@')[0], // Fallback to email username if no name
        image: imageUrl || undefined,
      });
    } catch (streamError) {
      console.error('[Auth] Stream Chat error:', streamError);
      // If Stream fails, still return success if DB worked
      if (!prisma || !user) {
        throw streamError;
      }
    }

    res.json({
      userId,
    });
  } catch (error) {
    console.error('[Auth] Error upserting user:', error);
    res.status(500).json({
      error: 'Failed to upsert user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/signup
 * Helper endpoint to show signup endpoint info (for browser testing)
 */
router.get('/signup', (req, res) => {
  res.status(405).json({
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST requests',
    endpoint: 'POST /api/auth/signup',
    example: {
      method: 'POST',
      url: 'http://localhost:3001/api/auth/signup',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: 'user@example.com',
        password: 'password123',
        name: 'John Doe (optional)'
      }
    },
    curl: 'curl -X POST http://localhost:3001/api/auth/signup -H "Content-Type: application/json" -d \'{"email":"user@example.com","password":"password123"}\''
  });
});

/**
 * GET /api/auth/ping
 * Dev-only endpoint for sanity checking auth routes
 * Returns: { ok: true }
 */
router.get('/ping', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ ok: true });
});

export default router;
