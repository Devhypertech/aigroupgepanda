/**
 * Centralized configuration utility for environment variables.
 * 
 * Uses lazy evaluation (functions) to avoid build-time crashes and ensure
 * environment variables are only accessed when needed at runtime, not at module scope.
 * 
 * NEXT_PUBLIC_* variables are replaced by Next.js at build time, but accessing them
 * at module scope can interfere with static generation. These functions ensure
 * lazy evaluation.
 */

/**
 * Public configuration (NEXT_PUBLIC_* variables)
 * Safe to use in client components - these are embedded at build time.
 * 
 * Uses lazy evaluation to avoid module-scope access that could break static generation.
 * 
 * @returns Configuration object with public environment variables
 */
export function getPublicConfig() {
  // Lazy evaluation - process.env is only accessed when this function is called
  // This prevents build-time crashes and allows static generation to work
  return {
    streamApiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY || undefined,
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  };
}

/**
 * Server-only configuration
 * Only use in Server Components or API routes.
 * 
 * @returns Configuration object with server-side environment variables
 */
export function getServerConfig() {
  // Only accessible on server - will be undefined in client
  if (typeof window !== 'undefined') {
    throw new Error('getServerConfig() can only be called on the server');
  }
  
  return {
    // Add any server-only env vars here in the future
    // Example: databaseUrl: process.env.DATABASE_URL,
  };
}

/**
 * Check if required public config is available
 * Returns a user-friendly message if missing, null if all good
 * 
 * @returns Error message string if config is invalid, null if valid
 */
export function validatePublicConfig(): string | null {
  const config = getPublicConfig();
  
  if (!config.streamApiKey) {
    return 'NEXT_PUBLIC_STREAM_API_KEY is not configured. Please set it in your environment variables.';
  }
  
  return null;
}

