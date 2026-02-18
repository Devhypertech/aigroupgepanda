/**
 * Global Client-Side Store with Zustand
 * Persists to sessionStorage for session-based state management
 * Hydration-safe for Next.js SSR
 * 
 * @example
 * // Basic usage
 * import { useAppStore } from '@/lib/store';
 * 
 * function MyComponent() {
 *   const messages = useAppStore((state) => state.messages);
 *   const addMessage = useAppStore((state) => state.addMessage);
 *   
 *   addMessage({ id: '1', role: 'user', content: 'Hello' });
 * }
 * 
 * @example
 * // Hydration-safe usage (for SSR-sensitive components)
 * import { useHydratedStore } from '@/lib/useHydratedStore';
 * 
 * function SSRComponent() {
 *   const tripState = useHydratedStore((state) => state.tripState);
 *   if (!tripState) return <Loading />; // Handle SSR
 *   return <div>{tripState.destination}</div>;
 * }
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  clientId?: string; // Client-generated UUID to prevent duplicates
  role: MessageRole;
  content: string;
  createdAt: Date | string; // Store as ISO string, parse to Date when needed
}

export interface TripState {
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  travelStyle?: string[];
}

export type ActivePanel = 'chat' | 'tripForm' | 'itinerary' | 'hotels' | 'flights';

export interface Results {
  itinerary?: any;
  hotels?: any[];
  flights?: any[];
}

export interface AppState {
  // Messages array
  messages: ChatMessage[];
  
  // Trip planning state
  tripState: TripState;
  
  // Active panel/view
  activePanel: ActivePanel;
  
  // Results from AI/API calls
  results: Results;
}

export interface AppActions {
  // Message actions
  addMessage: (message: Omit<ChatMessage, 'createdAt'>) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  
  // Trip state actions
  setTripState: (state: Partial<TripState>) => void;
  resetTripState: () => void;
  
  // Panel actions
  setActivePanel: (panel: ActivePanel) => void;
  
  // Results actions
  setResults: (results: Partial<Results>) => void;
  clearResults: () => void;
  
  // Session management
  resetSession: () => void;
}

export type AppStore = AppState & AppActions;

// Initial state
const initialState: AppState = {
  messages: [],
  tripState: {},
  activePanel: 'chat',
  results: {},
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
export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      // Add a message (with duplicate check by clientId)
      addMessage: (message) => {
        set((state) => {
          // If message has clientId, check for duplicates
          if (message.clientId) {
            const existingMessage = state.messages.find(m => m.clientId === message.clientId);
            if (existingMessage) {
              console.log('[Store] Duplicate message with clientId detected, skipping:', message.clientId);
              return state; // Don't add duplicate
            }
          }
          
          // Check for duplicate by id as well
          const existingById = state.messages.find(m => m.id === message.id);
          if (existingById) {
            console.log('[Store] Duplicate message with id detected, skipping:', message.id);
            return state; // Don't add duplicate
          }
          
          return {
            messages: [
              ...state.messages,
              {
                ...message,
                createdAt: new Date().toISOString(),
              },
            ],
          };
        });
      },

      // Update an existing message
      updateMessage: (messageId, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
        }));
      },

      // Clear all messages
      clearMessages: () => {
        set({ messages: [] });
      },

      // Update trip state (partial update)
      setTripState: (newState) => {
        set((state) => ({
          tripState: {
            ...state.tripState,
            ...newState,
          },
        }));
      },

      // Reset trip state
      resetTripState: () => {
        set({ tripState: {} });
      },

      // Set active panel
      setActivePanel: (panel) => {
        set({ activePanel: panel });
      },

      // Update results (partial update)
      setResults: (newResults) => {
        set((state) => ({
          results: {
            ...state.results,
            ...newResults,
          },
        }));
      },

      // Clear all results
      clearResults: () => {
        set({ results: {} });
      },

      // Reset entire session
      resetSession: () => {
        set(initialState);
      },
    }),
    {
      name: 'gepanda-app-store', // Storage key
      storage: createJSONStorage(() => getSessionStorage()),
      // Only persist certain fields (exclude sensitive data if needed)
      partialize: (state) => ({
        messages: state.messages,
        tripState: state.tripState,
        activePanel: state.activePanel,
        results: state.results,
      }),
      // Handle hydration safely - Zustand will handle this automatically
      skipHydration: false,
    }
  )
);

// Re-export for convenience
export { useAppStore as useStore };

