/**
 * Example usage of the Zustand store
 * This file demonstrates how to use the store in your components
 */

'use client';

import { useAppStore } from './store';
import { useHydratedStore } from './useHydratedStore';

// Example 1: Basic usage in a component
export function ChatExample() {
  // Direct usage - works after hydration
  const messages = useAppStore((state) => state.messages);
  const addMessage = useAppStore((state) => state.addMessage);

  const handleSend = (content: string) => {
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
    });
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
    </div>
  );
}

// Example 2: Hydration-safe usage (waits for client-side hydration)
export function TripFormExample() {
  // This returns undefined during SSR, then the actual value after hydration
  const tripState = useHydratedStore((state) => state.tripState);
  const setTripState = useAppStore((state) => state.setTripState);
  const activePanel = useAppStore((state) => state.activePanel);
  const setActivePanel = useAppStore((state) => state.setActivePanel);

  // Handle loading state during hydration
  if (tripState === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <input
        value={tripState.destination || ''}
        onChange={(e) => setTripState({ destination: e.target.value })}
        placeholder="Destination"
      />
      <button onClick={() => setActivePanel('itinerary')}>
        View Itinerary
      </button>
    </div>
  );
}

// Example 3: Using multiple selectors
export function ResultsExample() {
  const results = useAppStore((state) => state.results);
  const setResults = useAppStore((state) => state.setResults);
  const activePanel = useAppStore((state) => state.activePanel);

  return (
    <div>
      {activePanel === 'itinerary' && results.itinerary && (
        <div>{JSON.stringify(results.itinerary)}</div>
      )}
      {activePanel === 'hotels' && results.hotels && (
        <div>
          {results.hotels.map((hotel, idx) => (
            <div key={idx}>{hotel.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Example 4: Reset session
export function ResetButton() {
  const resetSession = useAppStore((state) => state.resetSession);

  return (
    <button onClick={resetSession}>
      Reset Session
    </button>
  );
}

