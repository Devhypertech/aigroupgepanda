/**
 * Stream Channel Helpers
 * Utilities for creating and managing AI-only channels
 * 
 * Rules:
 * - One channel per user: ai_user_<userId>
 * - Only two members allowed: userId and AI_COMPANION_USER_ID
 * - Any attempt to add other members is blocked
 */

import { streamServerClient, AI_COMPANION_USER_ID } from './streamClient.js';
import { validateAndEnforceAiOnlyMembership } from './channelValidator.js';

export interface ChannelInfo {
  channelId: string;
  channelType: string;
  members: string[];
}

/**
 * Get or create an AI-only channel for a user
 * Channel ID format: ai_user_<userId>
 * Members: [userId, AI_COMPANION_USER_ID] only
 */
export async function getOrCreateAiChannel(userId: string): Promise<ChannelInfo> {
  const channelType = 'messaging';
  const channelId = `ai_user_${userId}`;
  
  const channel = streamServerClient.channel(channelType, channelId, {
    created_by_id: userId,
  });

  try {
    // Try to watch (channel exists)
    await channel.watch();
  } catch (error: any) {
    // Channel doesn't exist, create it with only user + bot
    await channel.create();
    // Add members after creation
    await channel.addMembers([userId, AI_COMPANION_USER_ID]);
  }

  // Ensure both user and AI are members (only these two)
  const allowedMembers = new Set([userId, AI_COMPANION_USER_ID]);
  
  try {
    // Add user and AI if not already members
    await channel.addMembers([userId, AI_COMPANION_USER_ID]);
  } catch (error: any) {
    // Ignore "already a member" errors
    const errorMsg = error.message?.toLowerCase() || '';
    if (!errorMsg.includes('already a member') && !errorMsg.includes('already member')) {
      throw error;
    }
  }

  // ALWAYS enforce AI-only membership (removes any invalid members)
  await validateAndEnforceAiOnlyMembership(channelId, userId);

  // Re-query after cleanup to get final member list
  const finalState = await channel.query({});
  const finalMembers = Object.keys(finalState.members || {});

  return {
    channelId,
    channelType,
    members: finalMembers.filter(m => allowedMembers.has(m)),
  };
}

/**
 * @deprecated Use getOrCreateAiChannel instead
 * Kept for backward compatibility
 */
export async function getOrCreateDmAiChannel(userId: string): Promise<ChannelInfo> {
  return getOrCreateAiChannel(userId);
}

/**
 * Create a new Group AI channel (multiple humans + AI bot)
 * @deprecated Group channels are not supported in AI-only mode
 */
export async function createGroupAiChannel(
  ownerId: string,
  title?: string
): Promise<ChannelInfo> {
  throw new Error('Group channels are not available - AI-only channels only');
}

/**
 * Add a user to an existing channel
 * @deprecated Adding members is not allowed in AI-only mode
 */
export async function addMember(channelId: string, userId: string): Promise<void> {
  throw new Error('Adding members to channels is not allowed - AI-only channels only');
}

/**
 * Get channel info
 */
export async function getChannelInfo(channelId: string): Promise<ChannelInfo | null> {
  const channelType = 'messaging';
  const channel = streamServerClient.channel(channelType, channelId);

  try {
    const state = await channel.query({});
    const members = Object.keys(state.members || {});
    
    return {
      channelId,
      channelType,
      members,
    };
  } catch (error) {
    console.error(`[ChannelHelpers] Error getting channel info for ${channelId}:`, error);
    return null;
  }
}

/**
 * Check if channel is AI-only (starts with "ai_user_")
 */
export function isAiOnlyChannel(channelId: string): boolean {
  return channelId.startsWith('ai_user_');
}

/**
 * @deprecated Use isAiOnlyChannel instead
 */
export function isDmAiChannel(channelId: string): boolean {
  return isAiOnlyChannel(channelId);
}

/**
 * @deprecated Group channels are not supported
 */
export function isGroupAiChannel(channelId: string): boolean {
  return false; // Group channels disabled
}
