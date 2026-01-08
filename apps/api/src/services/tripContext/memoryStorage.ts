// In-memory trip context storage for MVP
// Context is lost on server restart

import { z } from 'zod';

// TripContext schema with Zod validation
export const TripContextSchema = z.object({
  destination: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  travelers: z.number().int().positive().optional(),
  budgetRange: z.string().optional(),
  interests: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type TripContext = z.infer<typeof TripContextSchema>;

interface TripContextRecord {
  data: TripContext;
  updatedAt: Date;
}

// Map: roomId -> { data, updatedAt }
const tripContexts = new Map<string, TripContextRecord>();

// Get trip context for a room
export function getTripContext(roomId: string): TripContextRecord | null {
  return tripContexts.get(roomId) || null;
}

// Upsert trip context for a room
export function upsertTripContext(roomId: string, data: TripContext): TripContextRecord {
  // Validate with Zod
  const validatedData = TripContextSchema.parse(data);
  
  const record: TripContextRecord = {
    data: validatedData,
    updatedAt: new Date(),
  };
  
  tripContexts.set(roomId, record);
  
  return record;
}

// Delete trip context (optional utility)
export function deleteTripContext(roomId: string): boolean {
  return tripContexts.delete(roomId);
}

// Get all room IDs with context (optional utility)
export function getAllRoomIds(): string[] {
  return Array.from(tripContexts.keys());
}

