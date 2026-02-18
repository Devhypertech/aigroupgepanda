/**
 * Channel Validator
 * Ensures channels are AI-only (user + bot only)
 * ALWAYS enforced, not just in PRD_STRICT_MODE
 */

import { streamServerClient, AI_COMPANION_USER_ID } from './streamClient.js';

/**
 * Validate that a channel only contains the user and AI bot
 * Returns true if valid, false if invalid members found
 */
export async function validateAiOnlyChannel(
  channelId: string,
  userId: string
): Promise<{ valid: boolean; invalidMembers?: string[] }> {
  try {
    const channelType = 'messaging';
    const channel = streamServerClient.channel(channelType, channelId);
    const state = await channel.query({});
    const members = Object.keys(state.members || {});

    // Allowed members: user + AI bot only
    const allowedMembers = new Set([userId, AI_COMPANION_USER_ID]);
    const invalidMembers = members.filter(m => !allowedMembers.has(m));

    if (invalidMembers.length > 0) {
      console.warn(`[ChannelValidator] Channel ${channelId} has invalid members:`, invalidMembers);
      return { valid: false, invalidMembers };
    }

    return { valid: true };
  } catch (error) {
    console.error(`[ChannelValidator] Error validating channel ${channelId}:`, error);
    // On error, assume invalid to be safe
    return { valid: false };
  }
}

/**
 * Validate and enforce AI-only membership
 * Removes any invalid members (always enforced, not just in PRD_STRICT_MODE)
 */
export async function validateAndEnforceAiOnlyMembership(
  channelId: string,
  userId: string
): Promise<void> {
  const validation = await validateAiOnlyChannel(channelId, userId);
  
  if (!validation.valid && validation.invalidMembers && validation.invalidMembers.length > 0) {
    try {
      const channelType = 'messaging';
      const channel = streamServerClient.channel(channelType, channelId);
      await channel.removeMembers(validation.invalidMembers);
      console.log(`[ChannelValidator] Removed ${validation.invalidMembers.length} invalid members from channel ${channelId}`);
    } catch (error) {
      console.error(`[ChannelValidator] Failed to remove invalid members:`, error);
      throw error;
    }
  }
}

/**
 * Clean up invalid members from a channel (remove human-to-human messaging)
 * @deprecated Use validateAndEnforceAiOnlyMembership instead
 */
export async function cleanupChannelMembers(
  channelId: string,
  userId: string
): Promise<void> {
  await validateAndEnforceAiOnlyMembership(channelId, userId);
}

