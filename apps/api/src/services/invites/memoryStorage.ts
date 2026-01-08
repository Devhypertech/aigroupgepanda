// In-memory invite token storage for MVP
// Tokens are lost on server restart

interface InviteToken {
  roomId: string;
  createdAt: number;
}

// Map: token -> { roomId, createdAt }
const inviteTokens = new Map<string, InviteToken>();

import crypto from 'crypto';

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create an invite token
export function createInviteToken(roomId: string): { token: string; inviteUrl: string } {
  const token = generateToken();
  const baseUrl = process.env.WEB_URL || 'http://localhost:3002';
  const inviteUrl = `${baseUrl}?invite=${token}`;

  inviteTokens.set(token, {
    roomId,
    createdAt: Date.now(),
  });

  return { token, inviteUrl };
}

// Get roomId from token
export function getRoomIdFromToken(token: string): string | null {
  const invite = inviteTokens.get(token);
  return invite ? invite.roomId : null;
}

// Optional: Clean up old tokens (can be called periodically)
export function cleanupOldTokens(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [token, invite] of inviteTokens.entries()) {
    if (now - invite.createdAt > maxAge) {
      inviteTokens.delete(token);
    }
  }
}

