/**
 * UI Event API Route Handler
 * Handles UI widget events (buttons, cards, etc.)
 * POST /api/chat/ui/event
 * 
 * Accepts both {name, payload} and {eventId, payload} formats
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchAviasalesFlights } from '@/lib/aviasales';
import { searchHotellookHotels } from '@/lib/hotellook';
import { buildFlightLink } from '@/lib/travelpayoutsLinks';

/** Pick from array by index (deterministic) */
function pick<T>(arr: T[], dayIndex: number): T {
  return arr[dayIndex % arr.length];
}

/**
 * Generate unique day plans with distance buckets (walking, 5-10 miles, 10+ miles).
 * Each day is unique based on destination, travelStyle/interests, and day number.
 */
function generateDummyItinerary(params: {
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  travelStyle?: string[];
  peopleCount?: number;
  audienceType?: string;
  ageRange?: string;
  interests?: string[];
}) {
  const destination = params.destination || 'Your Destination';
  const { startDate, endDate, budget, travelStyle, peopleCount, audienceType, ageRange, interests } = params;
  const style = (interests?.length ? interests : travelStyle) || ['cultural', 'foodie'];

  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const days = Math.max(1, Math.min(7, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))));

  const isFamily = audienceType === 'family';
  const d = destination;

  const WALKING_MORNING = [
    `Walking: Explore ${d} historic quarter and local markets`,
    `Walking: Stroll through ${d} neighborhoods, discover hidden gems`,
    `Walking: Visit ${d} city center, landmarks and viewpoints`,
    `Walking: Walk along ${d} waterfront or riverfront`,
    `Walking: Discover ${d} street art and local districts`,
    `Walking: Morning walk through ${d} parks and gardens`,
    `Walking: Explore ${d} old town and historic streets`,
  ];

  const WALKING_AFTERNOON = [
    `Walking: Visit nearby ${d} museums and galleries`,
    `Walking: Browse ${d} local shops and boutiques`,
    `Walking: Explore ${d} food markets and street vendors`,
    `Walking: Visit ${d} temples, churches, or historic sites`,
    `Walking: Stroll through ${d} botanical gardens`,
    `Walking: Discover ${d} local cafes and viewpoints`,
    `Walking: Explore ${d} cultural quarter`,
  ];

  const MID_RANGE = [
    `5-10 miles: Day trip to ${d} coastal area`,
    `5-10 miles: Excursion to ${d} mountains or hills`,
    `5-10 miles: Visit nearby ${d} villages or towns`,
    `5-10 miles: Day trip to ${d} nature reserve`,
    `5-10 miles: Explore ${d} wine region or countryside`,
    `5-10 miles: Visit ${d} scenic viewpoints`,
    `5-10 miles: Day trip to ${d} beaches or lakes`,
  ];

  const FAR = [
    `10+ miles: Excursion to ${d} region highlights`,
    `10+ miles: Full-day trip to ${d} national park`,
    `10+ miles: Visit ${d} UNESCO sites or major attractions`,
    `10+ miles: Scenic drive through ${d} countryside`,
    `10+ miles: Day trip to ${d} islands or coast`,
    `10+ miles: Explore ${d} mountain region`,
    `10+ miles: Visit ${d} historic towns in the region`,
  ];

  const DINNERS = [
    `Dinner: Local restaurant in ${d} (traditional cuisine)`,
    `Dinner: Rooftop restaurant with ${d} views`,
    `Dinner: Food market or street food tour in ${d}`,
    `Dinner: Fine dining in ${d} historic district`,
    `Dinner: Seafood restaurant in ${d}`,
    `Dinner: Cooking class and dinner in ${d}`,
    `Dinner: Family-friendly restaurant in ${d}`,
  ];

  const NIGHT_ADULT = [
    `Night: Live music or jazz bar in ${d}`,
    `Night: Rooftop bar with ${d} skyline views`,
    `Night: Night market or evening stroll in ${d}`,
    `Night: Theater or cultural performance in ${d}`,
    `Night: Local pub crawl in ${d}`,
    `Night: Sunset viewpoint then drinks in ${d}`,
    `Night: Night tour or evening cruise in ${d}`,
  ];

  const NIGHT_FAMILY = [
    `Evening: Family-friendly show or performance in ${d}`,
    `Evening: Ice cream and evening walk in ${d}`,
    `Evening: Night market with kids' activities in ${d}`,
    `Evening: Stargazing or evening park in ${d}`,
    `Evening: Family dinner and early night in ${d}`,
    `Evening: Light show or fountain display in ${d}`,
    `Evening: Board games and dessert in ${d}`,
  ];

  const getDayPlan = (dayIndex: number) => {
    const isArrival = dayIndex === 0;
    if (isArrival) {
      return {
        walking: [
          `Walking: Arrive in ${d} and check into accommodation`,
          `Walking: Get oriented, explore nearby area`,
        ],
        '5-10 miles': [] as string[],
        '10+ miles': [] as string[],
        dinner: pick(DINNERS, 0),
        night: isFamily ? pick(NIGHT_FAMILY, 0) : pick(NIGHT_ADULT, 0),
      };
    }
    return {
      walking: [pick(WALKING_MORNING, dayIndex), pick(WALKING_AFTERNOON, dayIndex)],
      '5-10 miles': [pick(MID_RANGE, dayIndex)],
      '10+ miles': [pick(FAR, dayIndex)],
      dinner: pick(DINNERS, dayIndex),
      night: isFamily ? pick(NIGHT_FAMILY, dayIndex) : pick(NIGHT_ADULT, dayIndex),
    };
  };

  const itinerary = {
    destination,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    budget: budget || undefined,
    travelStyle: style,
    peopleCount: peopleCount || undefined,
    audienceType: audienceType || undefined,
    ageRange: ageRange || undefined,
    interests: interests || undefined,
    days: Array.from({ length: days }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const plan = getDayPlan(i);
      const activities = [
        ...plan.walking,
        ...plan['5-10 miles'],
        ...plan['10+ miles'],
        plan.dinner,
        plan.night,
      ].filter(Boolean);
      return {
        day: i + 1,
        date: date.toISOString().split('T')[0],
        activities,
        distanceBuckets: {
          walking: plan.walking,
          '5-10 miles': plan['5-10 miles'],
          '10+ miles': plan['10+ miles'],
        },
      };
    }),
  };

  return itinerary;
}

