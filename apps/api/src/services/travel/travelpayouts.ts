/**
 * Travelpayouts API Integration
 * Flight and hotel search API
 * Docs: https://support.travelpayouts.com/hc/en-us/articles/203956163
 */

const TRAVELPAYOUTS_API_KEY = process.env.TRAVELPAYOUTS_API_KEY;
const TRAVELPAYOUTS_API_URL = 'https://api.travelpayouts.com';

export interface FlightSearchParams {
  origin: string; // IATA code (e.g., "NYC", "LAX")
  destination: string; // IATA code
  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD (optional for round trip)
  passengers: number;
  class?: 'economy' | 'business' | 'first';
}

export interface FlightResult {
  price: number;
  currency: string;
  airline: string;
  flightNumber: string;
  departure: {
    airport: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    time: string;
    date: string;
  };
  stops: number;
  duration: string;
  bookingUrl: string;
}

/**
 * Search for flights using Travelpayouts API
 */
export async function searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
  if (!TRAVELPAYOUTS_API_KEY) {
    console.warn('[Travelpayouts] API key not configured');
    // Return mock data for development
    return getMockFlights(params);
  }

  try {
    // TODO: Implement actual Travelpayouts API call
    // Example endpoint: /v1/prices/cheap
    const response = await fetch(
      `${TRAVELPAYOUTS_API_URL}/v1/prices/cheap?` +
      `origin=${params.origin}&` +
      `destination=${params.destination}&` +
      `depart_date=${params.departureDate}&` +
      `${params.returnDate ? `return_date=${params.returnDate}&` : ''}` +
      `passengers=${params.passengers}&` +
      `token=${TRAVELPAYOUTS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Travelpayouts API error: ${response.status}`);
    }

    const data = await response.json();
    // Transform API response to FlightResult format
    return transformFlightResults(data);
  } catch (error) {
    console.error('[Travelpayouts] Error searching flights:', error);
    // Fallback to mock data
    return getMockFlights(params);
  }
}

/**
 * Get hotel search results
 */
export async function searchHotels(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  maxPrice?: number;
}): Promise<any[]> {
  if (!TRAVELPAYOUTS_API_KEY) {
    console.warn('[Travelpayouts] API key not configured');
    return getMockHotels(params);
  }

  try {
    // TODO: Implement actual Travelpayouts hotel API call
    // This would use the hotel search endpoint
    return getMockHotels(params);
  } catch (error) {
    console.error('[Travelpayouts] Error searching hotels:', error);
    return getMockHotels(params);
  }
}

// Helper functions
function transformFlightResults(data: any): FlightResult[] {
  // Transform Travelpayouts API response to our format
  // This is a placeholder - actual implementation depends on API response structure
  return [];
}

function getMockFlights(params: FlightSearchParams): FlightResult[] {
  return [
    {
      price: 650,
      currency: 'USD',
      airline: 'United Airlines',
      flightNumber: 'UA123',
      departure: {
        airport: params.origin,
        time: '10:30',
        date: params.departureDate,
      },
      arrival: {
        airport: params.destination,
        time: '14:45',
        date: params.departureDate,
      },
      stops: 0,
      duration: '4h 15m',
      bookingUrl: `https://example.com/flights?ref=gepanda&origin=${params.origin}&dest=${params.destination}`,
    },
    {
      price: 450,
      currency: 'USD',
      airline: 'Delta',
      flightNumber: 'DL456',
      departure: {
        airport: params.origin,
        time: '08:00',
        date: params.departureDate,
      },
      arrival: {
        airport: params.destination,
        time: '16:30',
        date: params.departureDate,
      },
      stops: 1,
      duration: '8h 30m',
      bookingUrl: `https://example.com/flights?ref=gepanda&origin=${params.origin}&dest=${params.destination}`,
    },
  ];
}

/**
 * Clean destination string by removing common prepositions and extra words
 */
function cleanDestination(dest: string | undefined): string {
  if (!dest) return '';
  // Remove common prepositions and words at the start
  const cleaned = dest
    .replace(/^(in|to|at|for|from|with)\s+/i, '')
    .trim();
  // If it still contains "in" or "to" in the middle, try to extract the actual destination
  // e.g., "in Tokyo" -> "Tokyo", "to Japan" -> "Japan"
  const match = cleaned.match(/(?:in|to|at|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return cleaned;
}

/**
 * Build Hotellook booking URL with proper affiliate tracking
 */
function buildHotelBookingUrl(params: {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  hotelName?: string;
}): string {
  const marker = process.env.TRAVELPAYOUTS_MARKER || '613624';
  const url = new URL('https://search.hotellook.com/');
  url.searchParams.set('marker', marker);
  url.searchParams.set('locale', 'en_US');
  
  const cleanDest = cleanDestination(params.destination);
  if (cleanDest) {
    url.searchParams.set('destination', cleanDest);
  }
  if (params.checkIn) {
    url.searchParams.set('checkIn', params.checkIn);
  }
  if (params.checkOut) {
    url.searchParams.set('checkOut', params.checkOut);
  }
  if (params.hotelName) {
    url.searchParams.set('hotel', params.hotelName);
  }
  
  return url.toString();
}

function getMockHotels(params: any): any[] {
  const bookingUrl = buildHotelBookingUrl({
    destination: params.destination,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
  });
  
  return [
    {
      id: 'hotel_1',
      name: 'Luxury Hotel',
      price: 150,
      currency: 'USD',
      rating: 4.5,
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      bookingUrl,
    },
    {
      id: 'hotel_2',
      name: 'Budget Hotel',
      price: 80,
      currency: 'USD',
      rating: 4.0,
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
      bookingUrl,
    },
  ];
}

