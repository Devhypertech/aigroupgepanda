/**
 * UI Renderer Component
 * Renders interactive UI widgets from UiSpec
 */

'use client';

import { useState, useCallback } from 'react';
import { useChatStore } from '../../lib/chatStore';
import type { 
  UiSpec, 
  Widget, 
  Action, 
  CardWidget,
  DatePickerWidget, 
  ChecklistWidget,
  SectionWidget,
  RowWidget,
  ColumnWidget,
  GridWidget,
  FormWidget,
  CheckoutWidget,
  PlanningWidget,
} from '@gepanda/shared';

// Simple UI types (alternative to widget-based)
export type SimpleUI = 
  | { type: 'trip_planner'; fields: { destination: string; startDate: string; endDate: string; budget: number }; actions: Array<{ id: string; label: string }> }
  | { type: 'chips'; options: string[]; selected?: string[] }
  | { type: 'cards'; cards: Array<{ id: string; title: string; subtitle?: string; description?: string; imageUrl?: string; items?: string[]; actions?: Array<{ label: string; action: string; value?: string; url?: string }>; metadata?: { productId?: string; productUrl?: string; price?: string; currency?: string; source?: string } }> }
  | { type: 'checkout_card'; data: { title: string; price?: string; currency?: string; image?: string; checkoutUrl: string; merchant?: string; provider?: string } }
  | { type: 'product_results'; items: Array<{ id: string; title: string; price?: number | string; currency?: string; image?: string; merchant?: string; url?: string; source?: string; rating?: number; shipping?: string; availability?: string }> };

interface UIRendererProps {
  ui: UiSpec | SimpleUI;
  sessionId: string;
  onUpdate?: (updatedUi: UiSpec | SimpleUI) => void;
  apiUrl: string;
  userId?: string;
  onUIEvent?: (eventName: string, payload?: any) => void;
}

export function UIRenderer({ ui, sessionId, onUpdate, apiUrl, userId, onUIEvent }: UIRendererProps) {
  const setActivePanel = useChatStore((state) => state.setActivePanel);
  const setResults = useChatStore((state) => state.setResults);
  const tripState = useChatStore((state) => state.tripState);
  console.log('[UIRenderer] Rendering UI:', {
    hasType: 'type' in ui,
    hasWidgets: 'widgets' in ui,
    type: (ui as any).type,
    widgetCount: (ui as any).widgets?.length || 0
  });
  
  // Check if this is a simple UI or widget-based UI
  const isSimpleUI = 'type' in ui && !('widgets' in ui);
  
  console.log('[UIRenderer] isSimpleUI:', isSimpleUI);

  // Render simple UI types
  if (isSimpleUI) {
    console.log('[UIRenderer] Rendering simple UI');
    return renderSimpleUI(ui as SimpleUI, sessionId, onUpdate, apiUrl, userId, onUIEvent);
  }

  // Render widget-based UI (existing implementation)
  console.log('[UIRenderer] Rendering widget-based UI');
  return renderWidgetUI(ui as UiSpec, sessionId, onUpdate, apiUrl, userId, onUIEvent);
}

