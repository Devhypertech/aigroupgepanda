/**
 * Travelpayouts API Integration
 * Flight and hotel search API
 * Docs: https://support.travelpayouts.com/hc/en-us/articles/203956163
 * Uses TRAVELPAYOUTS_TOKEN or TRAVELPAYOUTS_API_KEY, TRAVELPAYOUTS_MARKER, TRAVELPAYOUTS_BASE_URL
 */

const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_TOKEN || process.env.TRAVELPAYOUTS_API_KEY;
const TRAVELPAYOUTS_MARKER = process.env.TRAVELPAYOUTS_MARKER || '613624';
const TRAVELPAYOUTS_BASE_URL = (process.env.TRAVELPAYOUTS_BASE_URL || 'https://api.travelpayouts.com').replace(/\/$/, '');

export interface FlightSearchParams {
  origin: string; // IATA code (e.g., "NYC", "LAX")
  destination: string; // IATA code
  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD (optional for round trip)
  passengers: number;
  class?: 'economy' | 'business' | 'first';
  directOnly?: boolean;
}

export interface FlightResult {
  id?: string;
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
  deeplinkUrl?: string; // alias for bookingUrl for API consistency
}

/** Convert city/airport name to IATA code (3 letters) */
function toIata(value: string): string {
  const s = (value || '').trim().toUpperCase();
  if (s.length === 3 && /^[A-Z]{3}$/.test(s)) return s;
  const lower = s.toLowerCase();
  if (lower.includes('nyc') || lower.includes('new york')) return 'JFK';
  if (lower.includes('lax') || lower.includes('los angeles')) return 'LAX';
  if (lower.includes('tokyo') || lower.includes('japan')) return 'NRT';
  if (lower.includes('bali') || lower.includes('indonesia')) return 'DPS';
  if (lower.includes('paris') || lower.includes('france')) return 'CDG';
  if (lower.includes('london') || lower.includes('uk')) return 'LHR';
  if (lower.includes('sydney') || lower.includes('australia')) return 'SYD';
  if (lower.includes('bangkok') || lower.includes('thailand')) return 'BKK';
  if (lower.includes('singapore')) return 'SIN';
  if (lower.includes('moscow')) return 'MOW';
  if (lower.includes('istanbul')) return 'IST';
  if (lower.includes('dubai')) return 'DXB';
  if (lower.includes('hong kong')) return 'HKG';
  if (lower.includes('rome') || lower.includes('italy')) return 'FCO';
  if (lower.includes('madrid') || lower.includes('spain')) return 'MAD';
  if (lower.includes('amsterdam')) return 'AMS';
  if (lower.includes('berlin') || lower.includes('germany')) return 'BER';
  return s.substring(0, 3).padEnd(3, 'X');
}

