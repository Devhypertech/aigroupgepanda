/**
 * Tools API Routes
 * Endpoints for external tool integrations (hotels, flights, etc.)
 */

import { Router } from 'express';
import { z } from 'zod';
import { searchHotels, searchFlights } from '../services/travel/travelpayouts.js';

const router = Router();

// Request validation schemas
const hotelsSearchSchema = z.object({
  destination: z.string().min(1),
  checkIn: z.string().optional(), // YYYY-MM-DD
  checkOut: z.string().optional(), // YYYY-MM-DD
  guests: z.number().int().positive().default(2),
  maxPrice: z.number().positive().optional(),
});

const flightsSearchSchema = z.object({
  origin: z.string().min(1), // IATA code or city name
  destination: z.string().min(1), // IATA code or city name
  departureDate: z.string().optional(), // YYYY-MM-DD
  returnDate: z.string().optional(), // YYYY-MM-DD
  passengers: z.number().int().positive().default(1),
  class: z.enum(['economy', 'business', 'first']).optional(),
});

/**
 * POST /api/tools/hotels.search
 * Search for hotels
 */
router.post('/hotels.search', async (req, res) => {
  try {
    const validationResult = hotelsSearchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const params = validationResult.data;
    
    // Use tripState dates if provided, otherwise use defaults
    const checkIn = params.checkIn || new Date().toISOString().split('T')[0];
    const checkOut = params.checkOut || (() => {
      const date = new Date(checkIn);
      date.setDate(date.getDate() + 3); // Default 3 nights
      return date.toISOString().split('T')[0];
    })();

    const results = await searchHotels({
      destination: params.destination,
      checkIn,
      checkOut,
      guests: params.guests,
      maxPrice: params.maxPrice,
    });

    return res.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('[Tools] Error searching hotels:', error);
    return res.status(500).json({
      error: 'Failed to search hotels',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/tools/flights.search
 * Search for flights
 */
router.post('/flights.search', async (req, res) => {
  try {
    const validationResult = flightsSearchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.issues,
      });
    }

    const params = validationResult.data;
    
    // Use tripState dates if provided, otherwise use defaults
    const departureDate = params.departureDate || new Date().toISOString().split('T')[0];

    const results = await searchFlights({
      origin: params.origin,
      destination: params.destination,
      departureDate,
      returnDate: params.returnDate,
      passengers: params.passengers,
      class: params.class || 'economy',
    });

    return res.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('[Tools] Error searching flights:', error);
    return res.status(500).json({
      error: 'Failed to search flights',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

