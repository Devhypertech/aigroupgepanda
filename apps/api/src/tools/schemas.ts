/**
 * Tool schemas - define input/output structure for each tool
 * Used for validation and LLM function calling
 */

import { z } from 'zod';

/**
 * Base tool schema structure
 */
export interface ToolSchema {
  name: string;
  description: string;
  category: 'travel' | 'connectivity' | 'stream' | 'memory' | 'notification';
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
}

/**
 * Travel Planning Tool Schema
 */
export const travelPlanTripSchema: ToolSchema = {
  name: 'travel.planTrip',
  description: 'Plan a trip with destination, dates, travelers, and preferences',
  category: 'travel',
  inputSchema: z.object({
    destination: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    travelers: z.number().int().positive().optional(),
    budget: z.string().optional(),
    interests: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      destination: z.string(),
      dates: z.object({
        start: z.string(),
        end: z.string(),
      }),
      travelers: z.number(),
      budget: z.string().optional(),
      interests: z.array(z.string()).optional(),
    }).optional(),
    userMessage: z.string().optional(),
    error: z.string().optional(),
  }),
};

/**
 * Flight Tracking Tool Schema
 */
export const travelFlightStatusSchema: ToolSchema = {
  name: 'travel.flightStatus',
  description: 'Check flight status, delays, and airport information',
  category: 'travel',
  inputSchema: z.object({
    flightNumber: z.string().optional(),
    airline: z.string().optional(),
    departure: z.string().optional(),
    arrival: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      flightNumber: z.string().optional(),
      airline: z.string().optional(),
      status: z.enum(['scheduled', 'delayed', 'cancelled', 'boarding', 'departed', 'arrived']),
      departure: z.object({
        airport: z.string(),
        time: z.string(),
        gate: z.string().optional(),
      }).optional(),
      arrival: z.object({
        airport: z.string(),
        time: z.string(),
        gate: z.string().optional(),
      }).optional(),
    }).optional(),
    userMessage: z.string().optional(),
    error: z.string().optional(),
  }),
};

/**
 * eSIM Purchase Tool Schema
 */
export const connectivityEsimPurchaseSchema: ToolSchema = {
  name: 'connectivity.purchaseEsim',
  description: 'Purchase an eSIM plan for a destination',
  category: 'connectivity',
  inputSchema: z.object({
    destination: z.string(),
    duration: z.number().int().positive(),
    dataAmount: z.number().positive(), // GB
    planId: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      checkoutUrl: z.string(),
      planId: z.string(),
      destination: z.string(),
      duration: z.number(),
      dataAmount: z.number(),
      price: z.string(),
    }).optional(),
    userMessage: z.string().optional(),
    error: z.string().optional(),
  }),
};

/**
 * Messaging Tool Schema (GetStream)
 */
export const streamSendMessageSchema: ToolSchema = {
  name: 'stream.sendMessage',
  description: 'Send a message to a Stream chat channel',
  category: 'stream',
  inputSchema: z.object({
    channelId: z.string(),
    text: z.string().min(1),
    userId: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      messageId: z.string(),
      channelId: z.string(),
      sentAt: z.string(),
    }).optional(),
    userMessage: z.string().optional(),
    error: z.string().optional(),
  }),
};

/**
 * Memory Storage Tool Schema
 */
export const memorySaveSchema: ToolSchema = {
  name: 'memory.save',
  description: 'Save user preferences or context to memory',
  category: 'memory',
  inputSchema: z.object({
    userId: z.string(),
    key: z.string(),
    value: z.any(),
    type: z.enum(['preference', 'context', 'trip']).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      saved: z.boolean(),
      key: z.string(),
    }).optional(),
    userMessage: z.string().optional(),
    error: z.string().optional(),
  }),
};

/**
 * Memory Retrieval Tool Schema
 */
export const memoryLoadSchema: ToolSchema = {
  name: 'memory.load',
  description: 'Load user preferences or context from memory',
  category: 'memory',
  inputSchema: z.object({
    userId: z.string(),
    key: z.string().optional(),
    type: z.enum(['preference', 'context', 'trip']).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any().optional(),
    userMessage: z.string().optional(),
    error: z.string().optional(),
  }),
};

/**
 * Notification Tool Schema
 */
export const notificationSendSchema: ToolSchema = {
  name: 'notification.send',
  description: 'Send a notification to the user',
  category: 'notification',
  inputSchema: z.object({
    userId: z.string(),
    type: z.enum(['reminder', 'alert', 'update', 'info']),
    title: z.string(),
    message: z.string(),
    channelId: z.string().optional(),
    scheduledAt: z.string().optional(), // ISO timestamp
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.object({
      notificationId: z.string(),
      sentAt: z.string(),
    }).optional(),
    userMessage: z.string().optional(),
    error: z.string().optional(),
  }),
};

/**
 * All tool schemas registry
 */
export const toolSchemas: Record<string, ToolSchema> = {
  'travel.planTrip': travelPlanTripSchema,
  'travel.flightStatus': travelFlightStatusSchema,
  'connectivity.purchaseEsim': connectivityEsimPurchaseSchema,
  'stream.sendMessage': streamSendMessageSchema,
  'memory.save': memorySaveSchema,
  'memory.load': memoryLoadSchema,
  'notification.send': notificationSendSchema,
};

/**
 * Get tool schema by name
 */
export function getToolSchema(toolName: string): ToolSchema | null {
  return toolSchemas[toolName] || null;
}

/**
 * Validate tool input against schema
 */
export function validateToolInput(toolName: string, input: any): { valid: boolean; data?: any; error?: string } {
  const schema = getToolSchema(toolName);
  if (!schema) {
    return { valid: false, error: `Tool schema not found: ${toolName}` };
  }

  try {
    const validated = schema.inputSchema.parse(input);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }
    return { valid: false, error: 'Validation error' };
  }
}

