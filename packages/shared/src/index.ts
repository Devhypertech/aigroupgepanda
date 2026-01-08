// Re-export socket event constants
export { SOCKET_EVENTS } from './socketEvents';

// Room template enum
export enum RoomTemplate {
  TRAVEL_PLANNING = 'TRAVEL_PLANNING',
  LIVE_TRIP = 'LIVE_TRIP',
  FLIGHT_TRACKING = 'FLIGHT_TRACKING',
  FOOD_DISCOVERY = 'FOOD_DISCOVERY',
  GENERAL = 'GENERAL',
}

// Message type
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  kind: 'USER' | 'AI';
  createdAt: number;
  editedAt?: number;
  deletedAt?: number;
  isDeleted?: boolean;
  reactions?: MessageReaction[];
}

// Join room payload
export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  username: string;
  roomTemplate?: RoomTemplate;
}

// Send message payload
export interface SendMessagePayload {
  roomId: string;
  userId: string;
  username: string;
  text: string;
}

// Room joined response
export interface RoomJoinedPayload {
  roomId: string;
  userId: string;
  username: string;
  messages: Message[];
}

// Message new payload (same as Message)
export type MessageNewPayload = Message;

// Room members payload
export interface RoomMembersPayload {
  roomId: string;
  members: Array<{
    userId: string;
    username: string;
    isOnline?: boolean;
  }>;
}

// Typing indicators
export interface TypingStartPayload {
  roomId: string;
  userId: string;
  username: string;
}

export interface TypingStopPayload {
  roomId: string;
  userId: string;
}

export interface TypingUsersPayload {
  roomId: string;
  users: Array<{
    userId: string;
    username: string;
  }>;
}

// Message editing/deletion
export interface EditMessagePayload {
  roomId: string;
  messageId: string;
  userId: string;
  newText: string;
}

export interface DeleteMessagePayload {
  roomId: string;
  messageId: string;
  userId: string;
}

export interface MessageUpdatedPayload {
  roomId: string;
  message: Message;
}

export interface MessageDeletedPayload {
  roomId: string;
  messageId: string;
}

// Load more messages
export interface LoadMoreMessagesPayload {
  roomId: string;
  beforeMessageId?: string;
  limit?: number;
}

export interface MessagesLoadedPayload {
  roomId: string;
  messages: Message[];
  hasMore: boolean;
}

// Message reactions
export interface MessageReaction {
  emoji: string;
  userId: string;
  username: string;
}

export interface AddReactionPayload {
  roomId: string;
  messageId: string;
  userId: string;
  username: string;
  emoji: string;
}

export interface RemoveReactionPayload {
  roomId: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export interface MessageReactionUpdatedPayload {
  roomId: string;
  messageId: string;
  reactions: MessageReaction[];
}

