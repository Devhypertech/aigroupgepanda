import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Parse DATABASE_URL and extract connection info for logging
 */
function parseDatabaseUrl(url: string | undefined): { host?: string; database?: string; masked: string } | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const database = urlObj.pathname.replace('/', '');
    const masked = url.replace(/:[^:@]+@/, ':****@'); // Mask password
    
    return { host, database, masked };
  } catch (error) {
    return { masked: url.replace(/:[^:@]+@/, ':****@') };
  }
}

/**
 * Create Prisma client - will fail gracefully if DATABASE_URL is missing
 * PrismaClient constructor throws if DATABASE_URL is missing, so we wrap in try-catch
 * This allows the server to start even without a database connection
 */
function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.warn('⚠️  Failed to create PrismaClient (server will continue without database):', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export const prisma: PrismaClient | null =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

// Export helper to get database connection info
export function getDatabaseInfo() {
  return parseDatabaseUrl(process.env.DATABASE_URL);
}
