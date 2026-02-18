/**
 * Memory Types - Long-term and short-term memory structures
 */

/**
 * Long-term memory - Persistent user preferences and history
 */
export interface LongTermMemory {
  userId: string;
  
  // User preferences
  preferences: {
    seatPreference?: 'window' | 'aisle' | 'no-preference';
    travelStyle?: 'budget' | 'comfort' | 'luxury' | 'adventure';
    dietaryRestrictions?: string[];
    accessibilityNeeds?: string[];
    language?: string;
    currency?: string;
    timezone?: string;
    [key: string]: any; // Extensible for future preferences
  };
  
  // Trip history
  trips: Array<{
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    status: 'planned' | 'upcoming' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
  }>;
  
  // Conversation patterns
  patterns: {
    frequentlyAskedDestinations?: string[];
    commonInterests?: string[];
    preferredBookingMethods?: string[];
  };
  
  // Metadata
  metadata: {
    firstInteraction?: string;
    lastInteraction?: string;
    totalConversations?: number;
    averageTripDuration?: number;
  };
}

/**
 * Short-term memory - Current conversation context
 */
export interface ShortTermMemory {
  conversationId: string;
  userId: string;
  
  // Current conversation state
  currentTopic?: string;
  activeTrip?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
    budget?: string;
    interests?: string[];
  };
  
  // Recent messages for context
  recentMessages: Array<{
    role: 'user' | 'ai';
    text: string;
    timestamp: string;
  }>;
  
  // Pending actions
  pendingActions?: Array<{
    type: string;
    data: any;
    timestamp: string;
  }>;
  
  // Conversation metadata
  startedAt: string;
  lastActivity: string;
  messageCount: number;
}

/**
 * Memory update operation
 */
export interface MemoryUpdate {
  type: 'preference' | 'trip' | 'pattern' | 'metadata';
  key: string;
  value: any;
  timestamp: string;
}

/**
 * Memory query result
 */
export interface MemoryQueryResult {
  found: boolean;
  data?: any;
  context?: string; // How this memory should be used in conversation
}

