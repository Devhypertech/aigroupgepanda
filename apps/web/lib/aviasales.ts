/**
 * Aviasales (Travelpayouts) flight search API.
 * Uses TRAVELPAYOUTS_TOKEN and NEXT_PUBLIC_TRAVELPAYOUTS_MARKER.
 */

import { getTravelpayoutsToken, getMarker } from './travelpayouts';

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
  return s.substring(0, 3).padEnd(3, 'X');
}

/** Format ISO datetime to time string (e.g. "10:30 AM") */
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Format ISO datetime to date string (YYYY-MM-DD) */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/** Format duration in minutes to "Xh Ym" */
function formatDuration(minutes?: number): string {
  if (typeof minutes !== 'number' || minutes < 0) return 'N/A';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export interface AviasalesFlight {
  id: string;
  airline: string;
  flightNumber: string;
  price: number;
  currency: string;
  departure: { time: string; airport: string; date: string };
  arrival: { time: string; airport: string; date: string };
  duration: string;
  stops: number;
  bookingUrl: string;
}

interface AviasalesApiItem {
  origin?: string;
  destination?: string;
  origin_airport?: string;
  destination_airport?: string;
  price?: number;
  airline?: string;
  flight_number?: string;
  departure_at?: string;
  return_at?: string;
  transfers?: number;
  return_transfers?: number;
  duration?: number;
  duration_to?: number;
  duration_back?: number;
  link?: string;
}

export async function searchAviasalesFlights(params: {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  currency?: string;
}): Promise<AviasalesFlight[]> {
  const token = getTravelpayoutsToken();
  if (!token?.trim()) {
    console.warn('[Aviasales] TRAVELPAYOUTS_TOKEN not configured');
    return [];
  }

  const originIata = toIata(params.origin || 'NYC');
  const destIata = toIata(params.destination || 'XXX');
  const depDate = params.departureDate || new Date().toISOString().split('T')[0];
  const retDate = params.returnDate;
  const currency = params.currency || 'usd';
  const marker = getMarker();

  const url = new URL('https://api.travelpayouts.com/aviasales/v3/prices_for_dates');
  url.searchParams.set('origin', originIata);
  url.searchParams.set('destination', destIata);
  url.searchParams.set('departure_at', depDate);
  if (retDate) url.searchParams.set('return_at', retDate);
  url.searchParams.set('currency', currency);
  url.searchParams.set('limit', '30');
  url.searchParams.set('one_way', retDate ? 'false' : 'true');
  url.searchParams.set('direct', 'false');
  url.searchParams.set('sorting', 'price');
  url.searchParams.set('token', token);

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Accept-Encoding': 'gzip, deflate' },
    });
    if (!res.ok) {
      console.error('[Aviasales] API error:', res.status, await res.text());
      return [];
    }
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      console.warn('[Aviasales] No data or error:', json.error);
      return [];
    }

    const items = json.data as AviasalesApiItem[];
    return items.map((item, idx) => {
      const depAt = item.departure_at || '';
      const retAt = item.return_at || '';
      const origAirport = item.origin_airport || item.origin || originIata;
      const destAirport = item.destination_airport || item.destination || destIata;
      const durationMin = item.duration_to ?? item.duration ?? 0;
      const depDateObj = depAt ? new Date(depAt) : new Date(depDate);
      const arrivalDateObj = new Date(depDateObj.getTime() + durationMin * 60 * 1000);

      const link = item.link || '';
      const baseUrl = 'https://www.aviasales.com';
      const fullLink = link.startsWith('http') ? link : `${baseUrl}${link.startsWith('/') ? '' : '/'}${link}`;
      const bookingUrl = new URL(fullLink);
      bookingUrl.searchParams.set('marker', marker);

      return {
        id: `flight-${idx + 1}`,
        airline: item.airline || 'N/A',
        flightNumber: String(item.flight_number || item.airline || ''),
        price: item.price ?? 0,
        currency: currency.toUpperCase(),
        departure: {
          time: formatTime(depAt),
          airport: origAirport,
          date: formatDate(depAt) || depDate,
        },
        arrival: {
          time: formatTime(arrivalDateObj.toISOString()),
          airport: destAirport,
          date: formatDate(arrivalDateObj.toISOString()) || formatDate(depAt) || depDate,
        },
        duration: formatDuration(durationMin),
        stops: item.transfers ?? 0,
        bookingUrl: bookingUrl.toString(),
      };
    });
  } catch (err) {
    console.error('[Aviasales] Fetch error:', err);
    return [];
  }
}
