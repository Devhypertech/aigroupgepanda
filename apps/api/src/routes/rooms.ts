import { Router } from 'express';
import { z } from 'zod';
import { createInviteToken } from '../services/invites/memoryStorage.js';
import { getTripContext, upsertTripContext, TripContextSchema } from '../services/tripContext/memoryStorage.js';
import { prisma } from '../db/client.js';

const router = Router();

// POST /api/rooms/:roomId/invite
router.post('/:roomId/invite', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Validate roomId is provided
    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Generate invite token and URL (in-memory storage)
    const { token, inviteUrl } = createInviteToken(roomId);

    res.json({ inviteToken: token, inviteUrl });
  } catch (error) {
    console.error('Error creating invite link:', error);
    res.status(500).json({ error: 'Failed to create invite link' });
  }
});

// GET /rooms/:roomId/context
router.get('/:roomId/context', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Validate roomId is provided
    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Get trip context from in-memory storage
    const context = getTripContext(roomId);

    if (!context) {
      return res.json({ data: null, updatedAt: null });
    }

    res.json({
      data: context.data,
      updatedAt: context.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error getting trip context:', error);
    res.status(500).json({ error: 'Failed to get trip context' });
  }
});

// PUT /rooms/:roomId/context
router.put('/:roomId/context', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { data } = req.body;

    // Validate roomId is provided
    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    if (data === undefined || data === null) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // Validate with Zod schema
    const validationResult = TripContextSchema.safeParse(data);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid trip context data',
        details: validationResult.error.issues,
      });
    }

    // Upsert trip context in in-memory storage
    const context = upsertTripContext(roomId, validationResult.data);

    res.json({
      data: context.data,
      updatedAt: context.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error updating trip context:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid trip context data',
        details: error.issues,
      });
    }
    res.status(500).json({ error: 'Failed to update trip context' });
  }
});

export default router;

