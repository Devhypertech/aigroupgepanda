import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client.js';
import { streamServerClient } from '../services/stream/streamClient.js';
import {
  getOrCreateDmAiChannel,
  createGroupAiChannel,
  addMember,
  isDmAiChannel,
  isGroupAiChannel,
} from '../services/stream/channelHelpers.js';
import { isFeatureEnabled, getDisabledFeatureMessage } from '../config/featureFlags.js';
import crypto from 'crypto';

const router = Router();

// Validation schemas
const createInviteSchema = z.object({
  sourceChannelId: z.string().min(1),
  userId: z.string().min(1),
  mode: z.enum(['dm_ai', 'group_ai']).optional(),
  maxUses: z.number().int().positive().optional().default(10),
  expiresInDays: z.number().int().positive().optional().default(7),
});

const redeemInviteSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
});

// Helper: Generate secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/invites - Create invite link (auth required via userId)
// If sourceChannelId is DM, creates a new group and generates invite for it
// If sourceChannelId is Group, generates invite for the same group
router.post('/', async (req, res) => {
  try {
    // Validate input
    const validationResult = createInviteSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { sourceChannelId, userId, mode, maxUses, expiresInDays } = validationResult.data;

    let targetChannelId: string;
    let inviteMode: string;

    // Determine if source channel is DM or Group
    if (isDmAiChannel(sourceChannelId)) {
      // DM invite: Create a new group channel and generate invite for it
      console.log('[Invites] Creating group from DM channel');
      const groupChannel = await createGroupAiChannel(userId);
      targetChannelId = groupChannel.channelId;
      inviteMode = 'group_ai';
    } else if (isGroupAiChannel(sourceChannelId)) {
      // Group invite: Use the same group channel
      console.log('[Invites] Creating invite for existing group channel');
      
      // Verify user has access to channel (is a member)
      const channelType = 'messaging';
      const channel = streamServerClient.channel(channelType, sourceChannelId);
      
      try {
        const channelState = await channel.query({});
        const members = channelState.members || {};
        const memberIds = Object.keys(members);
        
        if (!memberIds.includes(userId)) {
          return res.status(403).json({ 
            error: 'You must be a member of this channel to create invites' 
          });
        }
      } catch (error: any) {
        console.error('[Invites] Error checking channel membership:', error);
        return res.status(404).json({ 
          error: 'Channel not found or inaccessible' 
        });
      }

      targetChannelId = sourceChannelId;
      inviteMode = mode || 'group_ai';
    } else {
      // Unknown channel type, default to group
      targetChannelId = sourceChannelId;
      inviteMode = mode || 'group_ai';
    }

    // Generate token and calculate expiration
    const token = generateToken();
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create invite in database
    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const invite = await prisma.chatInvite.create({
      data: {
        token,
        channelId: targetChannelId,
        invitedById: userId,
        maxUses,
        expiresAt,
        mode: inviteMode,
      },
    });

    // Generate invite URL (frontend will construct full URL)
    const inviteUrl = `/invite/${token}`;

    res.json({
      success: true,
      inviteUrl,
      token,
      targetChannelId,
      mode: inviteMode,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
    });
  } catch (error) {
    console.error('[Invites] Error creating invite:', error);
    res.status(500).json({ 
      error: 'Failed to create invite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/invites/redeem - Redeem invite token (auth required via userId)
router.post('/redeem', async (req, res) => {
  try {
    // Validate input
    const validationResult = redeemInviteSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const { token, userId } = validationResult.data;

    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Find invite
    const invite = await prisma.chatInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite token' });
    }

    // Check if expired
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return res.status(400).json({ error: 'Invite link has expired' });
    }

    // Check if max uses reached
    if (invite.usedCount >= invite.maxUses) {
      return res.status(400).json({ error: 'Invite link has reached maximum uses' });
    }

    // Add user to Stream channel
    const channelType = 'messaging';
    const channel = streamServerClient.channel(channelType, invite.channelId);

    try {
      // Ensure channel exists
      try {
        await channel.watch();
      } catch (error: any) {
        // Channel might not exist, try to create it
        await channel.create();
      }

      // Add user as member (idempotent)
      await channel.addMembers([userId]);
      
      // Increment used count
      await prisma.chatInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });

      res.json({
        success: true,
        channelId: invite.channelId,
        message: 'Successfully joined channel',
      });
    } catch (error: any) {
      console.error('[Invites] Error adding user to channel:', error);
      
      // Check if user is already a member
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('already a member') || errorMsg.includes('already member')) {
        // Still increment count and return success
        await prisma.chatInvite.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } },
        });
        
        return res.json({
          success: true,
          channelId: invite.channelId,
          message: 'Already a member of this channel',
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('[Invites] Error redeeming invite:', error);
    res.status(500).json({ 
      error: 'Failed to redeem invite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/invites/:token - Legacy endpoint for room invites (keep for backward compatibility)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.trim() === '') {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Try to find as ChatInvite first
    if (prisma) {
      const chatInvite = await prisma.chatInvite.findUnique({
        where: { token },
      });

      if (chatInvite) {
        // Check if expired
        if (chatInvite.expiresAt && new Date() > chatInvite.expiresAt) {
          return res.status(404).json({ error: 'Invalid or expired invite link' });
        }

        // Check if max uses reached
        if (chatInvite.usedCount >= chatInvite.maxUses) {
          return res.status(404).json({ error: 'Invite link has reached maximum uses' });
        }

        return res.json({ 
          channelId: chatInvite.channelId,
          type: 'chat',
        });
      }
    }

    // Fallback to old room invite system
    const { getRoomIdFromToken } = await import('../services/invites/memoryStorage.js');
    const roomId = getRoomIdFromToken(token);

    if (!roomId) {
      return res.status(404).json({ error: 'Invalid or expired invite link' });
    }

    res.json({ roomId, type: 'room' });
  } catch (error) {
    console.error('Error resolving invite token:', error);
    res.status(500).json({ error: 'Failed to resolve invite token' });
  }
});

export default router;

