/**
 * Product Card Component
 * Renders a product card with image, title, price, and action buttons
 */

'use client';

interface ProductCardProps {
  product: {
    id?: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    price?: string | number;
    currency?: string;
    provider?: string;
    merchant?: string;
    url?: string;
    action?: {
      type: string;
      payload?: any;
    };
  };
  onAction?: (action: { type: string; payload?: any }, product: any) => void;
}

export function ProductCard({ product, onAction }: ProductCardProps) {
  const formatPrice = (price?: string | number, currency?: string) => {
    if (!price) return null;
    const currencySymbol = currency === 'USD' ? '$' : currency || '$';
    const priceValue = typeof price === 'string' ? parseFloat(price) : price;
    return `${currencySymbol}${priceValue.toFixed(2)}`;
  };

  const handleView = () => {
    if (product.url) {
      window.open(product.url, '_blank', 'noopener,noreferrer');
    } else if (onAction) {
      onAction({ type: 'open_url', payload: { url: product.url } }, product);
    }
  };

  const handleBuy = () => {
    if (onAction) {
      // Try to find purchase URL or send message
      const purchaseUrl = product.url || product.action?.payload?.url;
      if (purchaseUrl) {
        onAction({ type: 'open_url', payload: { url: purchaseUrl } }, product);
      } else {
        // Send message to AI
        onAction(
          { type: 'send_message', payload: { message: `Proceed with purchase of ${product.title}` } },
          product
        );
      }
    }
  };

  return (
    <div className="bg-gp-surface border border-gp-border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow flex flex-col">
      {product.imageUrl && (
        <div className="w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <h4 className="text-gp-text font-semibold text-base mb-1 line-clamp-2">{product.title}</h4>
        {product.subtitle && (
          <p className="text-gp-muted text-xs mb-2 line-clamp-1">{product.subtitle}</p>
        )}
        {(product.provider || product.merchant) && (
          <p className="text-gp-muted text-xs mb-2">{product.provider || product.merchant}</p>
        )}
        {product.price && (
          <p className="text-gp-text font-bold text-lg mb-3">{formatPrice(product.price, product.currency)}</p>
        )}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={handleView}
            className="flex-1 px-3 py-2 bg-gp-surface border border-gp-border text-gp-text font-medium rounded-lg hover:bg-gp-hover transition-colors text-sm"
          >
            View
          </button>
          <button
            onClick={handleBuy}
            className="flex-1 px-3 py-2 bg-gp-primary hover:bg-gp-primary-dark text-white font-medium rounded-lg transition-colors text-sm"
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}

