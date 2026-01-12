import { Router } from 'express';
import { getRoomIdFromToken } from '../services/invites/memoryStorage.js';

const router = Router();

// GET /invites/:token
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.trim() === '') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const roomId = getRoomIdFromToken(token);

    if (!roomId) {
      return res.status(404).json({ error: 'Invalid or expired invite link' });
    }

    res.json({ roomId });
  } catch (error) {
    console.error('Error resolving invite token:', error);
    res.status(500).json({ error: 'Failed to resolve invite token' });
  }
});

export default router;

