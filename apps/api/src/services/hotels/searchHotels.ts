/**
 * Hotel Search Service
 * Searches for hotels using SerpAPI Google Hotels
 * Returns normalized hotel data for UI rendering
 */

const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;
const SERPAPI_API_URL = 'https://serpapi.com/search.json';

export interface SearchHotelsOptions {
  city: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults?: number;
  rooms?: number;
  budget?: number;
  neighborhoodPreference?: 'city_center' | 'quiet' | 'restaurants' | 'nightlife' | 'family';
}

export interface Hotel {
  id: string;
  name: string;
  pricePerNight: number;
  currency: string;
  rating?: number;
  neighborhood?: string;
  area?: string;
  imageUrl: string;
  url: string;
  source: string;
}

/**
 * Search for hotels using SerpAPI Google Hotels
 * Returns exactly 5 hotels
 */
export async function searchHotels(options: SearchHotelsOptions): Promise<Hotel[]> {
  const logPrefix = '[HOTEL_SEARCH]';
  const { city, checkIn, checkOut, adults = 2, rooms = 1, budget, neighborhoodPreference } = options;

  if (!city || city.trim().length === 0) {
    console.warn(`${logPrefix} Empty city provided`);
    return [];
  }

  if (!checkIn || !checkOut) {
    console.warn(`${logPrefix} Missing check-in or check-out dates`);
    return [];
  }

  if (!SERPAPI_API_KEY) {
    console.warn(`${logPrefix} SERPAPI_API_KEY not configured`);
    return [];
  }

  console.log(`${logPrefix} Searching hotels:`, {
    city: city.trim(),
    checkIn,
    checkOut,
    adults,
    rooms,
    budget,
    neighborhoodPreference,
  });

  try {
    // Build SerpAPI Google Hotels search parameters
    const params = new URLSearchParams({
      engine: 'google_hotels',
      q: `hotels in ${city.trim()}`,
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: adults.toString(),
      rooms: rooms.toString(),
      api_key: SERPAPI_API_KEY,
      gl: 'us', // Country code
      hl: 'en', // Language
    });

    // Add budget filter if provided
    if (budget) {
      params.append('max_price', budget.toString());
    }

    const url = `${SERPAPI_API_URL}?${params.toString()}`;
    
    console.log(`${logPrefix} Calling SerpAPI Google Hotels...`);

    // Add timeout (15 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`SerpAPI request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;

    // Handle SerpAPI errors
    if (data.error) {
      console.error(`${logPrefix} SerpAPI API error:`, data.error);
      
      // Check for rate limit
      if (data.error.includes('rate limit') || data.error.includes('429')) {
        console.warn(`${logPrefix} Rate limit detected, returning empty results gracefully`);
        return [];
      }
      
      return [];
    }

    // Extract hotel results from SerpAPI response
    // SerpAPI Google Hotels response structure may vary, so we handle multiple possible formats
    let hotels: any[] = [];
    
    if (data.properties && Array.isArray(data.properties)) {
      hotels = data.properties;
    } else if (data.hotels && Array.isArray(data.hotels)) {
      hotels = data.hotels;
    } else if (data.results && Array.isArray(data.results)) {
      hotels = data.results;
    } else if (Array.isArray(data)) {
      hotels = data;
    }

    if (!Array.isArray(hotels) || hotels.length === 0) {
      console.warn(`${logPrefix} No hotels found in SerpAPI response`);
      return [];
    }

    // Normalize hotels to Hotel format
    const normalizedHotels: Hotel[] = hotels.slice(0, 10).map((hotel: any, index: number) => {
      // Extract price per night
      let pricePerNight = 0;
      let currency = 'USD';

      if (hotel.price) {
        if (typeof hotel.price === 'number') {
          pricePerNight = hotel.price;
        } else if (typeof hotel.price === 'string') {
          const priceMatch = hotel.price.match(/([\d,]+\.?\d*)/);
          if (priceMatch) {
            pricePerNight = parseFloat(priceMatch[1].replace(/,/g, ''));
          }
        }
      } else if (hotel.price_per_night) {
        pricePerNight = typeof hotel.price_per_night === 'number' 
          ? hotel.price_per_night 
          : parseFloat(String(hotel.price_per_night).replace(/[^\d.]/g, '')) || 0;
      }

      // Extract currency
      if (hotel.currency) {
        currency = hotel.currency;
      } else if (hotel.price && typeof hotel.price === 'string') {
        if (hotel.price.includes('$')) currency = 'USD';
        else if (hotel.price.includes('€')) currency = 'EUR';
        else if (hotel.price.includes('£')) currency = 'GBP';
      }

      // Extract rating
      let rating: number | undefined;
      if (hotel.rating) {
        rating = typeof hotel.rating === 'number' ? hotel.rating : parseFloat(String(hotel.rating));
      } else if (hotel.stars) {
        rating = typeof hotel.stars === 'number' ? hotel.stars : parseFloat(String(hotel.stars));
      }

      // Extract neighborhood/area
      const neighborhood = hotel.neighborhood || hotel.area || hotel.location || hotel.district || '';

      // Extract image
      const imageUrl = hotel.image || hotel.thumbnail || hotel.photo || hotel.imageUrl || '';

      // Extract URL
      const url = hotel.link || hotel.url || hotel.booking_url || hotel.website || '';

      return {
        id: hotel.id || hotel.hotel_id || `hotel_${index}_${Date.now()}`,
        name: hotel.name || hotel.title || 'Unnamed Hotel',
        pricePerNight,
        currency,
        rating,
        neighborhood,
        area: neighborhood,
        imageUrl,
        url,
        source: 'serpapi_google_hotels',
      };
    });

    // Filter by neighborhood preference if provided
    let filteredHotels = normalizedHotels;
    if (neighborhoodPreference) {
      const preferenceKeywords: Record<string, string[]> = {
        city_center: ['downtown', 'center', 'central', 'city centre'],
        quiet: ['quiet', 'residential', 'suburb', 'peaceful'],
        restaurants: ['restaurant', 'dining', 'food', 'culinary'],
        nightlife: ['nightlife', 'entertainment', 'bar', 'club', 'party'],
        family: ['family', 'kid', 'children', 'playground'],
      };

      const keywords = preferenceKeywords[neighborhoodPreference] || [];
      if (keywords.length > 0) {
        filteredHotels = normalizedHotels.filter(hotel => {
          const searchText = `${hotel.name} ${hotel.neighborhood} ${hotel.area}`.toLowerCase();
          return keywords.some(keyword => searchText.includes(keyword));
        });

        // If filtering removed all hotels, use original list
        if (filteredHotels.length === 0) {
          filteredHotels = normalizedHotels;
        }
      }
    }

    // Sort by rating (higher first), then by price (lower first)
    filteredHotels.sort((a, b) => {
      if (a.rating && b.rating) {
        return b.rating - a.rating;
      }
      if (a.rating && !b.rating) return -1;
      if (!a.rating && b.rating) return 1;
      return a.pricePerNight - b.pricePerNight;
    });

    // Return exactly 5 hotels
    const result = filteredHotels.slice(0, 5);

    console.log(`${logPrefix} ✅ Found ${result.length} hotels (requested 5)`);

    return result;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      console.error(`${logPrefix} Request timeout (15s) for city:`, city);
    } else if (error.message && (
      error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('too many requests')
    )) {
      console.warn(`${logPrefix} Rate limit detected, returning empty results gracefully`);
      return [];
    } else {
      console.error(`${logPrefix} Error searching hotels:`, error instanceof Error ? error.message : String(error));
    }
    return [];
  }
}

