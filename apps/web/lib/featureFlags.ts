/**
 * Feature Flags Configuration (Client-side)
 * Centralized feature flag management for PRD compliance
 */

/**
 * PRD Strict Mode - When enabled:
 * - Hides video/voice calling UI
 * - Hides group chat invite UI
 * - Ensures AI-only chat experience
 */
export const PRD_STRICT_MODE = process.env.NEXT_PUBLIC_PRD_STRICT_MODE === 'true';

/**
 * Check if a feature is enabled based on PRD strict mode
 */
export function isFeatureEnabled(feature: 'calls' | 'invites' | 'groupChannels'): boolean {
  if (PRD_STRICT_MODE) {
    // In strict mode, all these features are disabled
    return false;
  }
  
  // In non-strict mode, check individual feature flags
  switch (feature) {
    case 'calls':
      return process.env.NEXT_PUBLIC_ENABLE_CALLS !== 'false';
    case 'invites':
      return process.env.NEXT_PUBLIC_ENABLE_INVITES !== 'false';
    case 'groupChannels':
      return process.env.NEXT_PUBLIC_ENABLE_GROUP_CHANNELS !== 'false';
    default:
      return true;
  }
}

