import { Router } from 'express';
import { streamServerClient } from '../services/stream/streamClient';

const router = Router();

// POST /api/stream/token - Generate Stream Chat token for a user
router.post('/token', async (req, res) => {
  try {
    console.log('[Backend] Token request received:', { userId: req.body.userId, username: req.body.username });
    const { userId, username } = req.body;

    if (!userId || !username) {
      console.error('[Backend] Missing userId or username');
      return res.status(400).json({ error: 'userId and username are required' });
    }

    console.log('[Backend] Upserting user in Stream...');
    // Create or update user in Stream
    await streamServerClient.upsertUser({
      id: userId,
      name: username,
    });
    console.log('[Backend] User upserted successfully');

    console.log('[Backend] Generating token...');
    // Generate token for the user
    const token = streamServerClient.createToken(userId);
    console.log('[Backend] Token generated successfully');

    res.json({ token, userId });
  } catch (error) {
    console.error('[Backend] Error generating Stream token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/stream/channel - Create or get channel and add user as member
router.post('/channel', async (req, res) => {
  try {
    const { channelId, userId } = req.body;

    if (!channelId || !userId) {
      return res.status(400).json({ error: 'channelId and userId are required' });
    }

    const channelType = 'messaging';
    // Initialize channel with created_by_id in the options
    const channel = streamServerClient.channel(channelType, channelId, {
      created_by_id: userId,
    });

    console.log(`[Backend] Setting up channel ${channelId} for user ${userId}`);

    // Create or get channel - Stream's create() is idempotent
    // If channel exists, it will return it; if not, it will create it
    try {
      console.log(`[Backend] Creating/getting channel ${channelId}...`);
      await Promise.race([
        channel.create(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Create timeout')), 15000))
      ]);
      console.log(`[Backend] Channel ${channelId} ready`);
    } catch (createError: any) {
      console.error('[Backend] Create error:', {
        message: createError.message,
        code: createError.code,
        status: createError.status,
      });
      
      // If creation fails, channel might already exist - try to watch it instead
      // This will work if the user has access
      try {
        console.log(`[Backend] Create failed, trying to watch channel ${channelId}...`);
        await Promise.race([
          channel.watch(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Watch timeout')), 10000))
        ]);
        console.log(`[Backend] Channel ${channelId} exists and is accessible`);
      } catch (watchError: any) {
        console.error('[Backend] Watch also failed:', {
          message: watchError.message,
          code: watchError.code,
          status: watchError.status,
        });
        return res.status(500).json({ 
          error: 'Failed to access or create channel',
          message: createError.message || 'Unknown error',
          details: {
            createError: createError.message,
            watchError: watchError.message,
          }
        });
      }
    }

    // Add user as a member (idempotent - won't error if already a member)
    try {
      await Promise.race([
        channel.addMembers([userId]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Add member timeout')), 5000))
      ]);
      console.log(`[Backend] User ${userId} added to channel ${channelId}`);
    } catch (error: any) {
      // If user is already a member, that's fine
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('already a member') || errorMsg.includes('already member')) {
        console.log(`[Backend] User ${userId} already a member of channel ${channelId}`);
      } else if (errorMsg.includes('timeout')) {
        console.warn('[Backend] Add member timed out, but continuing...');
        // Don't throw - channel might still be accessible
      } else {
        console.warn('[Backend] Error adding member:', error.message);
        // Don't throw - channel might still be accessible
      }
    }

    res.json({ 
      success: true, 
      channelId,
      message: 'Channel ready' 
    });
  } catch (error: any) {
    console.error('Error creating/getting channel:', error);
    res.status(500).json({ 
      error: 'Failed to create/get channel',
      message: error.message || 'Unknown error'
    });
  }
});

export default router;