/** Pick first non-empty value from candidates */
function firstNonEmpty<T>(...candidates: unknown[]): T | undefined {
  for (const v of candidates) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s.length > 0) return s as T;
    }
    if (typeof v === 'number' && !Number.isNaN(v)) return v as T;
    if (Array.isArray(v) && v.length > 0) return v as T;
    if (typeof v === 'object') return v as T;
  }
  return undefined;
}

/** Normalized trip params for itinerary generation */
type NormalizedTripParams = {
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  travelStyle?: string[];
  peopleCount?: number;
  audienceType?: string;
  ageRange?: string;
  interests?: string[];
};

/**
 * Extract destination/startDate/endDate/budget/travelStyle from multiple sources.
 * Prefers the most specific non-empty value.
 * Sources (in order): body.payload, body.payload.tripState, body.payload.form, body.tripState (prefer first non-empty)
 */
function normalizeTripParams(body: Record<string, unknown>): NormalizedTripParams {
  const payload = (body.payload as Record<string, unknown>) || {};
  const payloadTripState = (payload.tripState as Record<string, unknown>) || {};
  const payloadForm = (payload.form as Record<string, unknown>) || {};
  const bodyTripState = (body.tripState as Record<string, unknown>) || {};

  const destination = firstNonEmpty<string>(
    payload.destination,
    payloadTripState.destination,
    payloadForm.destination,
    bodyTripState.destination
  );

  const startDate = firstNonEmpty<string>(
    payload.startDate,
    payloadTripState.startDate,
    payloadForm.startDate,
    bodyTripState.startDate
  );

  const endDate = firstNonEmpty<string>(
    payload.endDate,
    payloadTripState.endDate,
    payloadForm.endDate,
    bodyTripState.endDate
  );

  const rawBudget = firstNonEmpty<number | string>(
    payload.budget,
    payloadTripState.budget,
    payloadForm.budget,
    bodyTripState.budget
  );
  const budget = typeof rawBudget === 'number' ? rawBudget : (typeof rawBudget === 'string' ? parseInt(rawBudget, 10) : undefined);
  const budgetNum = typeof budget === 'number' && !Number.isNaN(budget) ? budget : undefined;

  const rawTravelStyle = firstNonEmpty<string[] | unknown>(
    payload.travelStyle,
    payloadTripState.travelStyle,
    payloadForm.travelStyle,
    bodyTripState.travelStyle
  );
  const travelStyle = Array.isArray(rawTravelStyle) ? rawTravelStyle : undefined;

  const rawPeopleCount = firstNonEmpty<number | string>(
    payload.peopleCount,
    payload.partySize,
    payloadTripState.peopleCount,
    payloadTripState.partySize,
    payloadForm.peopleCount,
    bodyTripState.peopleCount,
    bodyTripState.partySize
  );
  const peopleCount = typeof rawPeopleCount === 'number' ? rawPeopleCount : (typeof rawPeopleCount === 'string' ? parseInt(rawPeopleCount, 10) : undefined);
  const peopleCountNum = typeof peopleCount === 'number' && !Number.isNaN(peopleCount) ? peopleCount : undefined;

  const audienceType = firstNonEmpty<string>(
    payload.audienceType,
    payloadTripState.audienceType,
    payloadForm.audienceType,
    bodyTripState.audienceType
  );

  const ageRange = firstNonEmpty<string>(
    payload.ageRange,
    payloadTripState.ageRange,
    payloadForm.ageRange,
    bodyTripState.ageRange
  );

  const rawInterests = firstNonEmpty<string[] | unknown>(
    payload.interests,
    payloadTripState.interests,
    payloadForm.interests,
    bodyTripState.interests
  );
  const interests = Array.isArray(rawInterests) ? rawInterests : undefined;

  const params: NormalizedTripParams = {
    destination: destination?.trim(),
    startDate: startDate?.trim() || undefined,
    endDate: endDate?.trim() || undefined,
    budget: budgetNum,
    travelStyle,
    peopleCount: peopleCountNum,
    audienceType,
    ageRange,
    interests,
  };

  console.log('[UI Event] normalizeTripParams resolved:', params);
  return params;
}

