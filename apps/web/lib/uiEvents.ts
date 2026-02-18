/**
 * UI Event Router
 * Handles UI widget actions and routes them to appropriate tool calls
 */

import { ChatStore } from './chatStore';

interface UIEventOptions {
  name: string;
  payload?: any;
  store: ChatStore;
  apiUrl: string;
  userId?: string;
}

/**
 * Handles UI events from widgets (buttons, cards, etc.)
 * Routes to appropriate tool endpoints and updates store
 */
export async function handleUIEvent({
  name,
  payload = {},
  store,
  apiUrl,
  userId,
}: UIEventOptions): Promise<void> {
  const { addMessage, updateMessage, setActivePanel, setResults, setTripState } = store;

  // Add a temporary "working" message
  const workingId = crypto.randomUUID();
  addMessage({
    id: workingId,
    role: 'assistant',
    content: 'Working on it...',
    createdAt: Date.now(),
  });

  try {
    // Route based on event name
    switch (name) {
      case 'book_flight':
      case 'search_flights': {
        setActivePanel('flights');
        
        try {
          const response = await fetch(`${apiUrl}/api/tools/flights/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: payload.origin || 'NYC',
              destination: payload.destination || store.tripState.destination,
              departureDate: payload.departureDate || store.tripState.startDate,
              returnDate: payload.returnDate || store.tripState.endDate,
              passengers: payload.passengers || 1,
              class: payload.class || 'economy',
              userId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setResults({ flights: data.flights || data.results || [] });
            
            // Update working message with results
            updateMessage(workingId, {
              content: `Found ${data.flights?.length || data.results?.length || 0} flight options. Check the Flights panel on the right.`,
            });
          } else {
            throw new Error('Failed to search flights');
          }
        } catch (error) {
          console.error('[UIEvents] Error searching flights:', error);
          updateMessage(workingId, {
            content: 'Sorry, I encountered an error searching for flights. Please try again.',
          });
        }
        break;
      }

      case 'book_hotel':
      case 'search_hotels': {
        setActivePanel('hotels');
        
        try {
          const response = await fetch(`${apiUrl}/api/tools/hotels/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: payload.destination || store.tripState.destination,
              checkIn: payload.checkIn || store.tripState.startDate,
              checkOut: payload.checkOut || store.tripState.endDate,
              guests: payload.guests || 2,
              maxPrice: payload.maxPrice || store.tripState.budget,
              userId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setResults({ hotels: data.hotels || data.results || [] });
            
            // Update working message
            updateMessage(workingId, {
              content: `Found ${data.hotels?.length || data.results?.length || 0} hotel options. Check the Hotels panel on the right.`,
            });
          } else {
            throw new Error('Failed to search hotels');
          }
        } catch (error) {
          console.error('[UIEvents] Error searching hotels:', error);
          updateMessage(workingId, {
            content: 'Sorry, I encountered an error searching for hotels. Please try again.',
          });
        }
        break;
      }

      case 'generate_itinerary':
      case 'create_itinerary':
      case 'plan_trip': {
        // Update trip state from payload
        if (payload.destination || payload.startDate || payload.endDate || payload.budget) {
          setTripState({
            destination: payload.destination,
            startDate: payload.startDate,
            endDate: payload.endDate,
            budget: payload.budget,
            travelStyle: payload.travelStyle,
          });
        }
        
        try {
          // Call the UI event API endpoint (relative URL)
          const response = await fetch('/api/chat/ui/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'generate_itinerary',
              payload: {
                destination: payload.destination || store.tripState.destination,
                startDate: payload.startDate || store.tripState.startDate,
                endDate: payload.endDate || store.tripState.endDate,
                budget: payload.budget || store.tripState.budget,
                travelStyle: payload.travelStyle || store.tripState.travelStyle,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Update panel and results
            if (data.panel) {
              setActivePanel(data.panel);
            }
            if (data.data) {
              setResults(data.data);
            }
            
            // Update working message with reply
            updateMessage(workingId, {
              content: data.reply || 'I\'ve created a personalized itinerary for you! Check the Itinerary panel on the right.',
            });
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to generate itinerary');
          }
        } catch (error) {
          console.error('[UIEvents] Error generating itinerary:', error);
          updateMessage(workingId, {
            content: 'Sorry, I encountered an error generating your itinerary. Please try again.',
          });
        }
        break;
      }

      case 'book_flight_confirmed':
      case 'confirm_flight_booking': {
        try {
          const response = await fetch(`${apiUrl}/api/tools/flights/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              flightId: payload.flightId,
              passengers: payload.passengers || 1,
              userId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            updateMessage(workingId, {
              content: `✅ Flight booking confirmed! Booking ID: ${data.bookingId || 'N/A'}. Please check your email for confirmation details.`,
            });
          } else {
            throw new Error('Failed to book flight');
          }
        } catch (error) {
          console.error('[UIEvents] Error booking flight:', error);
          updateMessage(workingId, {
            content: 'Sorry, I encountered an error booking your flight. Please try again or contact support.',
          });
        }
        break;
      }

      case 'book_hotel_confirmed':
      case 'confirm_hotel_booking': {
        try {
          const response = await fetch(`${apiUrl}/api/tools/hotels/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hotelId: payload.hotelId,
              checkIn: payload.checkIn,
              checkOut: payload.checkOut,
              guests: payload.guests || 2,
              userId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            updateMessage(workingId, {
              content: `✅ Hotel booking confirmed! Booking ID: ${data.bookingId || 'N/A'}. Please check your email for confirmation details.`,
            });
          } else {
            throw new Error('Failed to book hotel');
          }
        } catch (error) {
          console.error('[UIEvents] Error booking hotel:', error);
          updateMessage(workingId, {
            content: 'Sorry, I encountered an error booking your hotel. Please try again or contact support.',
          });
        }
        break;
      }

      default:
        // Unknown event, update message
        updateMessage(workingId, {
          content: `I received your action: ${name}. This feature is coming soon!`,
        });
    }
  } catch (error) {
    console.error('[UIEvents] Unexpected error:', error);
    updateMessage(workingId, {
      content: 'Sorry, I encountered an unexpected error. Please try again.',
    });
  }
}