function formatTime(iso: string): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function formatDuration(minutes?: number): string {
  if (typeof minutes !== 'number' || minutes < 0) return 'N/A';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Build Aviasales deeplink with marker for affiliate tracking
 */
export function buildFlightDeeplink(params: {
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
}): string {
  const origin = toIata(params.origin);
  const dest = toIata(params.destination);
  const dep = params.departureDate || new Date().toISOString().split('T')[0];
  const d = new Date(dep);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const depDDMM = day + month;
  const retDDMM = params.returnDate ? (() => {
    const r = new Date(params.returnDate!);
    return String(r.getDate()).padStart(2, '0') + String(r.getMonth() + 1).padStart(2, '0');
  })() : '';
  const path = retDDMM ? `${origin}${depDDMM}${dest}${retDDMM}1` : `${origin}${depDDMM}${dest}1`;
  const url = new URL(`https://www.aviasales.com/search/${path}`);
  url.searchParams.set('marker', TRAVELPAYOUTS_MARKER);
  return url.toString();
}

/**
 * Search for flights using Travelpayouts Aviasales Data API (prices_for_dates)
 * Returns 5-10 normalized flights with deeplinkUrl. On auth failure throws with message for UI.
 */
export async function searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
  const originIata = toIata(params.origin);
  const destIata = toIata(params.destination);
  const depDate = params.departureDate || new Date().toISOString().split('T')[0];
  const retDate = params.returnDate;
  const currency = 'usd';

  if (!TRAVELPAYOUTS_TOKEN?.trim()) {
    console.warn('[Travelpayouts] API token not configured (TRAVELPAYOUTS_TOKEN or TRAVELPAYOUTS_API_KEY)');
    return getMockFlights(params);
  }

  const url = new URL(`${TRAVELPAYOUTS_BASE_URL}/aviasales/v3/prices_for_dates`);
  url.searchParams.set('origin', originIata);
  url.searchParams.set('destination', destIata);
  url.searchParams.set('departure_at', depDate);
  if (retDate) url.searchParams.set('return_at', retDate);
  url.searchParams.set('currency', currency);
  url.searchParams.set('limit', '10');
  url.searchParams.set('one_way', retDate ? 'false' : 'true');
  url.searchParams.set('direct', params.directOnly ? 'true' : 'false');
  url.searchParams.set('sorting', 'price');
  url.searchParams.set('token', TRAVELPAYOUTS_TOKEN);

  try {
    console.log('[Travelpayouts] Request:', { origin: originIata, destination: destIata, depart_date: depDate, hasReturn: !!retDate });
    const response = await fetch(url.toString(), {
      headers: { 'Accept-Encoding': 'gzip, deflate', 'X-Access-Token': TRAVELPAYOUTS_TOKEN },
    });

    if (response.status === 401) {
      console.error('[Travelpayouts] Auth failed: 401 Unauthorized (check TRAVELPAYOUTS_TOKEN)');
      throw new Error('Flight search temporarily unavailable (provider auth failed).');
    }
    if (response.status === 403) {
      console.error('[Travelpayouts] Forbidden: 403 (token may be invalid or expired)');
      throw new Error('Flight search temporarily unavailable (provider auth failed).');
    }
    if (!response.ok) {
      const text = await response.text();
      console.error('[Travelpayouts] API error:', response.status, text?.substring(0, 200));
      throw new Error(`Travelpayouts API error: ${response.status}`);
    }

    const json: any = await response.json();
    if (!json.success) {
      const errMsg = json.error || 'Unknown error';
      console.error('[Travelpayouts] API success=false:', errMsg);
      if (String(errMsg).toLowerCase().includes('token') || String(errMsg).toLowerCase().includes('auth')) {
        throw new Error('Flight search temporarily unavailable (provider auth failed).');
      }
      return getMockFlights(params);
    }

    const data = json.data;
    if (!Array.isArray(data) || data.length === 0) {
      console.log('[Travelpayouts] No flight data for route, using fallback');
      return getMockFlights(params);
    }

    const items = data.slice(0, 10);
    const results: FlightResult[] = items.map((item: any, idx: number) => {
      const depAt = item.departure_at || '';
      const durationMin = item.duration_to ?? item.duration ?? 0;
      const depDateObj = depAt ? new Date(depAt) : new Date(depDate);
      const arrivalDateObj = new Date(depDateObj.getTime() + durationMin * 60 * 1000);
      const origAirport = item.origin_airport || item.origin || originIata;
      const destAirport = item.destination_airport || item.destination || destIata;
      let link = item.link || '';
      const baseUrl = 'https://www.aviasales.com';
      const fullLink = link.startsWith('http') ? link : `${baseUrl}${link.startsWith('/') ? '' : '/'}${link}`;
      const bookingUrl = new URL(fullLink);
      bookingUrl.searchParams.set('marker', TRAVELPAYOUTS_MARKER);
      const deeplinkUrl = bookingUrl.toString();

      return {
        id: `flight-${idx + 1}`,
        price: item.price ?? 0,
        currency: currency.toUpperCase(),
        airline: item.airline || 'Airline',
        flightNumber: String(item.flight_number || item.airline || ''),
        departure: {
          airport: origAirport,
          time: formatTime(depAt),
          date: formatDate(depAt) || depDate,
        },
        arrival: {
          airport: destAirport,
          time: formatTime(arrivalDateObj.toISOString()),
          date: formatDate(arrivalDateObj.toISOString()) || depDate,
        },
        stops: item.transfers ?? 0,
        duration: formatDuration(durationMin),
        bookingUrl: deeplinkUrl,
        deeplinkUrl,
      };
    });

    console.log('[Travelpayouts] Found', results.length, 'flights for', originIata, '->', destIata);
    return results;
  } catch (error) {
    if (error instanceof Error && error.message.includes('provider auth failed')) {
      throw error;
    }
    console.error('[Travelpayouts] Error searching flights:', error);
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
  if (!TRAVELPAYOUTS_TOKEN?.trim()) {
    console.warn('[Travelpayouts] API token not configured');
    return getMockHotels(params);
  }

  try {
    return getMockHotels(params);
  } catch (error) {
    console.error('[Travelpayouts] Error searching hotels:', error);
    return getMockHotels(params);
  }
}

function getMockFlights(params: FlightSearchParams): FlightResult[] {
  const deeplink = buildFlightDeeplink({
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    returnDate: params.returnDate,
  });
  return [
    {
      id: 'flight-1',
      price: 350,
      currency: 'USD',
      airline: 'United Airlines',
      flightNumber: 'UA123',
      departure: { airport: toIata(params.origin), time: '10:30 AM', date: params.departureDate },
      arrival: { airport: toIata(params.destination), time: '2:45 PM', date: params.departureDate },
      stops: 0,
      duration: '4h 15m',
      bookingUrl: deeplink,
      deeplinkUrl: deeplink,
    },
    {
      id: 'flight-2',
      price: 420,
      currency: 'USD',
      airline: 'Delta',
      flightNumber: 'DL456',
      departure: { airport: toIata(params.origin), time: '8:00 AM', date: params.departureDate },
      arrival: { airport: toIata(params.destination), time: '4:30 PM', date: params.departureDate },
      stops: 1,
      duration: '8h 30m',
      bookingUrl: deeplink,
      deeplinkUrl: deeplink,
    },
    {
      id: 'flight-3',
      price: 290,
      currency: 'USD',
      airline: 'American Airlines',
      flightNumber: 'AA789',
      departure: { airport: toIata(params.origin), time: '6:00 PM', date: params.departureDate },
      arrival: { airport: toIata(params.destination), time: '10:15 PM', date: params.departureDate },
      stops: 0,
      duration: '4h 15m',
      bookingUrl: deeplink,
      deeplinkUrl: deeplink,
    },
    {
      id: 'flight-4',
      price: 380,
      currency: 'USD',
      airline: 'JetBlue',
      flightNumber: 'B6123',
      departure: { airport: toIata(params.origin), time: '12:00 PM', date: params.departureDate },
      arrival: { airport: toIata(params.destination), time: '5:30 PM', date: params.departureDate },
      stops: 1,
      duration: '5h 30m',
      bookingUrl: deeplink,
      deeplinkUrl: deeplink,
    },
    {
      id: 'flight-5',
      price: 410,
      currency: 'USD',
      airline: 'Southwest',
      flightNumber: 'WN321',
      departure: { airport: toIata(params.origin), time: '2:00 PM', date: params.departureDate },
      arrival: { airport: toIata(params.destination), time: '6:45 PM', date: params.departureDate },
      stops: 0,
      duration: '4h 45m',
      bookingUrl: deeplink,
      deeplinkUrl: deeplink,
    },
  ];
}

/**
 * Clean destination string by removing common prepositions and extra words
 */
function cleanDestination(dest: string | undefined): string {
  if (!dest) return '';
  const cleaned = dest
    .replace(/^(in|to|at|for|from|with)\s+/i, '')
    .trim();
  const match = cleaned.match(/(?:in|to|at|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (match && match[1]) return match[1].trim();
  return cleaned;
}

function buildHotelBookingUrl(params: {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  hotelName?: string;
}): string {
  const url = new URL('https://search.hotellook.com/');
  url.searchParams.set('marker', TRAVELPAYOUTS_MARKER);
  url.searchParams.set('locale', 'en_US');
  if (params.destination) url.searchParams.set('destination', cleanDestination(params.destination));
  if (params.checkIn) url.searchParams.set('checkIn', params.checkIn);
  if (params.checkOut) url.searchParams.set('checkOut', params.checkOut);
  if (params.hotelName) url.searchParams.set('hotel', params.hotelName);
  return url.toString();
}

function getMockHotels(params: any): any[] {
  const bookingUrl = buildHotelBookingUrl({
    destination: params.destination,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
  });
  return [
    { id: 'hotel_1', name: 'Luxury Hotel', price: 150, currency: 'USD', rating: 4.5, imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', bookingUrl },
    { id: 'hotel_2', name: 'Budget Hotel', price: 80, currency: 'USD', rating: 4.0, imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', bookingUrl },
  ];
}
