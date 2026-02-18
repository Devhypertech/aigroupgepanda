/**
 * Hotel Card Component
 * Renders a hotel card with name, location, price, rating, and view button
 */

'use client';

interface HotelCardProps {
  hotel: {
    id?: string;
    title: string;
    name?: string;
    subtitle?: string;
    neighborhood?: string;
    area?: string;
    price?: string | number;
    pricePerNight?: string | number;
    currency?: string;
    rating?: number;
    imageUrl?: string;
    url?: string;
    action?: {
      type: string;
      payload?: any;
    };
  };
  onAction?: (action: { type: string; payload?: any }, hotel: any) => void;
}

export function HotelCard({ hotel, onAction }: HotelCardProps) {
  const formatPrice = (price?: string | number, currency?: string) => {
    if (!price) return null;
    const currencySymbol = currency === 'USD' ? '$' : currency || '$';
    const priceValue = typeof price === 'string' ? parseFloat(price) : price;
    return `${currencySymbol}${priceValue.toFixed(2)}`;
  };

  const formatRating = (rating?: number) => {
    if (!rating) return null;
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  };

  const handleView = () => {
    if (hotel.url) {
      window.open(hotel.url, '_blank', 'noopener,noreferrer');
    } else if (onAction) {
      onAction({ type: 'open_url', payload: { url: hotel.url } }, hotel);
    }
  };

  const hotelName = hotel.name || hotel.title;
  const location = hotel.neighborhood || hotel.area || hotel.subtitle;
  const price = hotel.pricePerNight || hotel.price;

  return (
    <div className="bg-gp-surface border border-gp-border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col">
      {hotel.imageUrl && (
        <div className="w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          <img
            src={hotel.imageUrl}
            alt={hotelName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <h4 className="text-gp-text font-semibold text-base mb-1 line-clamp-2">{hotelName}</h4>
        {location && (
          <p className="text-gp-muted text-xs mb-2 line-clamp-1">{location}</p>
        )}
        {hotel.rating && (
          <p className="text-gp-primary text-sm mb-2">{formatRating(hotel.rating)}</p>
        )}
        {price && (
          <p className="text-gp-text font-bold text-lg mb-3">
            {formatPrice(price, hotel.currency)}/night
          </p>
        )}
        <button
          onClick={handleView}
          className="w-full px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-white font-medium rounded-lg transition-colors text-sm mt-auto"
        >
          View
        </button>
      </div>
    </div>
  );
}

