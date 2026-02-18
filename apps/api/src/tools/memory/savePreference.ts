/**
 * Tool: memory.savePreference
 * Saves user preferences (Phase 2 stub)
 */

import type { ToolResult } from '../../agent/types.js';

export async function savePreference(
  input: {
    userId: string;
    key: string;
    value: any;
  },
  context?: any
): Promise<ToolResult> {
  try {
    // TODO: Phase 2 - Implement preference storage
    // Would integrate with database or memory storage
    
    return {
      success: true,
      data: { saved: true },
      userMessage: "I've saved your preference!",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      userMessage: "I'm having trouble saving that right now.",
    };
  }
}

