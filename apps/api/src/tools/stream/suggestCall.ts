/**
 * Tool: stream.suggestCall
 * Suggests starting a call/video call
 */

import type { ToolResult } from '../../agent/types.js';
import { isFeatureEnabled, getDisabledFeatureMessage } from '../../config/featureFlags.js';

export async function suggestCall(
  input: {
    type?: 'audio' | 'video';
    reason?: string;
  },
  context?: any
): Promise<ToolResult> {
  // PRD Strict Mode: Disable calls
  if (!isFeatureEnabled('calls')) {
    return {
      success: false,
      error: getDisabledFeatureMessage('Calls'),
      userMessage: "I'm sorry, but calls are not available right now. I'm here to help via text chat!",
    };
  }

  try {
    const callType = input.type || 'audio';
    const suggestion = {
      type: callType,
      reason: input.reason || 'discuss travel plans',
    };

    return {
      success: true,
      data: suggestion,
      userMessage: callType === 'video'
        ? "That's a great idea! You can start a video call using the call button in the chat. Would you like me to guide you through it?"
        : "Sounds good! You can start a call using the call button in the chat. Let me know when you're ready!",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userMessage: "I'm having trouble with that right now. Please try using the call button directly in the chat.",
    };
  }
}

