/**
 * Tool registry - maps intent to tool functions
 */

import type { Intent } from '../agent/types.js';
import * as travelTools from './travel/index.js';
import * as connectivityTools from './connectivity/index.js';
import * as streamTools from './stream/index.js';
import * as memoryTools from './memory/index.js';
import * as notificationTools from './notifications/index.js';

type ToolFunction = (input: any, context?: any) => Promise<any>;

const toolMap: Record<string, ToolFunction> = {
  'travel.planTrip': travelTools.planTrip,
  'travel.buildItinerary': travelTools.buildItinerary,
  'travel.destinationGuide': travelTools.destinationGuide,
  'travel.flightStatus': travelTools.flightStatus,
  'connectivity.recommendEsim': connectivityTools.recommendEsim,
  'connectivity.createCheckout': connectivityTools.createCheckout,
  'connectivity.purchaseEsim': connectivityTools.createCheckout, // Alias
  'stream.suggestCall': streamTools.suggestCall,
  'stream.createCall': streamTools.createCall,
  'stream.sendMessage': streamTools.suggestCall, // Placeholder - would use Stream API
  'memory.savePreference': memoryTools.savePreference,
  'memory.save': memoryTools.savePreference, // Alias
  'memory.loadContext': memoryTools.loadContext,
  'memory.load': memoryTools.loadContext, // Alias
  'notification.send': notificationTools.sendNotification,
};

/**
 * Maps intent to tool name
 */
export function intentToTool(intent: Intent): string | null {
  const mapping: Record<Intent, string | null> = {
    'travel.plan': 'travel.planTrip',
    'travel.itinerary': 'travel.buildItinerary',
    'travel.destination': 'travel.destinationGuide',
    'travel.flight': 'travel.flightStatus',
    'connectivity.esim': 'connectivity.recommendEsim',
    'connectivity.checkout': 'connectivity.createCheckout',
    'stream.call': 'stream.suggestCall',
    'stream.video': 'stream.suggestCall',
    'general.chat': null, // No tool needed
    'unknown': null,
  };

  return mapping[intent] || null;
}

/**
 * Get tool function by name
 */
export function getTool(toolName: string): ToolFunction | null {
  return toolMap[toolName] || null;
}

/**
 * Execute a tool
 */
export async function executeTool(
  toolName: string,
  input: Record<string, any>,
  context?: any
): Promise<any> {
  const tool = getTool(toolName);
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  return tool(input, context);
}

