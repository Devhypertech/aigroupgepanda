/**
 * Flights API Routes
 * POST /api/flights/search - Search flights via Travelpayouts
 * GET  /api/flights/deeplink - Build Aviasales deeplink URL
 */

import { Router } from 'express';
import { z } from 'zod';
import { searchFlights, buildFlightDeeplink } from '../services/travel/travelpayouts.js';

const router = Router();

const searchSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  departDate: z.string().optional(),
  returnDate: z.string().optional(),
  adults: z.number().int().min(1).max(9).optional().default(1),
  cabin: z.enum(['economy', 'business', 'first']).optional().default('economy'),
  directOnly: z.boolean().optional().default(false),
});

/**
 * POST /api/flights/search
 * Body: { origin, destination, departDate?, returnDate?, adults?, cabin?, directOnly? }
 * Returns: { flights: Array<{ price, airline, legs, stops, duration, deeplinkUrl, ... }> }
 */
router.post('/search', async (req, res) => {
  const logPrefix = '[FLIGHTS_SEARCH]';
  try {
    const parsed = searchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.issues },
      });
    }

    const { origin, destination, departDate, returnDate, adults, cabin, directOnly } = parsed.data;
    const departureDate = departDate || new Date().toISOString().split('T')[0];

    console.log(`${logPrefix} origin=${origin} destination=${destination} departDate=${departureDate} returnDate=${returnDate || 'one-way'}`);

    const results = await searchFlights({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers: adults,
      class: cabin,
      directOnly,
    });

    const flights = results.slice(0, 10).map((f) => ({
      id: f.id,
      price: f.price,
      currency: f.currency,
      airline: f.airline,
      flightNumber: f.flightNumber,
      legs: [
        {
          departure: f.departure,
          arrival: f.arrival,
          duration: f.duration,
        },
      ],
      stops: f.stops,
      duration: f.duration,
      deeplinkUrl: f.deeplinkUrl || f.bookingUrl,
      bookingUrl: f.bookingUrl,
    }));

    console.log(`${logPrefix} Returning ${flights.length} flights`);
    return res.json({ flights, count: flights.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Flight search failed';
    console.error(`${logPrefix} Error:`, message);
    if (message.includes('provider auth failed')) {
      return res.status(503).json({
        error: { code: 'PROVIDER_AUTH_FAILED', message: 'Flight search temporarily unavailable (provider auth failed).' },
        flights: [],
      });
    }
    return res.status(500).json({
      error: { code: 'FLIGHT_SEARCH_FAILED', message },
      flights: [],
    });
  }
});

/**
 * GET /api/flights/deeplink
 * Query: origin, destination, departDate?, returnDate?
 * Returns: { url: string }
 */
router.get('/deeplink', (req, res) => {
  const origin = (req.query.origin as string) || 'NYC';
  const destination = (req.query.destination as string) || 'LAX';
  const departDate = req.query.departDate as string | undefined;
  const returnDate = req.query.returnDate as string | undefined;
  const url = buildFlightDeeplink({ origin, destination, departureDate: departDate, returnDate });
  return res.json({ url });
});

export default router;