function renderSimpleUI(
  ui: SimpleUI,
  sessionId: string,
  onUpdate: ((updatedUi: UiSpec | SimpleUI) => void) | undefined,
  apiUrl: string,
  userId?: string,
  onUIEvent?: (eventName: string, payload?: any) => void
) {
  // Hooks must be at the top level
  const setActivePanel = useChatStore((state) => state.setActivePanel);
  const setResults = useChatStore((state) => state.setResults);
  const tripState = useChatStore((state) => state.tripState);
  
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (ui.type === 'trip_planner') {
      return { ...ui.fields };
    }
    if (ui.type === 'chips') {
      return { selected: ui.selected || [] };
    }
    return {};
  });

  // State for checkout confirmation
  const [checkoutConfirmation, setCheckoutConfirmation] = useState<{
    product: any;
    showForm: boolean;
  } | null>(null);

  const handleAction = useCallback(async (actionId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/ui/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          uiId: `ui_${Date.now()}`, // Generate a temporary ID
          userId,
          eventId: actionId,
          payload: formData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ui && onUpdate) {
          onUpdate(data.ui);
        }
        // Also trigger message update in parent
        return data;
      }
    } catch (error) {
      console.error('Error sending UI event:', error);
    }
  }, [sessionId, formData, apiUrl, userId, onUpdate]);

  switch (ui.type) {
    case 'trip_planner':
      return (
        <div className="bg-gp-surface border border-gray-200 rounded-lg p-4 mt-2">
          <h3 className="text-gp-text font-semibold text-base mb-4">Plan Your Trip</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gp-text mb-2">Destination</label>
              <input
                type="text"
                value={formData.destination || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="e.g., Bali, Japan, Europe"
                className="w-full px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gp-text mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gp-text mb-2">End Date</label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gp-text mb-2">
                Budget (USD): ${formData.budget || 2000}
              </label>
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={formData.budget || 2000}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gp-primary"
              />
              <div className="flex justify-between text-xs text-gp-muted mt-1">
                <span>$500</span>
                <span>$10,000</span>
              </div>
            </div>
            <div className="flex gap-2">
              {ui.actions.map((action: { id: string; label: string }) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-black font-medium rounded-lg transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );

    case 'chips':
      const selected = formData.selected || [];
      return (
        <div className="bg-gp-surface border border-gray-200 rounded-lg p-4 mt-2">
          <div className="flex flex-wrap gap-2">
            {ui.options.map((option: string) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    const newSelected = isSelected
                      ? selected.filter((v: string) => v !== option)
                      : [...selected, option];
                    setFormData(prev => ({ ...prev, selected: newSelected }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-gp-primary text-black'
                      : 'bg-gp-bg text-gp-text border border-gray-200 hover:border-gp-primary/50'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'cards': {
      const handleCardAction = useCallback(async (action: { label: string; action: string; value?: string; url?: string }, cardId: string) => {
        const actionLabel = action.label.toLowerCase();
        const actionName = action.action.toLowerCase();
        
        // Handle buy_now action - show confirmation form
        if (actionName === 'buy_now') {
          const card = ui.cards.find((c: any) => c.id === cardId);
          if (card) {
            setCheckoutConfirmation({
              product: {
                id: card.metadata?.productId || card.id,
                title: card.title,
                image: card.imageUrl,
                price: card.metadata?.price,
                currency: card.metadata?.currency || 'USD',
                url: card.metadata?.productUrl || action.url || action.value,
              },
              showForm: true,
            });
          }
          return;
        }

        // Handle add_to_cart action (for future implementation)
        if (actionName === 'add_to_cart') {
          // TODO: Implement cart functionality
          console.log('Add to cart:', cardId, action.value);
          return;
        }

        // Handle compare_product action (for future implementation)
        if (actionName === 'compare_product') {
          // TODO: Implement product comparison
          console.log('Compare product:', cardId, action.value);
          return;
        }
        
        // Handle open_url actions (for checkout links, product URLs, etc.)
        if (actionName === 'open_url' && (action.url || action.value)) {
          const url = action.url || action.value;
          if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
          }
        }
        
        // Check if this is a hotel or flight search action
        if (actionLabel.includes('hotel') || actionLabel.includes('book hotel') || actionName.includes('hotel')) {
          // Use onUIEvent if provided, otherwise handle directly
          if (onUIEvent) {
            onUIEvent('book_hotel', {
              cardId,
              destination: tripState.destination,
              checkIn: tripState.startDate,
              checkOut: tripState.endDate,
            });
            return;
          }
          
          // Set active panel to hotels
          setActivePanel('hotels');
          
          // Call hotels search API
          try {
            const response = await fetch(`${apiUrl}/api/tools/hotels/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                destination: tripState.destination || '',
                checkIn: tripState.startDate,
                checkOut: tripState.endDate,
                guests: 2,
                maxPrice: tripState.budget,
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              setResults({ hotels: data.results || [] });
            }
          } catch (error) {
            console.error('Error searching hotels:', error);
          }
          return;
        }
        
        if (actionLabel.includes('flight') || actionLabel.includes('search flight') || actionName.includes('flight')) {
          // Set active panel to flights
          setActivePanel('flights');
          
          // Call flights search API
          try {
            const response = await fetch(`${apiUrl}/api/tools/flights/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                origin: 'NYC', // Default origin, could be from tripState
                destination: tripState.destination || '',
                departureDate: tripState.startDate,
                returnDate: tripState.endDate,
                passengers: 1,
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              setResults({ flights: data.results || [] });
            }
          } catch (error) {
            console.error('Error searching flights:', error);
          }
          return;
        }
        
        // Default: send to UI event API
        try {
          const response = await fetch(`${apiUrl}/api/chat/ui/event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              userId,
              uiId: `ui_${Date.now()}`,
              eventId: action.action,
              payload: {
                cardId,
                value: action.value,
                action: action.action,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // Update the message with new UI or text
            if (onUpdate) {
              if (data.ui) {
                onUpdate(data.ui);
              } else if (data.text) {
                // If only text is returned, we might want to replace the UI with text
                // For now, just update the UI if provided
              }
            }
            return data;
          }
        } catch (error) {
          console.error('Error sending UI event:', error);
        }
      }, [sessionId, apiUrl, userId, onUpdate, setActivePanel, setResults, tripState]);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ui.cards.map((card: { 
              id: string; 
              title: string; 
              subtitle?: string;
              description?: string; 
              imageUrl?: string;
              items?: string[];
              actions?: Array<{ label: string; action: string; value?: string }>;
            }) => (
              <div
                key={card.id}
                className="bg-gp-surface border border-gp-border rounded-xl overflow-hidden hover:border-gp-primary/30 transition-smooth card-hover shadow-gp"
              >
                {card.imageUrl && (
                  <div className="w-full h-40 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="w-full h-full object-cover image-hover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h4 className="text-gp-text font-semibold text-base mb-1">{card.title}</h4>
                  {card.subtitle && (
                    <p className="text-gp-muted text-xs mb-2">{card.subtitle}</p>
                  )}
                  {card.description && (
                    <p className="text-gp-muted text-sm mb-3 leading-relaxed">{card.description}</p>
                  )}
                  {card.items && card.items.length > 0 && (
                    <ul className="space-y-1.5 mb-3">
                      {card.items.map((item, idx) => (
                        <li key={idx} className="text-gp-muted text-xs flex items-start gap-2">
                          <span className="text-gp-primary mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {card.actions && card.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {card.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleCardAction(action, card.id)}
                          className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-white font-medium rounded-xl transition-smooth text-sm shadow-gp-md hover:shadow-gp-lg"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'product_results': {
      const handleProductAction = useCallback(async (actionType: string, productId: string, product: any) => {
        try {
          const response = await fetch(`${apiUrl}/api/chat/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              userId,
              action: {
                type: actionType,
                payload: { productId, product },
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.ui && onUpdate) {
              onUpdate(data.ui);
            }
            if (onUIEvent) {
              onUIEvent(actionType, { productId, product });
            }
            return data;
          }
        } catch (error) {
          console.error('Error handling product action:', error);
        }
      }, [sessionId, apiUrl, userId, onUpdate, onUIEvent]);

      return (
        <div className="space-y-4">
          {ui.items.map((product: any) => (
            <div
              key={product.id}
              className="bg-gp-surface border border-gp-border rounded-xl overflow-hidden hover:border-gp-primary/30 transition-smooth card-hover shadow-gp"
            >
              {product.image && (
                <div className="w-full h-40 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover image-hover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-5">
                <h4 className="text-gp-text font-semibold text-base mb-1">{product.title}</h4>
                {product.merchant && (
                  <p className="text-gp-muted text-sm mb-2">{product.merchant}</p>
                )}
                {product.price && (
                  <p className="text-gp-text font-semibold text-lg mb-2">
                    {product.currency || 'USD'} {typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                  </p>
                )}
                {product.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-yellow-500">★</span>
                    <span className="text-gp-muted text-sm">{product.rating.toFixed(1)}</span>
                  </div>
                )}
                {product.shipping && (
                  <p className="text-gp-muted text-xs mb-2">{product.shipping}</p>
                )}
                {product.availability && (
                  <p className={`text-xs mb-3 ${product.availability.toLowerCase().includes('stock') ? 'text-green-600' : 'text-orange-600'}`}>
                    {product.availability}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => handleProductAction('buy_now', product.id, product)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-smooth text-sm shadow-gp-md hover:shadow-gp-lg"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => handleProductAction('compare_products', product.id, product)}
                    className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-white font-medium rounded-xl transition-smooth text-sm shadow-gp-md hover:shadow-gp-lg"
                  >
                    Compare
                  </button>
                  <button
                    onClick={() => {
                      // Ask AI about this product
                      if (onUIEvent) {
                        onUIEvent('ask_ai', {
                          productId: product.id,
                          productTitle: product.title,
                          message: `Tell me more about ${product.title}`,
                        });
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gp-text font-medium rounded-xl transition-smooth text-sm"
                  >
                    Ask AI
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'checkout_card': {
      const { title, price, currency, image, checkoutUrl, merchant, provider } = ui.data;
      
      return (
        <div className="space-y-4">
          <div className="bg-gp-surface border border-gp-border rounded-xl overflow-hidden hover:border-gp-primary/30 transition-smooth card-hover shadow-gp">
            {image && (
              <div className="w-full h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover image-hover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-5">
              <h4 className="text-gp-text font-semibold text-lg mb-2">{title}</h4>
              {merchant && (
                <p className="text-gp-muted text-sm mb-2">{merchant}</p>
              )}
              {price && (
                <p className="text-gp-primary font-bold text-xl mb-4">
                  {price} {currency && currency !== 'USD' ? currency : ''}
                </p>
              )}
              <button
                onClick={() => {
                  if (checkoutUrl) {
                    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-smooth text-base shadow-gp-md hover:shadow-gp-lg"
              >
                Complete Purchase
              </button>
              {provider && (
                <p className="text-xs text-gp-muted mt-2 text-center">
                  Powered by {provider === 'crossmint' ? 'Crossmint' : provider}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

function CheckoutWidgetBlock({
  widget: checkoutWidget,
  apiUrl,
  userId,
  onUIEvent,
}: {
  widget: any;
  apiUrl: string;
  userId?: string;
  onUIEvent?: (eventName: string, payload?: any) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = useCallback(async () => {
    setIsProcessing(true);
    try {
      const firstItem = checkoutWidget.items?.[0];
      const productId = firstItem?.productId || firstItem?.id;
      const productType = checkoutWidget.productType || 'product';
      const body: Record<string, unknown> = productId
        ? { productId, productType, paymentPreference: 'card' }
        : {
            items: (checkoutWidget.items || []).map((i: any) => ({
              productId: i.productId || i.id,
              quantity: i.quantity || 1,
              price: i.price,
            })),
            productType,
            paymentPreference: 'card',
          };

      const intentRes = await fetch(`${apiUrl}/api/checkout/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(userId ? { 'X-User-Id': userId } : {}) },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (intentRes.ok) {
        const intent = await intentRes.json();
        if (intent.checkoutUrl) {
          window.open(intent.checkoutUrl, '_blank', 'noopener,noreferrer');
        }
      }
      if (checkoutWidget.paymentAction?.name && onUIEvent) {
        onUIEvent(checkoutWidget.paymentAction.name, { items: checkoutWidget.items, total: checkoutWidget.total });
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [checkoutWidget, apiUrl, userId, onUIEvent]);

  return (
    <div className="space-y-4">
      {checkoutWidget.title && (
        <h4 className="text-gp-text font-semibold text-base mb-4">{checkoutWidget.title}</h4>
      )}
      <div className="space-y-3">
        {checkoutWidget.items?.map((item: any) => (
          <div key={item.id} className="flex items-start gap-3 p-3 bg-gp-bg rounded-lg border border-gray-200">
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded" />
            )}
            <div className="flex-1">
              <h5 className="text-gp-text font-medium text-sm">{item.name}</h5>
              {item.description && (
                <p className="text-gp-muted text-xs mt-1">{item.description}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-gp-muted text-xs">Qty: {item.quantity || 1}</span>
                {typeof item.price === 'number' ? (
                  <span className="text-gp-text font-semibold">
                    {checkoutWidget.currency || 'USD'} {item.price.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-gp-muted text-sm">Check price</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gp-text font-semibold text-lg">Total:</span>
          <span className="text-gp-text font-bold text-xl">
            {checkoutWidget.currency || 'USD'} {typeof checkoutWidget.total === 'number' ? checkoutWidget.total.toFixed(2) : '—'}
          </span>
        </div>
        <p className="text-xs text-gp-muted mb-4">Prices may vary until booking.</p>
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full px-4 py-3 bg-gp-primary hover:bg-gp-primary-dark text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </div>
    </div>
  );
}

function ConfirmationWidgetBlock({
  widget: confWidget,
  apiUrl,
  userId,
  onUIEvent,
}: {
  widget: any;
  apiUrl: string;
  userId?: string;
  onUIEvent?: (eventName: string, payload?: any) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProceed = useCallback(async () => {
    setIsProcessing(true);
    try {
      const firstItem = confWidget.items?.[0];
      const productId = firstItem?.productId || firstItem?.id;
      const productType = confWidget.productType || 'product';
      const body: Record<string, unknown> = productId
        ? { productId, productType, paymentPreference: confWidget.paymentPreference || 'card' }
        : {
            items: (confWidget.items || []).map((i: any) => ({
              productId: i.productId || i.id,
              quantity: i.quantity || 1,
              price: i.price,
            })),
            productType,
            paymentPreference: confWidget.paymentPreference || 'card',
            shippingAddress: confWidget.shippingAddress,
          };

      const intentRes = await fetch(`${apiUrl}/api/checkout/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(userId ? { 'X-User-Id': userId } : {}) },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (intentRes.ok) {
        const intent = await intentRes.json();
        if (intent.checkoutUrl) {
          window.open(intent.checkoutUrl, '_blank', 'noopener,noreferrer');
        }
      }
      if (confWidget.proceedAction?.name && onUIEvent) {
        onUIEvent(confWidget.proceedAction.name, { items: confWidget.items, total: confWidget.total });
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [confWidget, apiUrl, userId, onUIEvent]);

  const handleConfirm = useCallback(() => {
    if (confWidget.confirmAction?.name && onUIEvent) {
      onUIEvent(confWidget.confirmAction.name, { items: confWidget.items, total: confWidget.total });
    }
  }, [confWidget, onUIEvent]);

  return (
    <div className="space-y-4">
      {confWidget.title && (
        <h4 className="text-gp-text font-semibold text-base mb-4">{confWidget.title}</h4>
      )}
      <div className="space-y-3">
        {confWidget.items?.map((item: any) => (
          <div key={item.id} className="flex items-start gap-3 p-3 bg-gp-bg rounded-lg border border-gray-200">
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded" />
            )}
            <div className="flex-1">
              <h5 className="text-gp-text font-medium text-sm">{item.name}</h5>
              {item.description && (
                <p className="text-gp-muted text-xs mt-1">{item.description}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-gp-muted text-xs">Qty: {item.quantity || 1}</span>
                {typeof item.price === 'number' && (
                  <span className="text-gp-text font-semibold">
                    {confWidget.currency || 'USD'} {item.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {confWidget.shippingAddress && (
        <div className="p-3 bg-gp-bg rounded-lg border border-gray-200 text-sm text-gp-text">
          <span className="font-medium text-gp-muted block mb-1">Shipping</span>
          {[confWidget.shippingAddress.line1, confWidget.shippingAddress.line2, confWidget.shippingAddress.city, confWidget.shippingAddress.region, confWidget.shippingAddress.postalCode, confWidget.shippingAddress.country].filter(Boolean).join(', ')}
        </div>
      )}
      {confWidget.paymentPreference && (
        <p className="text-gp-muted text-xs">Payment: {confWidget.paymentPreference}</p>
      )}
      <div className="pt-4 border-t border-gray-200 flex items-center justify-between gap-2">
        <span className="text-gp-text font-semibold text-lg">Total:</span>
        <span className="text-gp-text font-bold text-xl">
          {confWidget.currency || 'USD'} {typeof confWidget.total === 'number' ? confWidget.total.toFixed(2) : '—'}
        </span>
      </div>
      <div className="flex gap-2">
        {confWidget.confirmAction && (
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 border border-gp-border text-gp-text font-semibold rounded-lg hover:bg-gp-hover transition-colors"
          >
            Confirm
          </button>
        )}
        <button
          onClick={handleProceed}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 bg-gp-primary hover:bg-gp-primary-dark text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Proceed'}
        </button>
      </div>
    </div>
  );
}

function renderWidgetUI(
  ui: UiSpec,
  sessionId: string,
  onUpdate: ((updatedUi: UiSpec | SimpleUI) => void) | undefined,
  apiUrl: string,
  userId?: string,
  onUIEvent?: (eventName: string, payload?: any) => void
) {
  // Hooks must be at the top level
  const setActivePanel = useChatStore((state) => state.setActivePanel);
  const setResults = useChatStore((state) => state.setResults);
  const tripState = useChatStore((state) => state.tripState);
  
  // Initialize form data from widgets and state
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...ui.state };
    ui.widgets.forEach((widget: Widget) => {
      if (widget.kind === 'chips' && !initial[widget.id]) {
        initial[widget.id] = widget.selected || [];
      } else if (widget.kind === 'slider' && !initial[widget.id]) {
        initial[widget.id] = widget.value;
      } else if (widget.kind === 'input' && !initial[widget.id]) {
        initial[widget.id] = widget.value || '';
      }
    });
    return initial;
  });

  const handleFieldChange = useCallback(async (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));

    // Send UI event to backend
    try {
      const response = await fetch(`${apiUrl}/api/chat/ui/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          uiId: ui.id,
          event: {
            type: 'change',
            fieldId,
            value,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ui && onUpdate) {
          onUpdate(data.ui);
        }
      }
    } catch (error) {
      console.error('Error sending UI event:', error);
    }
  }, [sessionId, ui.id, apiUrl, onUpdate]);

  const handleSubmit = useCallback(async () => {
    try {
      // Find the button widget that triggered this (if it has generate_itinerary action)
      const generateButton = ui.widgets.find(w => 
        w.kind === 'button' && 
        (w as any).action?.type === 'event' && 
        ((w as any).action?.name === 'generate_itinerary' || 
         (w as any).action?.name === 'create_itinerary' ||
         (w as any).action?.name === 'submit_plan')
      );
      
      // Determine event ID from button action or default to 'generate_itinerary'
      const eventId = generateButton && generateButton.kind === 'button' 
        ? (generateButton as any).action?.name || 'generate_itinerary'
        : 'generate_itinerary';

      const response = await fetch(`${apiUrl}/api/chat/ui/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          uiId: ui.id,
          eventId,
          payload: formData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ui && onUpdate) {
          onUpdate(data.ui);
        }
        // Also return data for potential message update
        return data;
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }, [sessionId, ui.id, formData, apiUrl, onUpdate, ui.widgets]);

  const renderWidget = (widget: Widget, idx?: number): JSX.Element | null => {
    switch (widget.kind) {
      // Layout widgets
      case 'section': {
        const sectionWidget = widget as any;
        return (
          <div key={sectionWidget.id || idx} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
            {sectionWidget.title && (
              <h4 className="text-gp-text font-medium text-sm mb-3">{sectionWidget.title}</h4>
            )}
            {sectionWidget.description && (
              <p className="text-gp-muted text-xs mb-3">{sectionWidget.description}</p>
            )}
            <div className="space-y-2">
              {sectionWidget.children?.map((child: Widget, childIdx: number) => renderWidget(child, childIdx))}
            </div>
          </div>
        );
      }

      case 'row': {
        const rowWidget = widget as any;
        return (
          <div 
            key={rowWidget.id || idx} 
            className="flex gap-4 items-start"
          >
            {rowWidget.children?.map((child: Widget, childIdx: number) => (
              <div key={childIdx} className="flex-1">
                {renderWidget(child, childIdx)}
              </div>
            ))}
          </div>
        );
      }

      case 'column': {
        const columnWidget = widget as any;
        return (
          <div 
            key={columnWidget.id || idx} 
            className="flex flex-col gap-4 items-stretch"
          >
            {columnWidget.children?.map((child: Widget, childIdx: number) => renderWidget(child, childIdx))}
          </div>
        );
      }

      case 'grid': {
        const gridWidget = widget as any;
        return (
          <div 
            key={gridWidget.id || idx} 
            className={`grid grid-cols-${gridWidget.columns || 2} gap-4`}
          >
            {gridWidget.children?.map((child: Widget, childIdx: number) => renderWidget(child, childIdx))}
          </div>
        );
      }

      // Form widget (auto-generated form)
      case 'form': {
        const formWidget = widget as any;
        const [formData, setFormData] = useState<Record<string, any>>(() => {
          const initial: Record<string, any> = {};
          formWidget.fields?.forEach((field: any) => {
            initial[field.id] = field.value || '';
          });
          return initial;
        });

        const handleSubmit = useCallback(async () => {
          try {
            // If this is a search_product action, send to /api/chat/respond
            if (formWidget.submitAction.name === 'search_product') {
              const query = formData[formWidget.fields?.[0]?.id || 'query'] || '';
              const response = await fetch(`${apiUrl}/api/chat/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  userId,
                  action: {
                    type: 'search_product',
                    payload: { query },
                  },
                }),
              });

              if (response.ok) {
                const data = await response.json();
                if (data.ui && onUpdate) {
                  onUpdate(data.ui);
                }
                return;
              }
            }

            // Default: send to UI event API
            const response = await fetch(`${apiUrl}/api/chat/ui/event`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                uiId: ui.id,
                eventId: formWidget.submitAction.name,
                payload: formData,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.ui && onUpdate) {
                onUpdate(data.ui);
              }
            }
          } catch (error) {
            console.error('Error submitting form:', error);
          }
        }, [sessionId, ui.id, formData, apiUrl, userId, onUpdate, formWidget.submitAction.name, formWidget.fields]);

        return (
          <div key={formWidget.id || idx} className="space-y-4">
            {formWidget.title && (
              <h4 className="text-gp-text font-semibold text-sm mb-3">{formWidget.title}</h4>
            )}
            {formWidget.fields?.map((field: any) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gp-text mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                    rows={4}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    required={field.required}
                    className="w-full px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData[field.id] || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.checked }))}
                      className="w-4 h-4 text-gp-primary border-gray-300 rounded focus:ring-gp-primary"
                    />
                    <span className="text-sm text-gp-text">{field.label}</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.placeholder}
                    required={field.required}
                    min={field.validation?.min}
                    max={field.validation?.max}
                    pattern={field.validation?.pattern}
                    className="w-full px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                  />
                )}
              </div>
            ))}
            <button
              onClick={handleSubmit}
              className="w-full px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-black font-medium rounded-lg transition-colors"
            >
              {formWidget.submitAction.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </button>
          </div>
        );
      }

      // Checkout widget (shopping/payment UI) – creates checkout intent and opens payment URL
      case 'checkout':
        return (
          <CheckoutWidgetBlock
            key={(widget as any).id || idx}
            widget={widget as any}
            apiUrl={apiUrl}
            userId={userId}
            onUIEvent={onUIEvent}
          />
        );

      // Confirmation widget: order summary + Confirm / Proceed (Proceed → checkout intent → open URL)
      case 'confirmation':
        return (
          <ConfirmationWidgetBlock
            key={(widget as any).id || idx}
            widget={widget as any}
            apiUrl={apiUrl}
            userId={userId}
            onUIEvent={onUIEvent}
          />
        );

      // Planning widget (interactive trip planning)
      case 'planning': {
        const planningWidget = widget as PlanningWidget;
        const [timeline, setTimeline] = useState(planningWidget.timeline);

        const handleAddDay = useCallback(async () => {
          const newDay = {
            id: `day_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            title: `Day ${timeline.length + 1}`,
            description: '',
            activities: [],
            editable: true,
          };
          setTimeline([...timeline, newDay]);
        }, [timeline]);

        return (
          <div key={planningWidget.id || idx} className="space-y-4">
            {planningWidget.title && (
              <h4 className="text-gp-text font-semibold text-base mb-4">{planningWidget.title}</h4>
            )}
            <div className="space-y-3">
              {timeline.map((day) => (
                <div key={day.id} className="p-4 bg-gp-bg rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="text-gp-text font-medium text-sm">{day.title}</h5>
                      <p className="text-gp-muted text-xs mt-1">{day.date}</p>
                    </div>
                    {day.editable && (
                      <button className="text-gp-muted hover:text-gp-text text-xs">Edit</button>
                    )}
                  </div>
                  {day.description && (
                    <p className="text-gp-text text-sm mb-2">{day.description}</p>
                  )}
                  {day.activities && day.activities.length > 0 && (
                    <ul className="list-disc list-inside text-gp-muted text-xs space-y-1">
                      {day.activities.map((activity, actIdx) => (
                        <li key={actIdx}>{activity}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            {planningWidget.actions && planningWidget.actions.length > 0 && (
              <div className="flex gap-2">
                {planningWidget.actions.map((action, actIdx) => (
                  <button
                    key={actIdx}
                    onClick={async () => {
                      if (action.name === 'add_day') {
                        handleAddDay();
                      }
                      // Handle other actions
                    }}
                    className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-black font-medium rounded-lg transition-colors"
                  >
                    {action.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'input':
        return (
          <div key={widget.id} className="mb-4">
            <label className="block text-sm font-medium text-gp-text mb-2">
              {widget.label}
            </label>
            <input
              type="text"
              value={formData[widget.id] || widget.value || ''}
              onChange={(e) => handleFieldChange(widget.id, e.target.value)}
              placeholder={widget.placeholder}
              className="w-full px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
            />
          </div>
        );

      case 'button':
        return (
          <button
            key={widget.id}
            onClick={async () => {
              if (widget.action.type === 'event') {
                const eventName = widget.action.name;
                
                // Use onUIEvent handler if provided (for book_flight, book_hotel, etc.)
                if (onUIEvent) {
                  onUIEvent(eventName, {
                    ...formData,
                    ...(widget.action.payload || {}),
                  });
                  return;
                }
                
                // Handle special submit events
                if (eventName === 'submit' || eventName === 'create_itinerary' || eventName === 'generate_itinerary') {
                  // Send submit event with current form data
                  handleSubmit();
                } else {
                  // Send other events directly to backend
                  try {
                    const response = await fetch(`${apiUrl}/api/chat/ui/event`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId,
                        uiId: ui.id,
                        eventId: eventName,
                        payload: {
                          ...formData,
                          ...(widget.action.payload || {}),
                        },
                      }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      if (data.ui && onUpdate) {
                        onUpdate(data.ui);
                      }
                    }
                  } catch (error) {
                    console.error('Error sending button event:', error);
                  }
                }
              }
            }}
            className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-black font-medium rounded-lg transition-colors mb-2"
          >
            {widget.label}
          </button>
        );

      case 'chips':
        const selectedValues = formData[widget.id] || widget.selected || [];
        return (
          <div key={widget.id} className="mb-4">
            <label className="block text-sm font-medium text-gp-text mb-2">
              {widget.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {widget.options.map((option: string) => {
                const isSelected = selectedValues.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      const newValues = isSelected
                        ? selectedValues.filter((v: string) => v !== option)
                        : [...selectedValues, option];
                      handleFieldChange(widget.id, newValues);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-gp-primary text-black'
                        : 'bg-gp-surface text-gp-text border border-gray-200 hover:border-gp-primary/50'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'slider':
        const sliderValue = formData[widget.id] ?? widget.value;
        const formatCurrency = (val: number) => {
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
        };
        return (
          <div key={widget.id} className="mb-4">
            <label className="block text-sm font-medium text-gp-text mb-2">
              {widget.label}: {formatCurrency(sliderValue)}
            </label>
            <input
              type="range"
              min={widget.min}
              max={widget.max}
              value={sliderValue}
              onChange={(e) => handleFieldChange(widget.id, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gp-primary"
            />
            <div className="flex justify-between text-xs text-gp-muted mt-1">
              <span>{formatCurrency(widget.min)}</span>
              <span>{formatCurrency(widget.max)}</span>
            </div>
          </div>
        );

      case 'card': {
        const cardWidget = widget as CardWidget;
        
        const handleCardButtonClick = async (action: Action) => {
          const actionLabel = action.name.toLowerCase();
          
          // Check if this is a hotel or flight search action
          if (actionLabel.includes('hotel') || actionLabel.includes('book_hotel')) {
            // Set active panel to hotels
            setActivePanel('hotels');
            
            // Call hotels search API
            try {
              const response = await fetch(`${apiUrl}/api/tools/hotels/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  destination: tripState.destination || '',
                  checkIn: tripState.startDate,
                  checkOut: tripState.endDate,
                  guests: 2,
                  maxPrice: tripState.budget,
                }),
              });
              
              if (response.ok) {
                const data = await response.json();
                setResults({ hotels: data.results || [] });
              }
            } catch (error) {
              console.error('Error searching hotels:', error);
            }
            return;
          }
          
          if (actionLabel.includes('flight') || actionLabel.includes('search_flight')) {
            // Set active panel to flights
            setActivePanel('flights');
            
            // Call flights search API
            try {
              const response = await fetch(`${apiUrl}/api/tools/flights/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  origin: 'NYC', // Default origin, could be from tripState
                  destination: tripState.destination || '',
                  departureDate: tripState.startDate,
                  returnDate: tripState.endDate,
                  passengers: 1,
                }),
              });
              
              if (response.ok) {
                const data = await response.json();
                setResults({ flights: data.results || [] });
              }
            } catch (error) {
              console.error('Error searching flights:', error);
            }
            return;
          }
          
          // Default: send to UI event API
          try {
            const response = await fetch(`${apiUrl}/api/chat/ui/event`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                userId,
                uiId: ui.id,
                eventId: action.name,
                payload: {
                  cardId: cardWidget.id,
                  ...(action.payload || {}),
                },
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.ui && onUpdate) {
                onUpdate(data.ui);
              }
              // Also return data for potential message update
              return data;
            }
          } catch (error) {
            console.error('Error sending card button event:', error);
          }
        };

        return (
          <div
            key={widget.id}
            className="mb-4 p-5 bg-gp-surface border border-gp-border rounded-xl hover:border-gp-primary/30 transition-smooth card-hover shadow-gp"
          >
            {widget.imageUrl && (
              <div className="w-full h-40 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-3">
                <img
                  src={widget.imageUrl}
                  alt={widget.title}
                  className="w-full h-full object-cover image-hover"
                  loading="lazy"
                />
              </div>
            )}
            <h4 className="text-gp-text font-semibold text-base mb-1">{widget.title}</h4>
            {widget.description && (
              <p className="text-gp-muted text-sm mb-3 leading-relaxed">{widget.description}</p>
            )}
            {widget.actions && widget.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {widget.actions.map((action: Action, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleCardButtonClick(action)}
                    className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-white font-medium rounded-xl transition-smooth text-sm shadow-gp-md hover:shadow-gp-lg"
                  >
                    {action.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'datepicker': {
        const dateWidget = widget as DatePickerWidget;
        const dateValue = formData[dateWidget.id] || dateWidget.value || '';
        const isRange = dateWidget.mode === 'range';
        return (
          <div key={dateWidget.id} className="mb-4">
            <label className="block text-sm font-medium text-gp-text mb-2">
              {dateWidget.label}
            </label>
            {isRange ? (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateValue.split(' to ')[0] || ''}
                  onChange={(e) => {
                    const startDate = e.target.value;
                    const endDate = dateValue.split(' to ')[1] || '';
                    handleFieldChange(dateWidget.id, endDate ? `${startDate} to ${endDate}` : startDate);
                  }}
                  className="flex-1 px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                />
                <span className="self-center text-gp-muted">to</span>
                <input
                  type="date"
                  value={dateValue.split(' to ')[1] || ''}
                  onChange={(e) => {
                    const startDate = dateValue.split(' to ')[0] || '';
                    const endDate = e.target.value;
                    handleFieldChange(dateWidget.id, startDate ? `${startDate} to ${endDate}` : endDate);
                  }}
                  className="flex-1 px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                />
              </div>
            ) : (
              <input
                type="date"
                value={dateValue}
                onChange={(e) => handleFieldChange(dateWidget.id, e.target.value)}
                placeholder={dateWidget.placeholder}
                className="w-full px-4 py-2 bg-gp-bg border border-gray-200 rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
              />
            )}
          </div>
        );
      }

      case 'checklist': {
        const checklistWidget = widget as ChecklistWidget;
        const checklistItems = checklistWidget.items || [];
        const checklistState = formData[checklistWidget.id] || {};
        return (
          <div key={checklistWidget.id} className="mb-4">
            <label className="block text-sm font-medium text-gp-text mb-2">
              {checklistWidget.label}
            </label>
            <div className="space-y-2">
              {checklistItems.map((item) => {
                const isChecked = checklistState[item.id] ?? item.checked ?? false;
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-2 bg-gp-bg border border-gray-200 rounded-lg hover:border-gp-primary/30 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        handleFieldChange(checklistWidget.id, {
                          ...checklistState,
                          [item.id]: e.target.checked,
                        });
                      }}
                      className="w-4 h-4 text-gp-primary border-gray-300 rounded focus:ring-gp-primary focus:ring-2"
                    />
                    <span className="text-sm text-gp-text">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="bg-gp-surface border border-gray-200 rounded-lg p-4 mt-2">
      {ui.title && (
        <h3 className="text-gp-text font-semibold text-base mb-1">{ui.title}</h3>
      )}
      
      <div className="space-y-2">
        {ui.widgets.map(renderWidget)}
      </div>
    </div>
  );
}
