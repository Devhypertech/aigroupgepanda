/**
 * Chat Store with Zustand
 * Dedicated store for chat messages, trip planning, and panel state
 * Persists to sessionStorage for session-based state management
 * Hydration-safe for Next.js App Router
 * 
 * @example
 * // Basic usage
 * import { useChatStore } from '@/lib/chatStore';
 * 
 * function ChatComponent() {
 *   const messages = useChatStore((state) => state.messages);
 *   const addMessage = useChatStore((state) => state.addMessage);
 *   
 *   addMessage({ id: '1', role: 'user', content: 'Hello', createdAt: Date.now() });
 * }
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number; // Unix timestamp in milliseconds
  meta?: any; // Optional metadata (e.g., UI schema, streaming state)
}

export interface TripState {
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  travelStyle?: string[];
  // Trip profile fields
  peopleCount?: number;
  audienceType?: 'adults' | 'family';
  ageRange?: string;
  interests?: string[];
}

export type ActivePanel = 'none' | 'trip' | 'itinerary' | 'hotels' | 'flights';

export interface Results {
  itinerary?: any;
  hotels?: any[];
  flights?: any[];
}

// State interface
export interface ChatState {
  messages: ChatMessage[];
  activePanel: ActivePanel;
  tripState: TripState;
  results: Results;
  sessionId?: string; // Stream Chat channel ID for session persistence
  lastSyncedAt?: number; // Timestamp of last backend sync
}

// Actions interface
export interface ChatActions {
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setTripState: (partial: Partial<TripState>) => void;
  setResults: (partial: Partial<Results>) => void;
  clearItinerary: () => void;
  setSessionId: (sessionId: string | undefined) => void;
  setLastSyncedAt: (timestamp: number | undefined) => void;
  reset: () => void;
}

export type ChatStore = ChatState & ChatActions;

// Initial state
const initialState: ChatState = {
  messages: [],
  activePanel: 'none',
  tripState: {},
  results: {},
  sessionId: undefined,
  lastSyncedAt: undefined,
};

// Custom sessionStorage that's safe for SSR
// Zustand's persist middleware handles SSR gracefully, but we need to provide
// a storage implementation that works on both server and client
const getSessionStorage = (): Storage => {
  if (typeof window === 'undefined') {
    // Return a no-op storage for SSR (Zustand will skip persistence during SSR)
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as Storage;
  }
  return window.sessionStorage;
};

// Create the store with persistence
export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      ...initialState,

      // Add a message (only if messages does not already contain msg.id)
      addMessage: (message) => {
        set((state) => {
          // Check if message with this id already exists
          const existingMessage = state.messages.find((m) => m.id === message.id);
          if (existingMessage) {
            console.log('[ChatStore] Duplicate message with id detected, skipping:', message.id);
            return state; // Don't add duplicate
          }

          // Add the message
          return {
            messages: [...state.messages, message],
          };
        });
      },

      // Update an existing message (for streaming, UI updates, etc.)
      updateMessage: (id, patch) => {
        set((state) => {
          const messageIndex = state.messages.findIndex((m) => m.id === id);
          if (messageIndex === -1) {
            console.warn('[ChatStore] Message not found for update:', id);
            return state;
          }

          const updatedMessages = [...state.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            ...patch,
          };

          return { messages: updatedMessages };
        });
      },

      // Set active panel
      setActivePanel: (panel) => {
        set({ activePanel: panel });
      },

      // Set trip state (merge with existing)
      setTripState: (partial) => {
        set((state) => ({
          tripState: {
            ...state.tripState,
            ...partial,
          },
        }));
      },

      // Set results (merge with existing). itinerary is always REPLACED entirely (never merge days).
      setResults: (partial) => {
        set((state) => ({
          results: { ...state.results, ...partial },
        }));
      },

      // Clear itinerary-related results (call when destination changes)
      clearItinerary: () => {
        set((state) => ({
          results: { ...state.results, itinerary: undefined },
        }));
      },

      // Set session ID (Stream Chat channel ID)
      setSessionId: (sessionId) => {
        set({ sessionId });
      },

      // Set last synced timestamp
      setLastSyncedAt: (timestamp) => {
        set({ lastSyncedAt: timestamp });
      },

      // Reset all state to initial
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'chat-store', // Unique key for sessionStorage
      storage: createJSONStorage(() => getSessionStorage()),
      // Persist results (itinerary, flights, hotels) per session - cleared on reset() when user changes
      partialize: (state) => ({ results: state.results }),
    }
  )
);

