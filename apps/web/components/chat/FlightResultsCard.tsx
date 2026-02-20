/**
 * Flight Results Card Component
 * Renders a single flight option with airline, times, duration, price, and Book / Ask Follow-up / Change dates actions
 */

'use client';

interface FlightResultsCardProps {
  flight: {
    id?: string;
    airline: string;
    flightNumber?: string;
    price: number;
    currency?: string;
    stops: number;
    duration: string;
    departure?: { airport?: string; time?: string; date?: string };
    arrival?: { airport?: string; time?: string; date?: string };
    deeplinkUrl?: string;
    bookingUrl?: string;
  };
  onAction?: (action: { type: string; payload?: any }) => void;
}

export function FlightResultsCard({ flight, onAction }: FlightResultsCardProps) {
  const url = flight.deeplinkUrl || flight.bookingUrl;
  const currency = flight.currency || 'USD';
  const priceStr = currency === 'USD' ? `$${flight.price}` : `${flight.price} ${currency}`;
  const dep = flight.departure;
  const arr = flight.arrival;
  const depTime = dep?.time || '—';
  const arrTime = arr?.time || '—';
  const depAirport = dep?.airport || '—';
  const arrAirport = arr?.airport || '—';

  const handleBookNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    onAction?.({ type: 'open_url', payload: { url, label: 'Book Now' } });
  };

  const handleAskFollowUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const message = `Tell me more about ${flight.airline} ${flight.flightNumber || ''} - ${priceStr}`;
    onAction?.({ type: 'send_message', payload: { message } });
  };

  const handleChangeDates = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAction?.({ type: 'open_modal', payload: { modalType: 'dates' } });
  };

  return (
    <div className="bg-gp-surface border border-gp-border rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-gp-text font-semibold">{flight.airline}</span>
        <span className="text-gp-primary font-bold text-lg">{priceStr}</span>
      </div>
      <div className="flex items-center gap-2 text-gp-muted text-sm">
        <span>{depTime}</span>
        <span>{depAirport}</span>
        <span className="text-gp-text">→</span>
        <span>{arrTime}</span>
        <span>{arrAirport}</span>
      </div>
      <div className="flex items-center gap-3 text-gp-muted text-xs">
        <span>{flight.duration}</span>
        <span>{flight.stops === 0 ? 'Direct' : `${flight.stops} stop(s)`}</span>
      </div>
      <div className="flex flex-wrap gap-2 mt-1">
        <button
          type="button"
          onClick={handleBookNow}
          className="px-3 py-1.5 bg-gp-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ pointerEvents: 'auto' }}
        >
          Book Now
        </button>
        <button
          type="button"
          onClick={handleAskFollowUp}
          className="px-3 py-1.5 bg-gp-surface border border-gp-border text-gp-text rounded-lg text-sm hover:bg-gp-hover transition-colors"
          style={{ pointerEvents: 'auto' }}
        >
          Ask Follow-up
        </button>
        <button
          type="button"
          onClick={handleChangeDates}
          className="px-3 py-1.5 bg-gp-surface border border-gp-border text-gp-text rounded-lg text-sm hover:bg-gp-hover transition-colors"
          style={{ pointerEvents: 'auto' }}
        >
          Change dates
        </button>
      </div>
    </div>
  );
}
