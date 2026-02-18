/**
 * Hotellook (Travelpayouts) hotel search API.
 * Uses lookup → search/start → cache.json (getResult) flow.
 * TRAVELPAYOUTS_TOKEN and marker 613624.
 *
 * Map: hotelName->name, priceFrom->price, stars->rating, hotelId->bookingUrl
 */

import { createHash } from 'crypto';
import { getTravelpayoutsToken, getTravelpayoutsMarker } from './travelpayouts';
import { buildHotelLink } from './travelpayoutsLinks';

const API_BASE = 'https://engine.hotellook.com/api/v2';
const FETCH_TIMEOUT_MS = 10_000;

/** Fetch with 10s timeout; on !ok log status and first 200 chars of body */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      console.error(`[Hotellook] Response not ok: ${res.status} ${res.statusText}`, text.slice(0, 200));
    }
    return res;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

/** Build query string with encoded params */
function buildQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export interface HotellookHotel {
  id: string;
  name: string;
  price: number;
  currency: string;
  rating: number;
  location?: string;
  imageUrl?: string;
  bookingUrl: string;
}

interface LookupLocation {
  id: string;
  cityName?: string;
  fullName?: string;
  hotelsCount?: string;
}

interface LookupResponse {
  status?: string;
  results?: {
    locations?: LookupLocation[];
    hotels?: unknown[];
  };
}

/** Price API cache.json response item (hotelName, priceFrom, stars, hotelId) */
interface CachePriceItem {
  hotelId?: number;
  hotelName?: string;
  priceFrom?: number;
  priceAvg?: number;
  stars?: number;
  locationId?: number;
  location?: { name?: string; country?: string };
}

/** Search getResult response item */
interface GetResultItem {
  id?: number;
  name?: string;
  price?: number;
  stars?: number;
  fullUrl?: string;
  address?: string;
  guestScore?: number;
  photoCount?: number;
}

/** Build signature for Hotellook API: MD5(token:marker:sorted_param_values) */
function buildSignature(token: string, marker: string, params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  const values = keys.map((k) => params[k]);
  const src = [token, marker, ...values].join(':');
  return createHash('md5').update(src).digest('hex');
}

