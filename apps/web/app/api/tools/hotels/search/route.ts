/**
 * Hotels Search API
 * POST /api/tools/hotels/search
 * Uses Travelpayouts Hotellook API (cache.json / search flow).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { searchHotellookHotels } from '@/lib/hotellook';
import { buildHotelLink } from '@/lib/travelpayoutsLinks';

function generateDummyHotels(params: { destination: string; checkIn?: string; checkOut?: string }) {
  const dest = params.destination || 'Your Destination';
  const bookingUrl = buildHotelLink({ destination: dest, checkIn: params.checkIn, checkOut: params.checkOut });
  return [
    { id: 'hotel-1', name: `${dest} Hotel`, price: 120, currency: 'USD', rating: 4.2, imageUrl: undefined, bookingUrl },
    { id: 'hotel-2', name: `${dest} Grand`, price: 180, currency: 'USD', rating: 4.5, imageUrl: undefined, bookingUrl },
    { id: 'hotel-3', name: `${dest} Suites`, price: 95, currency: 'USD', rating: 4.0, imageUrl: undefined, bookingUrl },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, checkIn, checkOut, guests, maxPrice, userId } = body;

    console.log('[Tools Hotels] Search request received:', {
      destination,
      checkIn,
      checkOut,
      guests,
      maxPrice,
      userId,
    });

    // Validate required fields
    if (!destination) {
      return NextResponse.json(
        {
          success: false,
          error: 'Destination is required',
          hotels: [],
          count: 0,
        },
        { status: 400 }
      );
    }

    let hotels: Array<{ id: string; name: string; price: number; currency: string; rating: number; imageUrl?: string; bookingUrl: string }>;
    let useDummy = false;
    try {
      hotels = await searchHotellookHotels({
        destination,
        checkIn,
        checkOut,
        guests,
        maxPrice,
        currency: 'usd',
      });
    } catch (apiError) {
      console.error('[Tools Hotels] Travelpayouts API error:', apiError);
      hotels = generateDummyHotels({ destination, checkIn, checkOut });
      useDummy = true;
    }

    if (!Array.isArray(hotels) || hotels.length === 0) {
      hotels = generateDummyHotels({ destination, checkIn, checkOut });
      useDummy = true;
    }

    return NextResponse.json({
      success: true,
      hotels,
      count: hotels.length,
      ...(useDummy && { source: 'dummy' }),
    });
  } catch (error) {
    console.error('[Tools Hotels] Error searching hotels:', error);
    const hotels = generateDummyHotels({ destination: 'Your Destination' });
    return NextResponse.json({
      success: true,
      hotels,
      count: hotels.length,
      source: 'dummy',
    });
  }
}

