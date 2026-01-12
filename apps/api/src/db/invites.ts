import { prisma } from './client.js';
import crypto from 'crypto';

export async function createInviteLink(
  roomId: string,
  expiresAt?: Date
): Promise<{ token: string; inviteUrl: string }> {
  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');

  // Create invite link in DB
  await prisma.inviteLink.create({
    data: {
      token,
      roomId,
      expiresAt,
    },
  });

  // Construct invite URL (assuming web app runs on localhost:3000)
  const baseUrl = process.env.WEB_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}?invite=${token}`;

  return { token, inviteUrl };
}

export async function getInviteLinkByToken(
  token: string
): Promise<{ roomId: string } | null> {
  const inviteLink = await prisma.inviteLink.findUnique({
    where: { token },
    select: { roomId: true, expiresAt: true },
  });

  if (!inviteLink) {
    return null;
  }

  // Check if expired
  if (inviteLink.expiresAt && inviteLink.expiresAt < new Date()) {
    return null;
  }

  return { roomId: inviteLink.roomId };
}

