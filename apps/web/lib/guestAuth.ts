/**
 * Guest User Authentication Helper
 * Handles guest user ID management using localStorage
 */

const GUEST_USER_ID_KEY = 'gepanda_guest_userId';

/**
 * Generate a unique guest user ID
 */
function generateGuestUserId(): string {
  // Use crypto.randomUUID if available, otherwise fallback to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `guest_${crypto.randomUUID()}`;
  }
  // Fallback for older browsers
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get or create guest user ID from localStorage
 * Creates a new guest ID if one doesn't exist
 */
export function getOrCreateGuestUserId(): string {
  if (typeof window === 'undefined') {
    // Server-side: return a temporary ID (shouldn't be used)
    return `guest_temp_${Date.now()}`;
  }

  try {
    // Try to get existing guest ID from localStorage
    const existingId = localStorage.getItem(GUEST_USER_ID_KEY);
    if (existingId && existingId.startsWith('guest_')) {
      return existingId;
    }

    // Create new guest ID
    const newGuestId = generateGuestUserId();
    localStorage.setItem(GUEST_USER_ID_KEY, newGuestId);
    console.log('[GuestAuth] Created new guest userId:', newGuestId);
    return newGuestId;
  } catch (error) {
    // localStorage might be disabled or full
    console.warn('[GuestAuth] Failed to access localStorage, using temporary ID:', error);
    return `guest_temp_${Date.now()}`;
  }
}

/**
 * Get guest user ID from localStorage (returns null if not found)
 * Use getOrCreateGuestUserId() if you want to create one automatically
 */
export function getGuestUserId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const guestId = localStorage.getItem(GUEST_USER_ID_KEY);
    return guestId && guestId.startsWith('guest_') ? guestId : null;
  } catch (error) {
    console.warn('[GuestAuth] Failed to read from localStorage:', error);
    return null;
  }
}

/**
 * Check if current user is a guest
 */
export function isGuestUser(userId: string | undefined | null): boolean {
  if (!userId) return true;
  return userId.startsWith('guest_');
}

/**
 * Clear guest user ID from localStorage
 */
export function clearGuestUserId(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(GUEST_USER_ID_KEY);
  } catch (error) {
    console.warn('[GuestAuth] Failed to clear localStorage:', error);
  }
}

