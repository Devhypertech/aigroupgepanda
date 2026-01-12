import { prisma } from './client.js';

export async function getTripContext(roomId: string) {
  const context = await prisma.tripContext.findUnique({
    where: { roomId },
    select: {
      data: true,
      updatedAt: true,
    },
  });

  return context;
}

export async function upsertTripContext(roomId: string, data: any) {
  // Validate JSON data
  try {
    JSON.stringify(data);
  } catch (error) {
    throw new Error('Invalid JSON data');
  }

  const context = await prisma.tripContext.upsert({
    where: { roomId },
    update: {
      data,
    },
    create: {
      roomId,
      data,
    },
  });

  return context;
}