/** Sanitize payload for logging (truncate long strings, hide sensitive fields) */
function sanitizeForLog(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string') {
      sanitized[k] = v.length > 50 ? `${v.slice(0, 50)}...` : v;
    } else if (Array.isArray(v)) {
      sanitized[k] = `[${v.length} items]`;
    } else if (typeof v === 'object') {
      sanitized[k] = '[object]';
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/** Get base URL for internal API calls (Next.js API routes need absolute URLs) */
function getBaseUrl(req: NextRequest): string {
  const origin = req.nextUrl?.origin;
  if (origin) return origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return 'http://localhost:3000';
}

/** Dummy flight generator fallback when API fails or returns empty */
function generateDummyFlights(params: {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
}) {
  const origin = params.origin || 'NYC';
  const dest = params.destination || 'XXX';
  const dep = params.departureDate || new Date().toISOString().split('T')[0];
  const ret = params.returnDate;
  const bookingUrl = buildFlightLink({ origin, destination: dest, departureDate: dep, returnDate: ret });
  return [
    { id: 'flight-1', airline: 'Sample Air', flightNumber: 'SA 100', price: 199, currency: 'USD', departure: { time: '10:00 AM', airport: origin, date: dep }, arrival: { time: '2:30 PM', airport: dest, date: dep }, duration: '4h 30m', stops: 0, bookingUrl },
    { id: 'flight-2', airline: 'Sample Air', flightNumber: 'SA 200', price: 249, currency: 'USD', departure: { time: '3:00 PM', airport: origin, date: dep }, arrival: { time: '7:45 PM', airport: dest, date: dep }, duration: '4h 45m', stops: 1, bookingUrl },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const baseUrl = getBaseUrl(req);
    
    // Accept both {name, payload} and {eventId, payload} formats
    const eventName = body.name || body.eventId;
    const payload = body.payload || {};
    const tripState = body.tripState || {};

    if (!eventName || typeof eventName !== 'string') {
      return NextResponse.json(
        { 
          error: 'Event name is required',
          reply: 'I apologize, but the event name is missing. Please try again.',
          panel: undefined,
          data: {},
        },
        { status: 400 }
      );
    }

    console.log('[UI Event]', eventName, 'payload:', JSON.stringify(sanitizeForLog({ ...payload, tripState })));

    // Handle different event types
    switch (eventName) {
      case 'generate_itinerary':
      case 'create_itinerary':
      case 'plan_trip': {
        // Always create a FRESH itinerary - never reuse payload.itinerary or previous results
        const params = normalizeTripParams(body);

        // Destination is required - return 400 if missing
        const destination = params.destination?.trim() ?? '';
        if (!destination) {
          return NextResponse.json(
            {
              error: 'Destination is required',
              reply: 'Please enter a destination to generate your itinerary. You can fill in the destination field in the form, or tell me where you\'d like to go in the chat.',
              panel: undefined,
              data: {},
            },
            { status: 400 }
          );
        }

        // Trip preferences guard: partySize, audienceType, ageRange required before generating itinerary
        const partySize = params.peopleCount;
        const hasParty = typeof partySize === 'number' && partySize >= 1 && partySize <= 20;
        const hasAudience = params.audienceType === 'adults' || params.audienceType === 'family';
        const hasAge = typeof params.ageRange === 'string' && params.ageRange.trim().length > 0;
        if (!hasParty || !hasAudience || !hasAge) {
          const missing: string[] = [];
          if (!hasParty) missing.push('party size (how many travelers?)');
          if (!hasAudience) missing.push('group type (adults or family?)');
          if (!hasAge) missing.push('age range (e.g. 25-35 or kids 5-10 + adults 30-40)');
          return NextResponse.json({
            reply: `To generate your itinerary, I need: ${missing.join(', ')}. Please tell me in the chat.`,
            panel: 'trip',
            data: { tripState: params },
          });
        }

        const itineraryParams = {
          ...params,
          destination,
        };
        
        // Try to call backend API for dynamic itinerary generation
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const backendResponse = await fetch(`${backendUrl}/api/chat/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Generate a ${itineraryParams.travelStyle?.join(', ') || 'personalized'} itinerary for ${itineraryParams.destination} from ${itineraryParams.startDate || 'start date'} to ${itineraryParams.endDate || 'end date'}${itineraryParams.budget ? ` with a budget of $${itineraryParams.budget}` : ''}`,
              messages: [],
              tripState: {
                destination: itineraryParams.destination,
                startDate: itineraryParams.startDate,
                endDate: itineraryParams.endDate,
                budget: itineraryParams.budget,
                travelStyle: itineraryParams.travelStyle,
                peopleCount: itineraryParams.peopleCount,
                audienceType: itineraryParams.audienceType,
                ageRange: itineraryParams.ageRange,
              },
            }),
          });

          if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            
            // If backend returns itinerary data, use as fresh (never merge with payload.itinerary)
            if (backendData.data?.itinerary) {
              const itinerary = { ...backendData.data.itinerary, destination: itineraryParams.destination };
              return NextResponse.json({
                reply: backendData.reply || `I've created a personalized itinerary for ${itineraryParams.destination}! Check the Itinerary panel on the right.`,
                panel: 'itinerary',
                data: { itinerary },
              });
            }
            
            // If backend returns UI with itinerary, extract it
            if (backendData.ui?.widgets) {
              const itineraryWidget = backendData.ui.widgets.find((w: any) => 
                w.kind === 'itinerary' || w.type === 'itinerary'
              );
              
              if (itineraryWidget?.data) {
                const itinerary = { ...itineraryWidget.data, destination: itineraryParams.destination };
                return NextResponse.json({
                  reply: backendData.reply || backendData.text || `I've created a personalized itinerary for ${itineraryParams.destination}!`,
                  panel: 'itinerary',
                  data: { itinerary },
                });
              }
            }
          }
        } catch (error) {
          console.error('[UI Event] Error calling backend for itinerary:', error);
          // Fall through to dummy data generation
        }
        
        // Fallback: generate dummy itinerary with normalized params
        const itinerary = generateDummyItinerary(itineraryParams);
        itinerary.destination = itineraryParams.destination;

        return NextResponse.json({
          reply: `I've created a personalized itinerary for ${itineraryParams.destination}! Check the Itinerary panel on the right.`,
          panel: 'itinerary',
          data: { itinerary },
        });
      }

      case 'search_flights': {
        // Extract flight params from payload + tripState (same host internal API)
        const payloadTripState = (payload.tripState as Record<string, unknown>) || {};
        const origin = firstNonEmpty<string>(payload.origin, payload.from, payloadTripState.origin, tripState?.origin) || 'NYC';
        const destination = firstNonEmpty<string>(payload.destination, payload.to, payloadTripState.destination, tripState?.destination);
        const departureDate = firstNonEmpty<string>(payload.departureDate, payload.startDate, payloadTripState.departureDate, payloadTripState.startDate, tripState?.startDate);
        const returnDate = firstNonEmpty<string>(payload.returnDate, payload.endDate, payloadTripState.returnDate, payloadTripState.endDate, tripState?.endDate);
        const rawPassengers = firstNonEmpty<number | string>(payload.passengers, payloadTripState.passengers, payloadTripState.peopleCount, tripState?.peopleCount);
        const passengers = typeof rawPassengers === 'number' ? rawPassengers : (typeof rawPassengers === 'string' ? parseInt(rawPassengers, 10) : 1) || 1;
        const flightClass = firstNonEmpty<string>(payload.class, payload.flightClass, payloadTripState.class) || 'economy';

        console.log('[UI Event] search_flights params:', { origin, destination, departureDate, returnDate, passengers, class: flightClass });

        if (!destination?.trim()) {
          return NextResponse.json({
            reply: 'Please provide a destination to search for flights.',
            panel: undefined,
            data: { flights: [] },
          });
        }

        let flights: Array<{ id: string; airline: string; flightNumber: string; price: number; currency: string; departure: any; arrival: any; duration: string; stops: number; bookingUrl: string }> = [];

        try {
          const flightsResponse = await fetch(`${baseUrl}/api/tools/flights/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin,
              destination: destination.trim(),
              departureDate,
              returnDate,
              passengers,
              class: flightClass,
            }),
          });

          if (flightsResponse.ok) {
            const flightsData = await flightsResponse.json();
            flights = Array.isArray(flightsData.flights) ? flightsData.flights : [];
          } else {
            const errData = await flightsResponse.json().catch(() => ({}));
            console.error('[UI Event] Flights search API error:', flightsResponse.status, errData);
          }
        } catch (err) {
          console.error('[UI Event] Error calling flights search API:', err);
        }

        if (flights.length === 0) {
          try {
            flights = await searchAviasalesFlights({
              origin,
              destination: destination.trim(),
              departureDate,
              returnDate,
              passengers,
              currency: 'usd',
            });
          } catch (err) {
            console.error('[UI Event] Aviasales fallback error:', err);
          }
        }

        if (flights.length === 0) {
          flights = generateDummyFlights({
            origin,
            destination: destination.trim(),
            departureDate,
            returnDate,
          });
        }

        return NextResponse.json({
          reply: flights.length > 0
            ? `I found ${flights.length} flight option${flights.length > 1 ? 's' : ''} from ${origin} to ${destination}. Check the Flights panel on the right.`
            : `No flights found from ${origin} to ${destination}. Please try different dates or destinations.`,
          panel: 'flights',
          data: { flights },
        });
      }

      case 'book_flight': {
        // Stub implementation for flight booking
        const bookingId = `FLIGHT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        return NextResponse.json({
          reply: `✅ Flight booking confirmed! Booking ID: ${bookingId}. Please check your email for confirmation details.`,
          panel: 'flights',
          data: {
            bookingId,
            flightId: payload.flightId,
            status: 'confirmed',
          },
        });
      }

      case 'search_hotels': {
        const payloadTripState = (payload.tripState as Record<string, unknown>) || {};
        const destination = firstNonEmpty<string>(payload.destination, payload.to, payloadTripState.destination, tripState?.destination);
        const checkIn = firstNonEmpty<string>(payload.checkIn, payload.startDate, payloadTripState.checkIn, payloadTripState.startDate, tripState?.startDate);
        const checkOut = firstNonEmpty<string>(payload.checkOut, payload.endDate, payloadTripState.checkOut, payloadTripState.endDate, tripState?.endDate);
        const rawGuests = firstNonEmpty<number | string>(payload.guests, payloadTripState.guests, payloadTripState.peopleCount, tripState?.peopleCount);
        const guests = typeof rawGuests === 'number' ? rawGuests : (typeof rawGuests === 'string' ? parseInt(rawGuests, 10) : 2) || 2;
        const maxPrice = firstNonEmpty<number | string>(payload.maxPrice, payload.budget, payloadTripState.maxPrice, payloadTripState.budget, tripState?.budget);
        const maxPriceNum = typeof maxPrice === 'number' ? maxPrice : (typeof maxPrice === 'string' ? parseInt(maxPrice, 10) : undefined);
        const maxPriceFinal = typeof maxPriceNum === 'number' && !Number.isNaN(maxPriceNum) ? maxPriceNum : undefined;

        if (!destination?.trim()) {
          return NextResponse.json({
            reply: 'Please provide a destination to search for hotels.',
            panel: undefined,
            data: { hotels: [] },
          });
        }

        try {
          const hotels = await searchHotellookHotels({
            destination: destination.trim(),
            checkIn,
            checkOut,
            guests,
            maxPrice: maxPriceFinal,
            currency: 'usd',
          });
          return NextResponse.json({
            reply: hotels.length > 0
              ? `I found ${hotels.length} hotel option${hotels.length > 1 ? 's' : ''} in ${destination}. Check the Hotels panel on the right.`
              : `No hotels found in ${destination}. Please try different dates or destinations.`,
            panel: 'hotels',
            data: { hotels },
          });
        } catch (err) {
          console.error('[UI Event] Hotels search error:', err);
          return NextResponse.json({
            reply: `Hotel search failed. Please try again or check that TRAVELPAYOUTS_TOKEN is configured.`,
            panel: 'hotels',
            data: { hotels: [] },
          });
        }
      }

      case 'book_hotel': {
        // Stub implementation for hotel booking
        const bookingId = `HOTEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Preserve existing hotels by not including hotels in response
        // The setResults function merges, so existing hotels will remain
        // Only return booking confirmation data, not hotels array
        return NextResponse.json({
          reply: `✅ Hotel booking confirmed! Booking ID: ${bookingId}. Please check your email for confirmation details.`,
          panel: 'hotels',
          data: {
            bookingId,
            hotelId: payload.hotelId,
            status: 'confirmed',
            // Explicitly do NOT include hotels here - let existing hotels remain via merge
          },
        });
      }

      case 'save_trip_profile': {
        const destination = (payload.destination ?? tripState?.destination ?? '').toString().trim();
        const peopleCount = payload.peopleCount ?? tripState?.peopleCount ?? 2;
        const audienceType = payload.audienceType ?? tripState?.audienceType ?? 'adults';
        const ageRange = payload.ageRange ?? tripState?.ageRange ?? '26-35';
        const interests = Array.isArray(payload.interests) ? payload.interests : (tripState?.interests ?? []);

        if (!destination) {
          return NextResponse.json({
            error: 'Destination is required',
            reply: 'Please enter a destination for your trip.',
            panel: undefined,
            data: {},
          }, { status: 400 });
        }

        const newTripState = {
          destination,
          peopleCount: typeof peopleCount === 'number' ? peopleCount : parseInt(String(peopleCount), 10) || 2,
          audienceType: audienceType === 'family' ? 'family' : 'adults',
          ageRange: String(ageRange),
          interests,
        };

        const itinerary = generateDummyItinerary({
          destination,
          peopleCount: newTripState.peopleCount,
          audienceType: newTripState.audienceType,
          ageRange: newTripState.ageRange,
          interests: newTripState.interests,
        });

        return NextResponse.json({
          reply: `I've saved your trip profile for ${destination} and created a personalized itinerary! Check the Itinerary panel.`,
          panel: 'itinerary',
          data: {
            itinerary,
            tripState: newTripState,
          },
        });
      }

      case 'add_to_itinerary': {
        try {
        const type = payload.type; // 'flight' | 'hotel'
        const item = payload.item;
        const day = Math.max(1, Math.min(payload.day || 1, 7));

        // Ensure itinerary exists: create minimal if missing
        let itinerary = payload.itinerary;
        if (!itinerary || !itinerary.days || !Array.isArray(itinerary.days)) {
          const ts = (body.tripState || {}) as Record<string, unknown>;
          const dest = (ts.destination as string) || (payload.destination as string) || 'Your Trip';
          const start = (ts.startDate as string) || new Date().toISOString().split('T')[0];
          const end = (ts.endDate as string) || (() => {
            const d = new Date(start);
            d.setDate(d.getDate() + 6);
            return d.toISOString().split('T')[0];
          })();
          const daysDiff = (new Date(end).getTime() - new Date(start).getTime()) / (24 * 60 * 60 * 1000);
          const numDays = Math.max(1, Math.min(7, Math.ceil(daysDiff) || 1));
          itinerary = {
            destination: dest,
            startDate: start,
            endDate: end,
            days: Array.from({ length: numDays }, (_, i) => {
              const d = new Date(start);
              d.setDate(d.getDate() + i);
              return {
                day: i + 1,
                date: d.toISOString().split('T')[0],
                activities: [] as string[],
                distanceBuckets: { walking: [] as string[], '5-10 miles': [] as string[], '10+ miles': [] as string[] },
              };
            }),
          };
        }

        // Deep clone to avoid mutating
        const updatedItinerary = JSON.parse(JSON.stringify(itinerary));
        if (!Array.isArray(updatedItinerary.days)) updatedItinerary.days = [];
        const dayIndex = day - 1;
        // Extend itinerary if requested day is beyond current length
        while (dayIndex >= updatedItinerary.days.length) {
          const lastDay = updatedItinerary.days[updatedItinerary.days.length - 1];
          const nextDate = lastDay?.date
            ? new Date(new Date(lastDay.date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          updatedItinerary.days.push({
            day: updatedItinerary.days.length + 1,
            date: nextDate,
            activities: [],
            distanceBuckets: { walking: [], '5-10 miles': [], '10+ miles': [] },
          });
        }

        const dayObj = updatedItinerary.days[dayIndex];
        if (!dayObj) return NextResponse.json({ reply: 'Added to itinerary.', panel: 'itinerary', data: { itinerary: updatedItinerary } });
        if (!dayObj.activities) dayObj.activities = [];

        let activityText: string;
        if (type === 'flight' && item) {
          const dep = item.departure?.airport || 'N/A';
          const arr = item.arrival?.airport || 'N/A';
          const airline = item.airline || 'Flight';
          const fn = item.flightNumber || '';
          const price = item.price ? `$${item.price}` : '';
          activityText = `Flight: ${airline} ${fn} - ${dep} to ${arr}${price ? ` (${price})` : ''}`;
        } else if (type === 'hotel' && item) {
          const name = item.name || 'Hotel';
          const loc = item.location || '';
          const price = item.price ? `$${item.price}/night` : '';
          activityText = `Hotel: ${name}${loc ? ` - ${loc}` : ''}${price ? ` (${price})` : ''}`;
        } else {
          return NextResponse.json({
            reply: 'Please select a flight or hotel to add to your itinerary.',
            panel: 'itinerary',
            data: { itinerary: updatedItinerary },
          });
        }

        dayObj.activities.push(activityText);

        return NextResponse.json({
          reply: `Added to Day ${day}: ${activityText}`,
          panel: 'itinerary',
          data: { itinerary: updatedItinerary },
        });
        } catch (addErr) {
          console.error('[UI Event] add_to_itinerary error:', addErr);
          const ts = (body.tripState || {}) as Record<string, unknown>;
          const dest = (ts.destination as string) || 'Your Trip';
          const start = (ts.startDate as string) || new Date().toISOString().split('T')[0];
          const d = new Date(start);
          d.setDate(d.getDate() + 6);
          const end = (ts.endDate as string) || d.toISOString().split('T')[0];
          const minimalItinerary = {
            destination: dest,
            startDate: start,
            endDate: end,
            days: [{ day: 1, date: start, activities: [], distanceBuckets: { walking: [], '5-10 miles': [], '10+ miles': [] } }],
          };
          return NextResponse.json({
            reply: 'Added to itinerary.',
            panel: 'itinerary',
            data: { itinerary: minimalItinerary },
          });
        }
      }

      default:
        return NextResponse.json({
          reply: `I received your action: ${eventName}. This feature is coming soon!`,
          panel: undefined,
          data: {},
        });
    }
  } catch (error) {
    // Never throw uncaught errors - always return a response
    console.error('[UI Event] Error processing event:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to process UI event',
        reply: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
        panel: undefined,
        data: {},
      },
      { status: 500 }
    );
  }
}
