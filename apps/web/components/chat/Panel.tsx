/**
 * Panel Component
 * Renders different panels based on activePanel state
 */

'use client';

import { useCallback } from 'react';
import { useChatStore } from '../../lib/chatStore';
import { ensureAffiliateMarker } from '../../lib/travelpayoutsLinks';

interface PanelProps {
  isMobile?: boolean;
}

export function Panel({ isMobile = false }: PanelProps) {
  const activePanel = useChatStore((state) => state.activePanel);
  const setActivePanel = useChatStore((state) => state.setActivePanel);
  const results = useChatStore((state) => state.results);
  const tripState = useChatStore((state) => state.tripState);
  const addMessage = useChatStore((state) => state.addMessage);
  const setResults = useChatStore((state) => state.setResults);
  
  // Handle UI events from panel buttons
  const handleUIEventCallback = useCallback(async (eventName: string, payload?: any) => {
    try {
      const body: Record<string, unknown> = {
        name: eventName,
        payload: payload ?? {},
      };
      // Pass tripState for search events and add_to_itinerary so API can derive params / create itinerary
      if (eventName === 'search_flights' || eventName === 'search_hotels' || eventName === 'add_to_itinerary') {
        body.tripState = tripState && Object.keys(tripState).length > 0 ? tripState : undefined;
      }
      // Pass current itinerary for add_to_itinerary so API can update it (or create minimal if missing)
      if (eventName === 'add_to_itinerary') {
        body.payload = { ...(payload ?? {}), itinerary: results.itinerary };
      }
      const response = await fetch('/api/chat/ui/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add assistant reply message
        if (data.reply) {
          const replyId = crypto.randomUUID();
          addMessage({
            id: replyId,
            role: 'assistant',
            content: data.reply,
            createdAt: Date.now(),
          });
        }
        
        // Set active panel
        if (data.panel) {
          setActivePanel(data.panel);
        }
        
        // Set results
        if (data.data) {
          setResults(data.data);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to process UI event');
      }
    } catch (error) {
      console.error('[Panel] Error handling UI event:', error);
      
      // Append error message to chat
      const errorId = crypto.randomUUID();
      addMessage({
        id: errorId,
        role: 'assistant',
        content: error instanceof Error 
          ? `I apologize, but I encountered an error: ${error.message}. Please try again.`
          : 'I apologize, but I encountered an error processing your request. Please try again.',
        createdAt: Date.now(),
      });
    }
  }, [addMessage, setActivePanel, setResults, tripState, results.itinerary]);

  // Handle flight selection/booking
  const handleSelectFlight = useCallback((flight: any) => {
    console.log('[Panel] Selected flight:', flight.id || flight.flightNumber);
    
    // If flight has actions, trigger the first action
    if (flight.actions && flight.actions.length > 0) {
      const action = flight.actions[0];
      if (action.type === 'event') {
        handleUIEventCallback(action.name, { ...action.payload, flightId: flight.id });
      }
    } else {
      // Default: trigger book_flight event
      handleUIEventCallback('book_flight', {
        flightId: flight.id,
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        price: flight.price,
        departure: flight.departure,
        arrival: flight.arrival,
      });
    }
  }, [handleUIEventCallback]);

  // Handle hotel selection/booking
  const handleSelectHotel = useCallback((hotel: any) => {
    console.log('[Panel] Selected hotel:', hotel.id || hotel.name);
    
    // If hotel has actions, trigger the first action
    if (hotel.actions && hotel.actions.length > 0) {
      const action = hotel.actions[0];
      if (action.type === 'event') {
        handleUIEventCallback(action.name, { ...action.payload, hotelId: hotel.id });
      }
    } else {
      // Default: trigger book_hotel event
      handleUIEventCallback('book_hotel', {
        hotelId: hotel.id,
        name: hotel.name,
        price: hotel.price,
        checkIn: tripState.startDate,
        checkOut: tripState.endDate,
        guests: 2,
      });
    }
  }, [handleUIEventCallback, tripState]);

  // Helper function to get panel title
  const getPanelTitle = () => {
    switch (activePanel) {
      case 'hotels':
        return 'Hotels';
      case 'flights':
        return 'Flights';
      case 'itinerary':
        return 'Itinerary';
      case 'trip':
        return 'Plan Trip';
      default:
        return 'Plan & Results';
    }
  };

  // Render hotels panel
  if (activePanel === 'hotels') {
    return (
      <div className="h-full flex flex-col bg-gp-bg">
        <div className="flex-shrink-0 p-4 md:p-6 border-b border-gp-border bg-gp-surface">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setActivePanel('none')}
              className="px-4 py-2 bg-gp-surface border border-gp-border rounded-lg text-gp-text hover:bg-gp-hover transition-colors text-sm font-medium"
            >
              ← Back to chat
            </button>
            {results.itinerary && (
              <button
                onClick={() => setActivePanel('itinerary')}
                className="px-4 py-2 bg-gp-surface border border-gp-border rounded-lg text-gp-text hover:bg-gp-hover transition-colors text-sm font-medium"
              >
                ← Back to itinerary
              </button>
            )}
          </div>
          <h2 className="text-2xl font-semibold text-gp-text">Hotels</h2>
          <p className="text-xs text-gp-muted mt-1">Prices may vary until booking.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {results.hotels && results.hotels.length > 0 ? (
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'} gap-4 md:gap-6`}>
              {results.hotels.map((hotel: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-gp-surface border border-gp-border rounded-xl overflow-hidden shadow-gp hover:shadow-gp-md transition-shadow"
                >
                  {hotel.imageUrl && (
                    <img
                      src={hotel.imageUrl}
                      alt={hotel.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gp-text mb-2">{hotel.name}</h3>
                    {hotel.location && (
                      <p className="text-gp-muted text-sm mb-2">📍 {hotel.location}</p>
                    )}
                    {hotel.rating && (
                      <p className="text-gp-muted text-sm mb-2">⭐ {hotel.rating}</p>
                    )}
                    <div className="mb-4">
                      {typeof hotel.price === 'number' && hotel.price > 0 ? (
                        <>
                          <p className="text-xl font-semibold text-gp-primary">
                            {hotel.currency || 'USD'} {hotel.price.toFixed(2)} <span className="text-sm font-normal text-gp-muted">per night</span>
                          </p>
                          <p className="text-xs text-gp-muted mt-1">Prices may vary until booking.</p>
                        </>
                      ) : (
                        <p className="text-gp-muted text-sm">Check price at booking</p>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                      {/* If hotel has actions array, render them */}
                      {hotel.actions && hotel.actions.length > 0 ? (
                        hotel.actions.map((action: any, actionIdx: number) => (
                          <button
                            key={actionIdx}
                            onClick={() => {
                              if (action.type === 'event') {
                                handleUIEventCallback(action.name, { ...action.payload, hotelId: hotel.id });
                              } else if (action.value) {
                                handleSelectHotel({ ...hotel, id: action.value });
                              }
                            }}
                            className="px-6 py-3 bg-gp-primary hover:bg-gp-primary-dark text-black font-semibold rounded-lg transition-colors"
                          >
                            {action.label || 'Select'}
                          </button>
                        ))
                      ) : (
                        <>
                          <button
                            onClick={() => handleUIEventCallback('add_to_itinerary', { type: 'hotel', item: hotel, day: 1 })}
                            className="px-6 py-3 bg-gp-surface border border-gp-border hover:bg-gp-hover text-gp-text font-semibold rounded-lg transition-colors"
                          >
                            Add to itinerary
                          </button>
                          {hotel.bookingUrl ? (
                            <a
                              href={ensureAffiliateMarker(hotel.bookingUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-6 py-3 bg-gp-primary hover:bg-gp-primary-dark text-black font-semibold rounded-lg transition-colors"
                            >
                              Book Now
                            </a>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gp-muted">No hotels found. Try searching again.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render flights panel
  if (activePanel === 'flights') {
    // Debug: Log flights data
    console.log('[Panel] Flights panel - results.flights:', results.flights);
    console.log('[Panel] Flights panel - isArray:', Array.isArray(results.flights));
    console.log('[Panel] Flights panel - length:', results.flights?.length);
    
    return (
      <div className="h-full flex flex-col bg-gp-bg">
        <div className="flex-shrink-0 p-4 md:p-6 border-b border-gp-border bg-gp-surface">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setActivePanel('none')}
              className="px-4 py-2 bg-gp-surface border border-gp-border rounded-lg text-gp-text hover:bg-gp-hover transition-colors text-sm font-medium"
            >
              ← Back to chat
            </button>
            {results.itinerary && (
              <button
                onClick={() => setActivePanel('itinerary')}
                className="px-4 py-2 bg-gp-surface border border-gp-border rounded-lg text-gp-text hover:bg-gp-hover transition-colors text-sm font-medium"
              >
                ← Back to itinerary
              </button>
            )}
          </div>
          <h2 className="text-2xl font-semibold text-gp-text">Flights</h2>
          <p className="text-xs text-gp-muted mt-1">Prices may vary until booking.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {results.flights && Array.isArray(results.flights) && results.flights.length > 0 ? (
            <div className="flex flex-col gap-4">
              {results.flights.map((flight: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-gp-surface border border-gp-border rounded-xl p-4 md:p-6 shadow-gp hover:shadow-gp-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-lg font-semibold text-gp-text mb-1">{flight.airline}</p>
                      <p className="text-gp-muted text-sm">{flight.flightNumber}</p>
                    </div>
                    <div className="text-right">
                      {typeof flight.price === 'number' && flight.price > 0 ? (
                        <>
                          <p className="text-2xl font-semibold text-gp-primary">
                            {flight.currency || 'USD'} {flight.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-gp-muted">Prices may vary until booking.</p>
                        </>
                      ) : (
                        <p className="text-gp-muted text-sm">Check price at booking</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gp-muted mb-1">Departure</p>
                      <p className="text-lg font-semibold text-gp-text">{flight.departure?.time || 'N/A'}</p>
                      <p className="text-xs text-gp-muted">{flight.departure?.airport || 'N/A'}</p>
                      {flight.departure?.date && (
                        <p className="text-xs text-gp-muted mt-1">{flight.departure.date}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gp-muted mb-1">Arrival</p>
                      <p className="text-lg font-semibold text-gp-text">{flight.arrival?.time || 'N/A'}</p>
                      <p className="text-xs text-gp-muted">{flight.arrival?.airport || 'N/A'}</p>
                      {flight.arrival?.date && (
                        <p className="text-xs text-gp-muted mt-1">{flight.arrival.date}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gp-muted mb-1">Duration</p>
                      <p className="text-lg font-semibold text-gp-text">{flight.duration || 'N/A'}</p>
                      <p className="text-xs text-gp-muted">
                        {flight.stops === 0 ? 'Direct' : `${flight.stops} stop(s)`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    {/* If flight has actions array, render them */}
                    {flight.actions && flight.actions.length > 0 ? (
                      flight.actions.map((action: any, actionIdx: number) => (
                        <button
                          key={actionIdx}
                          onClick={() => {
                            if (action.type === 'event') {
                              handleUIEventCallback(action.name, { ...action.payload, flightId: flight.id });
                            } else if (action.value) {
                              handleSelectFlight({ ...flight, id: action.value });
                            }
                          }}
                          className="px-6 py-3 bg-gp-primary hover:bg-gp-primary-dark text-black font-semibold rounded-lg transition-colors"
                        >
                          {action.label || 'Select'}
                        </button>
                      ))
                    ) : (
                      <>
                        <button
                          onClick={() => handleUIEventCallback('add_to_itinerary', { type: 'flight', item: flight, day: 1 })}
                          className="px-6 py-3 bg-gp-surface border border-gp-border hover:bg-gp-hover text-gp-text font-semibold rounded-lg transition-colors"
                        >
                          Add to itinerary
                        </button>
                        {flight.bookingUrl ? (
                          <a
                            href={ensureAffiliateMarker(flight.bookingUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-3 bg-gp-primary hover:bg-gp-primary-dark text-black font-semibold rounded-lg transition-colors"
                          >
                            Book Flight
                          </a>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gp-muted">No flights found. Try searching again.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

// Render itinerary panel

// Render itinerary panel
if (activePanel === 'itinerary') {
    return (
      <div className="h-full flex flex-col bg-gp-bg">
        <div className="flex-shrink-0 p-4 md:p-6 border-b border-gp-border bg-gp-surface">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setActivePanel('none')}
              className="px-4 py-2 bg-gp-surface border border-gp-border rounded-lg text-gp-text hover:bg-gp-hover transition-colors text-sm font-medium"
            >
              ← Back to chat
            </button>
          </div>
          <h2 className="text-2xl font-semibold text-gp-text">Itinerary</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {results.itinerary ? (
            <div className="space-y-6">
              {results.itinerary.days.map((day: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-gp-surface border border-gp-border rounded-xl p-4"
                >
                  <h3 className="text-xl font-semibold text-gp-text">Day {day.day}</h3>
                  <p className="text-sm text-gp-muted">{day.date}</p>
  
                  {day.activities.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-gp-text">
                      {day.activities.map((activity: string, idx: number) => (
                        <li key={idx}>• {activity}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gp-muted">No activities planned for today.</p>
                  )}
                </div>
              ))}
              {/* Buttons to search flights and hotels */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    handleUIEventCallback('search_flights', {
                      origin: 'NYC',
                      destination: tripState.destination || results.itinerary?.destination,
                      departureDate: tripState.startDate || results.itinerary?.startDate,
                      returnDate: tripState.endDate || results.itinerary?.endDate,
                      passengers: 1,
                      class: 'economy',
                    });
                  }}
                  className="px-6 py-3 bg-gp-primary text-white rounded-lg hover:bg-gp-primary-dark transition-colors font-medium"
                >
                  Search Flights
                </button>
                <button
                  onClick={() => {
                    handleUIEventCallback('search_hotels', {
                      destination: tripState.destination || results.itinerary?.destination,
                      checkIn: tripState.startDate || results.itinerary?.startDate,
                      checkOut: tripState.endDate || results.itinerary?.endDate,
                      guests: 2,
                      maxPrice: tripState.budget,
                    });
                  }}
                  className="px-6 py-3 bg-gp-primary text-white rounded-lg hover:bg-gp-primary-dark transition-colors font-medium"
                >
                  Search Hotels
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gp-muted">No itinerary available yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Render trip form panel
  if (activePanel === 'trip') {
    return (
      <div className="h-full flex flex-col bg-gp-bg">
        <div className="flex-shrink-0 p-4 md:p-6 border-b border-gp-border bg-gp-surface">
          <h2 className="text-2xl font-semibold text-gp-text">Plan Your Trip</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="bg-gp-surface border border-gp-border rounded-xl p-4 md:p-6">
            <p className="text-gp-muted">Trip planning form will be rendered here.</p>
          </div>
        </div>
      </div>
    );
  }

  // Default empty state
  return (
    <div className="h-full flex items-center justify-center bg-gp-bg">
      <div className="text-center">
        <p className="text-gp-muted text-lg mb-2">No active panel</p>
        <p className="text-gp-muted text-sm">Select an option from the chat to view details.</p>
      </div>
    </div>
  );
}

