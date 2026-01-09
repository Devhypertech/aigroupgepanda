import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client - will fail gracefully if DATABASE_URL is missing when used
// This allows the server to start even without a database connection
// Note: PrismaClient requires a DATABASE_URL, but we'll let it fail at runtime if not set
// rather than using a placeholder that could cause confusion
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

