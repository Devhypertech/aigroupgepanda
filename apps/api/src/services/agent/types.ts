/**
 * Agent types and interfaces
 */

export type Intent =
  | 'travel.plan'
  | 'travel.itinerary'
  | 'travel.destination'
  | 'travel.flight'
  | 'connectivity.esim'
  | 'connectivity.checkout'
  | 'stream.call'
  | 'stream.video'
  | 'general.chat'
  | 'unknown';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  userMessage?: string; // Natural language message for user
}

export interface ToolCall {
  tool: string;
  input: Record<string, any>;
  result?: ToolResult;
}

export interface AgentContext {
  userId: string;
  channelId: string;
  messageText: string;
  recentMessages?: Array<{
    text: string;
    userId: string;
    username: string;
    kind: 'USER' | 'AI';
  }>;
  tripContext?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
    budgetRange?: string;
    interests?: string[];
    notes?: string;
  };
}

export interface AgentResponse {
  text: string;
  toolCalls?: ToolCall[];
  intent: Intent;
}

