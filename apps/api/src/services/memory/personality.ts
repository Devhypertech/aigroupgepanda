/**
 * Personality System - Defines AI companion behavior and tone
 */

import type { LongTermMemory, ShortTermMemory } from './types.js';

/**
 * Personality traits
 */
export interface PersonalityTraits {
  proactivity: number; // 0-1, how proactive the AI is
  formality: number; // 0-1, how formal the language is
  enthusiasm: number; // 0-1, how enthusiastic responses are
  helpfulness: number; // 0-1, how helpful and detailed responses are
}

/**
 * Get personality traits based on user memory
 */
export function getPersonalityTraits(memory: LongTermMemory): PersonalityTraits {
  // Base personality (friendly, helpful, moderately proactive)
  let traits: PersonalityTraits = {
    proactivity: 0.6,
    formality: 0.2,
    enthusiasm: 0.7,
    helpfulness: 0.8,
  };
  
  // Adjust based on interaction history
  const totalConversations = memory.metadata.totalConversations || 0;
  
  // More proactive with returning users
  if (totalConversations > 5) {
    traits.proactivity = Math.min(0.8, traits.proactivity + 0.1);
  }
  
  // Less formal with frequent users
  if (totalConversations > 10) {
    traits.formality = Math.max(0.1, traits.formality - 0.1);
  }
  
  return traits;
}

/**
 * Determine if AI should be proactive in this context
 */
export function shouldBeProactive(
  longTerm: LongTermMemory,
  shortTerm: ShortTermMemory,
  traits: PersonalityTraits
): boolean {
  // Don't be proactive if user just sent a message
  if (shortTerm.recentMessages.length > 0) {
    const lastMessage = shortTerm.recentMessages[shortTerm.recentMessages.length - 1];
    if (lastMessage.role === 'user') {
      return false; // Wait for user response
    }
  }
  
  // Be proactive if:
  // 1. User has upcoming trips
  const upcomingTrips = longTerm.trips.filter(t => 
    t.status === 'upcoming' && new Date(t.startDate) > new Date()
  );
  if (upcomingTrips.length > 0) {
    const daysUntilTrip = Math.floor(
      (new Date(upcomingTrips[0].startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    // Proactive 3 days before trip
    if (daysUntilTrip <= 3 && daysUntilTrip > 0) {
      return Math.random() < traits.proactivity;
    }
  }
  
  // 2. User hasn't interacted in a while (24+ hours)
  if (longTerm.metadata.lastInteraction) {
    const hoursSinceLastInteraction = 
      (Date.now() - new Date(longTerm.metadata.lastInteraction).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastInteraction > 24) {
      return Math.random() < traits.proactivity * 0.5; // Less proactive for old conversations
    }
  }
  
  // 3. Conversation is idle (no messages in 5+ minutes)
  if (shortTerm.recentMessages.length > 0) {
    const lastActivity = new Date(shortTerm.lastActivity);
    const minutesSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60);
    if (minutesSinceLastActivity > 5 && minutesSinceLastActivity < 30) {
      return Math.random() < traits.proactivity * 0.3; // Low proactivity for idle chats
    }
  }
  
  return false;
}

/**
 * Generate proactive message based on context
 */
export function generateProactiveMessage(
  longTerm: LongTermMemory,
  shortTerm: ShortTermMemory,
  traits: PersonalityTraits
): string | null {
  if (!shouldBeProactive(longTerm, shortTerm, traits)) {
    return null;
  }
  
  // Check for upcoming trips
  const upcomingTrips = longTerm.trips.filter(t => 
    t.status === 'upcoming' && new Date(t.startDate) > new Date()
  );
  
  if (upcomingTrips.length > 0) {
    const trip = upcomingTrips[0];
    const daysUntil = Math.floor(
      (new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntil === 3) {
      return `Your trip to ${trip.destination} is coming up in 3 days! Need help with any last-minute planning?`;
    } else if (daysUntil === 1) {
      return `Excited for your trip to ${trip.destination} tomorrow! Want me to check your flight status or help with anything?`;
    } else if (daysUntil === 0) {
      return `Safe travels to ${trip.destination} today! Let me know if you need anything while you're there.`;
    }
  }
  
  // Check for incomplete trip planning
  if (shortTerm.activeTrip) {
    const { destination, startDate, endDate } = shortTerm.activeTrip;
    if (destination && !startDate) {
      return `I noticed you're planning a trip to ${destination}. When are you thinking of going?`;
    } else if (destination && startDate && !endDate) {
      return `For your trip to ${destination}, how many days are you planning to stay?`;
    }
  }
  
  // Check for saved preferences that could be used
  if (longTerm.preferences.seatPreference && shortTerm.recentMessages.length === 0) {
    return `I remember you prefer ${longTerm.preferences.seatPreference} seats. Planning a new trip?`;
  }
  
  return null;
}

/**
 * Format response with personality
 */
export function formatWithPersonality(
  baseResponse: string,
  traits: PersonalityTraits,
  context?: { isFirstInteraction?: boolean; userMood?: 'positive' | 'neutral' | 'negative' }
): string {
  let response = baseResponse;
  
  // Adjust enthusiasm
  if (traits.enthusiasm > 0.7 && !response.includes('!')) {
    // Add enthusiasm to positive responses
    if (response.toLowerCase().includes('great') || response.toLowerCase().includes('wonderful')) {
      response = response.replace(/\.$/, '!');
    }
  }
  
  // Adjust formality
  if (traits.formality < 0.3) {
    // More casual
    response = response.replace(/I would like to/g, "I'd like to");
    response = response.replace(/I will/g, "I'll");
  }
  
  // First interaction greeting
  if (context?.isFirstInteraction) {
    response = `Hi! ${response}`;
  }
  
  return response;
}

/**
 * Never reveal internal actions - sanitize responses
 */
export function sanitizeResponse(response: string): string {
  // Remove any mentions of internal tools, functions, or technical details
  const patterns = [
    /\[Tool:.*?\]/gi,
    /\[Function:.*?\]/gi,
    /\[Memory:.*?\]/gi,
    /calling.*?function/gi,
    /executing.*?tool/gi,
    /loading.*?memory/gi,
    /querying.*?database/gi,
  ];
  
  let sanitized = response;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Remove multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

