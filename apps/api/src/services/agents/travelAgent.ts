/**
 * Travel Agent
 * Handles itinerary planning, flight/hotel search, and travel recommendations
 */

import { searchHotels, searchFlights } from '../travel/travelpayouts.js';
import { generateChatResponse } from '../../chat/respond.js';

export interface TravelContext {
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  travelStyle?: string[];
}

export const travelAgent = {
  async handle(
    message: string,
    context: TravelContext | undefined,
    recentMessages: Array<{ text: string; role: 'user' | 'assistant' }> = [],
    userId?: string,
    sessionId?: string
  ): Promise<{ text: string; ui?: any | null }> {
    const lowerMessage = message.toLowerCase().trim();

    // Extract travel details from message
    const destination = context?.destination || extractDestination(message);
    const dates = extractDates(message);
    const budget = context?.budget || extractBudget(message);

    // Detect intent type
    const isFlightSearch = /(?:flight|fly|airline|book a flight|find flights)/i.test(message);
    const isHotelSearch = /(?:hotel|accommodation|stay|book a hotel|find hotels|where to stay)/i.test(message);
    const isItineraryRequest = /(?:itinerary|plan|schedule|things to do|attractions|sightseeing)/i.test(message);

    // Flight search
    if (isFlightSearch && destination) {
      try {
        const flights = await searchFlights({
          origin: 'NYC', // Default or extract from context
          destination: destination,
          departureDate: dates.startDate || new Date().toISOString().split('T')[0],
          returnDate: dates.endDate,
          passengers: 1,
        });

        if (flights && flights.length > 0) {
          const flightList = flights.slice(0, 5).map(f => 
            `- ${f.airline || 'Flight'} from ${f.departure.airport} to ${f.arrival.airport}${f.price ? ` - $${f.price}` : ''}`
          ).join('\n');

          const aiResponse = await generateChatResponse(
            `User is searching for flights to ${destination}. Found flights:\n${flightList}\n\nProvide helpful flight recommendations.`,
            recentMessages,
            true
          );

          return {
            text: aiResponse.text || `I found ${flights.length} flights to ${destination}. Here are some options:`,
            ui: aiResponse.ui || null,
          };
        }
      } catch (error) {
        console.error('[Travel Agent] ❌ Flight search error:', error);
        console.error('[Travel Agent] Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('[Travel Agent] Error message:', error instanceof Error ? error.message : String(error));
        console.error('[Travel Agent] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // Fall through to general travel response
      }
    }

    // Hotel search
    if (isHotelSearch && destination) {
      try {
        const hotels = await searchHotels({
          destination: destination,
          checkIn: dates.startDate || new Date().toISOString().split('T')[0],
          checkOut: dates.endDate || new Date().toISOString().split('T')[0],
          guests: 2,
          maxPrice: budget,
        });

        if (hotels && hotels.length > 0) {
          const hotelList = hotels.slice(0, 5).map(h => 
            `- ${h.name || 'Hotel'}${h.price ? ` - $${h.price}/night` : ''}${h.rating ? ` (${h.rating}⭐)` : ''}`
          ).join('\n');

          const aiResponse = await generateChatResponse(
            `User is searching for hotels in ${destination}. Found hotels:\n${hotelList}\n\nProvide helpful hotel recommendations.`,
            recentMessages,
            true
          );

          return {
            text: aiResponse.text || `I found ${hotels.length} hotels in ${destination}. Here are some options:`,
            ui: aiResponse.ui || null,
          };
        }
      } catch (error) {
        console.error('[Travel Agent] ❌ Hotel search error:', error);
        console.error('[Travel Agent] Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('[Travel Agent] Error message:', error instanceof Error ? error.message : String(error));
        console.error('[Travel Agent] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // Fall through to general travel response
      }
    }

    // Itinerary planning
    if (isItineraryRequest && destination) {
      const tripState = {
        destination: destination,
        startDate: dates.startDate,
        endDate: dates.endDate,
        budget: budget,
        travelStyle: context?.travelStyle || [],
      };

      const aiResponse = await generateChatResponse(
        message,
        recentMessages,
        true, // Enable UI mode for trip planner
        tripState
      );

      return {
        text: aiResponse.text || `I'll help you plan your trip to ${destination}. Let me create an itinerary for you.`,
        ui: aiResponse.ui || null,
      };
    }

    // General travel assistance
    const aiResponse = await generateChatResponse(message, recentMessages, false);
    return {
      text: aiResponse.text || 'I can help you plan your trip. Where would you like to go?',
      ui: aiResponse.ui || null,
    };
  },
};

// Helper functions
function extractDestination(message: string): string | undefined {
  const patterns = [
    /(?:to|in|visit|going to|travel to|traveling to)\s+([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
    /(?:destination|place|location):\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function extractDates(message: string): { startDate?: string; endDate?: string } {
  const datePattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/g;
  const dates = message.match(datePattern);
  if (dates && dates.length > 0) {
    return {
      startDate: dates[0],
      endDate: dates[1],
    };
  }
  return {};
}

function extractBudget(message: string): number | undefined {
  const budgetPattern = /(?:budget|spend|cost)\s*(?:of|is|:)?\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
  const match = message.match(budgetPattern);
  if (match && match[1]) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return undefined;
}

