/**
 * Flights Search API
 * POST /api/tools/flights/search
 * Uses Travelpayouts Aviasales API for real flight data.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchAviasalesFlights } from '@/lib/aviasales';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { origin, destination, departureDate, returnDate, passengers, class: flightClass, userId } = body;

    console.log('[Tools Flights] Search request received:', {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      class: flightClass,
      userId,
    });

    // Validate required fields
    if (!destination) {
      return NextResponse.json(
        {
          success: false,
          error: 'Destination is required',
          flights: [],
          count: 0,
        },
        { status: 400 }
      );
    }

    const flights = await searchAviasalesFlights({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      currency: 'usd',
    });

    console.log('[Tools Flights] Aviasales API returned:', {
      count: flights.length,
      destination,
      origin,
    });

    return NextResponse.json({
      success: true,
      flights,
      count: flights.length,
    });
  } catch (error) {
    console.error('[Tools Flights] Error searching flights:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search flights',
        message: error instanceof Error ? error.message : 'Unknown error',
        flights: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