/** Lookup city/location by name to get cityId */
async function lookupCity(query: string): Promise<string | null> {
  const params = {
    query: query.trim(),
    lang: 'en',
    lookFor: 'city',
    limit: '5',
  };
  const url = `${API_BASE}/lookup.json?${buildQuery(params)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;

  const data = (await res.json()) as LookupResponse;
  const locs = data.results?.locations;
  if (!locs?.length) return null;

  const first = locs[0];
  return first.id || null;
}

/** Try cache.json (Price API) - returns hotelName, priceFrom, stars, hotelId */
async function fetchCacheJson(params: {
  token: string;
  marker: string;
  locationId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  currency: string;
  limit: number;
}): Promise<CachePriceItem[]> {
  const q = buildQuery({
    locationId: params.locationId,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: String(params.adults),
    currency: params.currency,
    limit: String(params.limit),
    marker: params.marker,
    token: params.token,
  });
  const res = await fetchWithTimeout(`${API_BASE}/cache.json?${q}`);
  if (!res.ok) return [];

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Search hotels via lookup → search/start → getResult (or cache.json fallback) */
export async function searchHotellookHotels(params: {
  destination: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  maxPrice?: number;
  currency?: string;
}): Promise<HotellookHotel[]> {
  const token = getTravelpayoutsToken();
  if (!token?.trim()) {
    console.warn('[Hotellook] TRAVELPAYOUTS_TOKEN not configured');
    return [];
  }

  const marker = getTravelpayoutsMarker();
  const destination = (params.destination || '').trim();
  if (!destination) return [];

  const checkIn = params.checkIn || new Date().toISOString().split('T')[0];
  const checkOut =
    params.checkOut ||
    (() => {
      const d = new Date(checkIn);
      d.setDate(d.getDate() + 2);
      return d.toISOString().split('T')[0];
    })();
  const adults = Math.max(1, params.guests ?? 2);
  const currency = (params.currency || 'usd').toLowerCase();
  const lang = 'en';

  const cityId = await lookupCity(destination);
  if (!cityId) {
    console.warn('[Hotellook] No city found for:', destination);
    return [];
  }

  // Try cache.json first (user-requested endpoint)
  const cacheItems = await fetchCacheJson({
    token,
    marker,
    locationId: cityId,
    checkIn,
    checkOut,
    adults,
    currency,
    limit: 30,
  });

  if (cacheItems.length > 0) {
    const maxPrice = params.maxPrice;
    let hotels: HotellookHotel[] = cacheItems.map((h, idx) => {
      const name = h.hotelName || `Hotel ${idx + 1}`;
      const price = h.priceFrom ?? h.priceAvg ?? 0;
      const stars = h.stars ?? 0;
      const hotelId = h.hotelId ?? idx;

      const bookingUrl = buildHotelLink({
        destination,
        hotelName: name,
        checkIn,
        checkOut,
      });

      return {
        id: String(hotelId),
        name,
        price,
        currency: currency.toUpperCase(),
        rating: Math.min(5, Math.max(0, stars)),
        location: h.location?.name,
        imageUrl: `https://photo.hotellook.com/image_v2/limit/h${hotelId}_1/800/520.auto`,
        bookingUrl,
      };
    });

    if (typeof maxPrice === 'number' && maxPrice > 0) {
      hotels = hotels.filter((h) => h.price <= maxPrice);
    }
    return hotels;
  }

  // Fallback: search/start → getResult
  const searchParams: Record<string, string> = {
    cityId,
    checkIn,
    checkOut,
    adultsCount: String(adults),
    childrenCount: '0',
    lang,
    currency: currency.toUpperCase(),
  };

  const signature = buildSignature(token, marker, searchParams);
  const searchQ = buildQuery({ ...searchParams, marker, signature });
  const searchRes = await fetchWithTimeout(`${API_BASE}/search/start.json?${searchQ}`);
  if (!searchRes.ok) return [];

  const searchData = (await searchRes.json()) as { searchId?: number; status?: string };
  const searchId = searchData.searchId;
  if (searchId == null || searchId <= 0) return [];

  const cacheParams: Record<string, string> = {
    searchId: String(searchId),
    limit: '30',
    sortBy: 'price',
    sortAsc: '1',
  };
  const cacheSig = buildSignature(token, marker, cacheParams);
  const cacheQ = buildQuery({ ...cacheParams, marker, signature: cacheSig });
  const cacheRes = await fetchWithTimeout(`${API_BASE}/search/getResult.json?${cacheQ}`);
  if (!cacheRes.ok) return [];

  const cacheData = (await cacheRes.json()) as { status?: string; result?: GetResultItem[] };
  const results = cacheData.result;
  if (!Array.isArray(results) || results.length === 0) return [];

  const maxPrice = params.maxPrice;
  let hotels: HotellookHotel[] = results.map((h, idx) => {
    const price = h.price ?? 0;
    const name = h.name || `Hotel ${idx + 1}`;
    const stars = h.stars ?? 0;
    const rating = typeof h.guestScore === 'number' ? h.guestScore / 10 : stars;

    const bookingUrl =
      h.fullUrl?.trim() ||
      buildHotelLink({ destination, hotelName: name, checkIn, checkOut });

    return {
      id: String(h.id ?? `hotel-${idx + 1}`),
      name,
      price,
      currency: currency.toUpperCase(),
      rating: Math.min(5, Math.max(0, rating)),
      location: h.address,
      imageUrl:
        h.photoCount && h.id
          ? `https://photo.hotellook.com/image_v2/limit/h${h.id}_1/800/520.auto`
          : undefined,
      bookingUrl,
    };
  });

  if (typeof maxPrice === 'number' && maxPrice > 0) {
    hotels = hotels.filter((h) => h.price <= maxPrice);
  }
  return hotels;
}
