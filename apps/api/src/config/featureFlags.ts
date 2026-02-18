/**
 * Feature Flags Configuration
 * Centralized feature flag management for PRD compliance
 */

/**
 * PRD Strict Mode - When enabled:
 * - Disables video/voice calling
 * - Disables group chat invites
 * - Ensures AI-only channels (user + bot only)
 * - Removes human-to-human messaging
 */
export const PRD_STRICT_MODE = process.env.PRD_STRICT_MODE === 'true';

/**
 * Check if a feature is enabled based on PRD strict mode
 */
export function isFeatureEnabled(feature: 'calls' | 'invites' | 'groupChannels' | 'humanMessaging'): boolean {
  if (PRD_STRICT_MODE) {
    // In strict mode, all these features are disabled
    return false;
  }
  
  // In non-strict mode, check individual feature flags
  switch (feature) {
    case 'calls':
      return process.env.ENABLE_CALLS !== 'false';
    case 'invites':
      return process.env.ENABLE_INVITES !== 'false';
    case 'groupChannels':
      return process.env.ENABLE_GROUP_CHANNELS !== 'false';
    case 'humanMessaging':
      return process.env.ENABLE_HUMAN_MESSAGING !== 'false';
    default:
      return true;
  }
}

/**
 * Get error message for disabled feature
 */
export function getDisabledFeatureMessage(feature: string): string {
  if (PRD_STRICT_MODE) {
    return `${feature} is not available in PRD strict mode`;
  }
  return `${feature} is currently disabled`;
}

