/**
 * Interests API Routes
 * Manage user interests for feed personalization
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { getCurrentUser } from '../middleware/auth.js';
import { seedInterests } from './interestsSeed.js';

const router = Router();

const SetInterestsSchema = z.object({
  interestIds: z.array(z.string()).min(5, 'Please select at least 5 interests'),
});

/**
 * GET /api/interests
 * Get all available interests grouped by category
 */
router.get('/', async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Note: Run `npx prisma generate` after schema changes to update Prisma client
    const interests = await (prisma as any).interest.findMany({
      orderBy: [
        { group: 'asc' },
        { label: 'asc' },
      ],
    });

    // Group by category
    const grouped = interests.reduce((acc, interest) => {
      if (!acc[interest.group]) {
        acc[interest.group] = [];
      }
      acc[interest.group].push({
        id: interest.id,
        slug: interest.slug,
        label: interest.label,
        group: interest.group,
      });
      return acc;
    }, {} as Record<string, typeof interests>);

    res.json({
      interests: grouped,
      all: interests.map(i => ({
        id: i.id,
        slug: i.slug,
        label: i.label,
        group: i.group,
      })),
    });
  } catch (error) {
    console.error('[Interests] Error fetching interests:', error);
    res.status(500).json({
      error: 'Failed to fetch interests',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/me/interests
 * Get current user's selected interests
 * Requires userId in query or X-User-Id header (dev bypass allowed)
 */
router.get('/me/interests', async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Get current user (real or guest)
    const currentUser = await getCurrentUser(req, res);
    
    if (!currentUser) {
      return res.json({ interestIds: [], interests: [] });
    }
    
    let userId = currentUser.id;

    // If guest user, find their User record by email
    if (currentUser.type === 'guest') {
      const guestEmailId = userId.startsWith('guest_') ? userId.replace('guest_', '') : userId;
      const guestEmail = `guest_${guestEmailId}@gepanda.local`;
      
      const user = await (prisma as any).user.findUnique({
        where: { email: guestEmail },
      });
      
      if (user) {
        userId = user.id; // Use the User's ID
      } else {
        // Guest user hasn't set interests yet, return empty
        return res.json({ interestIds: [], interests: [] });
      }
    }

    const userInterests = await (prisma as any).userInterest.findMany({
      where: { userId },
      include: {
        interest: true,
      },
    });

    res.json({
      interestIds: userInterests.map(ui => ui.interestId),
      interests: userInterests.map(ui => ({
        id: ui.interest.id,
        slug: ui.interest.slug,
        label: ui.interest.label,
        group: ui.interest.group,
      })),
    });
  } catch (error) {
    console.error('[Interests] Error fetching user interests:', error);
    res.status(500).json({
      error: 'Failed to fetch user interests',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/users/me/interests
 * Set user's interests (replaces all existing)
 * Requires userId in body or X-User-Id header (dev bypass allowed)
 */
router.post('/me/interests', async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        error: 'Database not available',
      });
    }

    // Get current user (real or guest)
    const currentUser = await getCurrentUser(req, res);
    
    if (!currentUser) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }
    
    let userId = currentUser.id;

    // If guest user, ensure they have a User record (required for UserInterest foreign key)
    if (currentUser.type === 'guest') {
      // Generate consistent email for guest user based on their guest ID
      // Email format: guest_{guestId}@gepanda.local
      const guestEmailId = userId.startsWith('guest_') ? userId.replace('guest_', '') : userId;
      const guestEmail = `guest_${guestEmailId}@gepanda.local`;
      
      // Upsert User record for guest (use email as the consistent identifier)
      try {
        const user = await (prisma as any).user.upsert({
          where: { email: guestEmail },
          update: {
            name: currentUser.name || 'Guest User',
          },
          create: {
            email: guestEmail,
            name: currentUser.name || 'Guest User',
            passwordHash: null, // Guest users don't have passwords
          },
        });
        userId = user.id; // Use the User's ID (which may be different from guest ID)
        console.log(`[Interests] Ensured User record for guest: guestId=${currentUser.id}, userId=${userId}, email=${guestEmail}`);
      } catch (upsertError: any) {
        console.error('[Interests] Error upserting User for guest:', upsertError);
        return res.status(500).json({
          error: 'Failed to set up user account',
          message: 'Could not create user record for guest account',
          details: upsertError.message,
        });
      }
    } else {
      // For real users, verify the User record exists
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User account not found in database',
        });
      }
    }

    // Validate request body
    const validationResult = SetInterestsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.issues,
      });
    }

    const { interestIds } = validationResult.data;

    // Verify all interest IDs exist
    const interests = await (prisma as any).interest.findMany({
      where: {
        id: { in: interestIds },
      },
    });

    if (interests.length !== interestIds.length) {
      return res.status(400).json({
        error: 'Some interest IDs are invalid',
      });
    }

    // Use transaction to replace all interests
    await prisma.$transaction(async (tx: any) => {
      // Delete existing interests
      await tx.userInterest.deleteMany({
        where: { userId: userId! },
      });

      // Create new interests
      if (interestIds.length > 0) {
        await tx.userInterest.createMany({
          data: interestIds.map((interestId: string) => ({
            userId: userId!,
            interestId,
          })),
        });
      }
    });

    res.json({
      success: true,
      message: 'Interests updated successfully',
      interestIds,
    });
  } catch (error) {
    console.error('[Interests] Error setting user interests:', error);
    res.status(500).json({
      error: 'Failed to set user interests',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/interests/seed
 * Seed interests into the database (dev only or with ALLOW_INTERESTS_SEED env var)
 */
router.post('/seed', async (req, res) => {
  // Allow seeding in development or with explicit flag
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const allowSeed = process.env.ALLOW_INTERESTS_SEED === 'true';

  if (!isDev && !allowSeed) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Interest seeding is only allowed in development mode or when ALLOW_INTERESTS_SEED=true',
    });
  }

  if (!prisma) {
    return res.status(503).json({
      error: 'Database not available',
    });
  }

  try {
    await seedInterests(prisma);
    res.json({
      success: true,
      message: 'Interests seeded successfully',
    });
  } catch (error) {
    console.error('[Interests] Error seeding interests:', error);
    res.status(500).json({
      error: 'Failed to seed interests',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

