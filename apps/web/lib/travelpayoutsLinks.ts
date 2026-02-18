/**
 * Travelpayouts affiliate link builders.
 * Uses White Label style deeplinks (no external API calls).
 * Marker 613624 for affiliate tracking.
 */

const DEFAULT_MARKER = '613624';

function getMarker(): string {
  return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER) || DEFAULT_MARKER;
}

/** Convert city/airport name to IATA code (3 letters) for Aviasales */
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
  return s.substring(0, 3).padEnd(3, 'X');
}

/** Format date as DDMM for Aviasales flightSearch */
function toDDMM(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return day + month;
}

/**
 * Build Travelpayouts flight search deeplink (Aviasales).
 * Format: /search/ORIGINDATE1DESTDATE2passengers?marker=...
 */
export function buildFlightLink(params: {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
}): string {
  const origin = toIata(params.origin || 'NYC');
  const dest = toIata(params.destination || 'XXX');
  const depDDMM = toDDMM(params.departureDate) || toDDMM(new Date().toISOString().split('T')[0]);
  const retDDMM = params.returnDate ? toDDMM(params.returnDate) : '';
  const passengers = '1';
  const path = retDDMM ? `${origin}${depDDMM}${dest}${retDDMM}${passengers}` : `${origin}${depDDMM}${dest}${passengers}`;
  const url = new URL(`https://www.aviasales.com/search/${path}`);
  url.searchParams.set('marker', getMarker());
  return url.toString();
}

/**
 * Build Travelpayouts hotel search deeplink (Hotellook).
 */
export function buildHotelLink(params: {
  hotelName?: string;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
}): string {
  const url = new URL('https://search.hotellook.com/');
  url.searchParams.set('marker', getMarker());
  url.searchParams.set('locale', 'en_US');
  if (params.destination?.trim()) {
    url.searchParams.set('destination', params.destination.trim());
  }
  if (params.checkIn?.trim()) {
    url.searchParams.set('checkIn', params.checkIn.trim());
  }
  if (params.checkOut?.trim()) {
    url.searchParams.set('checkOut', params.checkOut.trim());
  }
  if (params.hotelName?.trim()) {
    url.searchParams.set('hotel', params.hotelName.trim());
  }
  return url.toString();
}

/** Ensure affiliate marker is present in Travelpayouts URLs (aviasales, hotellook). */
export function ensureAffiliateMarker(url: string): string {
  if (!url?.trim()) return url;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const isTravelpayouts =
      host.includes('aviasales.com') ||
      host.includes('hotellook.com') ||
      host.includes('jetradar.com') ||
      host.includes('travelpayouts.com');
    if (isTravelpayouts && !u.searchParams.has('marker')) {
      u.searchParams.set('marker', getMarker());
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}
