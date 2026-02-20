/**
 * Assistant Message Renderer
 * Renders structured UI schemas from assistant messages as interactive components
 */

'use client';

import { useState, useCallback } from 'react';
import { safeParseAssistantContent } from '@/lib/uiSchema';
import { ChatCard } from './ChatCard';
import { ChatActionsRow } from './ChatActionsRow';
import { ButtonWidget } from './ButtonWidget';
import { ProductCard } from './ProductCard';
import { HotelCard } from './HotelCard';
import { FlightResultsCard } from './FlightResultsCard';
import { getPublicConfig } from '@/lib/config';

interface AssistantRendererProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
    meta?: any;
  };
  onEvent?: (eventName: string, payload?: any) => void;
}

export function AssistantRenderer({ message, onEvent }: AssistantRendererProps) {
  const parsed = safeParseAssistantContent(message.content);
  const config = getPublicConfig();
  const API_URL = config.apiUrl;

  // Use ui from parsed content or from meta (e.g. when Stream/history returns ui separately)
  const rawUi = parsed?.ui ?? message.meta?.ui;
  const ui = rawUi
    ? {
        ...rawUi,
        type:
          rawUi.type === 'hotel_results'
            ? 'hotel_list'
            : rawUi.type === 'flight_results'
              ? 'flight_list'
              : rawUi.type,
      }
    : null;

  // Initialize form data from widget values if available
  const initialFormData = ui?.widgets?.reduce((acc: Record<string, any>, widget: any) => {
    if (widget.value !== undefined) {
      acc[widget.id] = widget.value;
    } else if (widget.selected !== undefined) {
      acc[widget.id] = widget.selected;
    }
    return acc;
  }, {} as Record<string, any>) || {};

  const [formData, setFormData] = useState<Record<string, any>>(initialFormData);

  // If no UI, render as plain text (actions always shown when ui is present; no last-message gating)
  if (!ui) {
    return (
      <div className="prose prose-invert max-w-none" style={{ pointerEvents: 'auto' }}>
        <p className="text-gp-text whitespace-pre-wrap">{parsed?.text || message.content}</p>
      </div>
    );
  }
  
  // Extract userId from message meta or use a default
  const userId = message.meta?.userId;
  
  // Get sessionId from message meta or use message id as fallback
  const sessionId = message.meta?.sessionId || `session-${message.id}`;

  // Handle widget field changes
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  // Handle widget/card actions - supports both { type, name, payload } and { action, value } formats
  const handleAction = useCallback(async (action: any, cardContext?: Record<string, any>) => {
    // Handle new action format: { type: "open_url" | "send_message" | "call_api", payload: any }
    if (action?.type === 'open_url' && action.payload?.url) {
      window.open(action.payload.url, '_blank', 'noopener,noreferrer');
      // Log to backend
      try {
        await fetch(`${API_URL}/api/chat/ui/event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userId ? { 'X-User-Id': userId } : {}),
          },
          body: JSON.stringify({
            userId,
            sessionId,
            messageId: message.id,
            event: {
              type: 'click',
              label: action.payload.label || 'Open URL',
              url: action.payload.url,
              action: 'open_url',
              payload: action.payload,
            },
          }),
        });
      } catch (error) {
        console.error('[UI Click] Failed to log to backend:', error);
      }
      return;
    }

    if (action?.type === 'send_message' && action.payload?.message) {
      onEvent?.('send_message', { message: action.payload.message });
      return;
    }

    if (action?.type === 'call_api' && action.payload) {
      onEvent?.('call_api', action.payload);
      return;
    }

    if (action?.type === 'open_modal' && action.payload?.modalType) {
      onEvent?.('open_modal', action.payload);
      return;
    }

    // Legacy format handling
    let eventName: string;
    let payload: Record<string, any> = { ...formData, ...(cardContext || {}) };
    let url: string | undefined;

    // Format 1: { type: "event", name: string, payload?: any }
    if (action?.type === 'event' && action?.name) {
      eventName = action.name;
      payload = { ...payload, ...(action.payload || {}) };
    }
    // Format 2: { action: string, value?: string, label?: string, url?: string, ... }
    else if (typeof action?.action === 'string') {
      eventName = action.action;
      url = action.url || action.value;
      payload = { ...payload, value: action.value, label: action.label, url, ...action };
    }
    // Format 3: Direct URL
    else if (action?.url) {
      url = action.url;
      eventName = 'open_url';
      payload = { ...payload, url, label: action.label || 'Open Link' };
    }
    else {
      return;
    }

    // Log click to backend
    try {
      await fetch(`${API_URL}/api/chat/ui/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {}),
        },
        body: JSON.stringify({
          userId,
          sessionId,
          messageId: message.id,
          event: {
            type: 'click',
            label: action.label || payload.label || eventName,
            url,
            action: eventName,
            payload,
          },
        }),
      });
      console.log('[UI Click] Logged to backend:', { eventName, url, payload });
    } catch (error) {
      console.error('[UI Click] Failed to log to backend:', error);
      // Don't block user action if logging fails
    }

    // open_url: open in new tab
    if (url || (eventName === 'open_url' && payload.value)) {
      const targetUrl = url || payload.value;
      console.log('[UI Click] Opening URL:', targetUrl);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // All other actions: call onEvent
    console.log('[UI Click]', eventName, payload);
    onEvent?.(eventName, payload);
  }, [formData, onEvent, message.id, sessionId, userId, API_URL]);

  // Render product_list UI type
  if (ui.type === 'product_list' && ui.items && Array.isArray(ui.items)) {
    const products = ui.items.slice(0, 6); // Limit to 6 products
    
    return (
      <div className="space-y-4">
        {(parsed?.text ?? message.content) && (
          <p className="text-gp-text whitespace-pre-wrap mb-4">{parsed?.text ?? message.content}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product: any, idx: number) => (
            <ProductCard
              key={product.id || idx}
              product={product}
              onAction={handleAction}
            />
          ))}
        </div>
      </div>
    );
  }

  // Render flight_list UI type (real flight options with Book Now deeplinks)
  if (ui.type === 'flight_list' && ui.items && Array.isArray(ui.items)) {
    const flights = ui.items.slice(0, 10);
    const displayText = parsed?.text ?? message.content;
    return (
      <div className="space-y-4" style={{ pointerEvents: 'auto' }}>
        {displayText && (
          <p className="text-gp-text whitespace-pre-wrap mb-4">{displayText}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flights.map((flight: any, idx: number) => (
            <FlightResultsCard
              key={flight.id || idx}
              flight={flight}
              onAction={handleAction}
            />
          ))}
        </div>
      </div>
    );
  }

  // Render hotel_list UI type (hotel cards with View/Buy; optional Set City/Dates/Budget buttons)
  if (ui.type === 'hotel_list' && ui.items && Array.isArray(ui.items)) {
    const hotels = ui.items.slice(0, 5);
    const displayText = parsed?.text ?? message.content;
    return (
      <div className="space-y-4" style={{ pointerEvents: 'auto' }}>
        {displayText && (
          <p className="text-gp-text whitespace-pre-wrap mb-4">{displayText}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((hotel: any, idx: number) => (
            <HotelCard
              key={hotel.id || idx}
              hotel={hotel}
              onAction={handleAction}
            />
          ))}
        </div>
        {ui.buttons && Array.isArray(ui.buttons) && ui.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {ui.buttons.map((btn: any, idx: number) => {
              const action = btn.action || {};
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (action.type === 'open_modal' && action.payload?.modalType) {
                      onEvent?.('open_modal', action.payload);
                    } else if (action.type === 'send_message' && action.payload?.message) {
                      onEvent?.('send_message', { message: action.payload.message });
                    } else {
                      handleAction(action, btn);
                    }
                  }}
                  className="px-3 py-1.5 bg-gp-surface border border-gp-border text-gp-text rounded-lg text-sm hover:bg-gp-hover"
                  style={{ pointerEvents: 'auto' }}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Render links UI type
  if (ui.type === 'links' && ui.items && Array.isArray(ui.items)) {
    const displayText = parsed?.text ?? message.content;
    return (
      <div className="space-y-4" style={{ pointerEvents: 'auto' }}>
        {displayText && (
          <p className="text-gp-text whitespace-pre-wrap mb-4">{displayText}</p>
        )}
        <div className="space-y-2">
          {ui.items.map((link: any, idx: number) => (
            <a
              key={idx}
              href={link.url || link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (link.action) {
                  handleAction(link.action, link);
                }
              }}
              className="block px-4 py-2 bg-gp-surface border border-gp-border rounded-lg hover:bg-gp-hover transition-colors text-gp-text hover:text-gp-primary"
            >
              <span className="font-medium">{link.title || link.label}</span>
              {link.subtitle && (
                <span className="text-gp-muted text-sm ml-2">- {link.subtitle}</span>
              )}
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Render cta_buttons UI type (Set City, Set Dates, Set Budget, etc.)
  if (ui.type === 'cta_buttons' && ui.buttons && Array.isArray(ui.buttons)) {
    const displayText = parsed?.text ?? message.content;
    return (
      <div className="space-y-4" style={{ pointerEvents: 'auto' }}>
        {displayText && (
          <p className="text-gp-text whitespace-pre-wrap mb-4">{displayText}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {ui.buttons.map((button: any, idx: number) => {
            const action = button.action || {};
            
            const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
              // Prevent event bubbling to avoid conflicts
              e.preventDefault();
              e.stopPropagation();
              
              console.log('[UI_ACTION_CLICK]', { 
                buttonLabel: button.label, 
                actionType: action.type, 
                actionPayload: action.payload 
              });

              // Unified action dispatcher
              if (action.type === 'open_url' && action.payload?.url) {
                console.log('[UI_ACTION] Opening URL:', action.payload.url);
                window.open(action.payload.url, '_blank', 'noopener,noreferrer');
                
                // Log to backend
                try {
                  await fetch(`${API_URL}/api/chat/ui/event`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(userId ? { 'X-User-Id': userId } : {}),
                    },
                    body: JSON.stringify({
                      userId,
                      sessionId,
                      messageId: message.id,
                      event: {
                        type: 'click',
                        label: button.label,
                        url: action.payload.url,
                        action: 'open_url',
                        payload: action.payload,
                      },
                    }),
                  });
                } catch (error) {
                  console.error('[UI Click] Failed to log to backend:', error);
                }
              } else if (action.type === 'send_message' && action.payload?.message) {
                console.log('[UI_ACTION_SEND_MESSAGE]', action.payload.message);
                onEvent?.('send_message', { message: action.payload.message });
              } else if (action.type === 'open_modal' && action.payload?.modalType) {
                console.log('[UI_ACTION] Opening modal:', action.payload.modalType);
                // For now, send a message to trigger the modal flow
                // TODO: Implement actual modal opening
                onEvent?.('open_modal', { modalType: action.payload.modalType, payload: action.payload });
              } else if (action.type === 'call_api' && action.payload) {
                console.log('[UI_ACTION] Calling API:', action.payload);
                try {
                  const apiResponse = await fetch(`${API_URL}${action.payload.path || action.payload.url}`, {
                    method: action.payload.method || 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(userId ? { 'X-User-Id': userId } : {}),
                      ...(action.payload.headers || {}),
                    },
                    body: JSON.stringify(action.payload.body || {}),
                  });
                  
                  if (apiResponse.ok && action.payload.then === 'send_message') {
                    const data = await apiResponse.json();
                    const messageToSend = action.payload.messageTemplate 
                      ? action.payload.messageTemplate.replace('{result}', JSON.stringify(data))
                      : 'Done!';
                    console.log('[UI_ACTION_SEND_MESSAGE] (after API call)', messageToSend);
                    onEvent?.('send_message', { message: messageToSend });
                  }
                } catch (apiError) {
                  console.error('[UI_ACTION] API call failed:', apiError);
                }
              } else {
                // Fallback to legacy handleAction
                console.log('[UI_ACTION] Using legacy handleAction');
                handleAction(button.action || button, button);
              }
            };

            return (
              <button
                key={idx}
                type="button"
                onClick={handleClick}
                className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-white font-medium rounded-lg transition-colors text-sm cursor-pointer relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                {button.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Render based on UI type
  if (ui.type === 'cards' || ui.type === 'panel') {
    // Support both 'cards' array and 'actions' array at top level
    const cards = ui.cards || [];
    const hasTopLevelActions = ui.actions && ui.actions.length > 0 && cards.length === 0;
    
    return (
      <div className="space-y-4">
        {ui.title && (
          <h3 className="text-lg font-semibold text-gp-text mb-4">{ui.title}</h3>
        )}
        
        {/* Render text content if present */}
        {(parsed?.text ?? message.content) && (
          <p className="text-gp-text whitespace-pre-wrap mb-4">{parsed?.text ?? message.content}</p>
        )}
        
        {/* Render cards if available */}
        {cards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card: any, idx: number) => (
              <ChatCard
                key={card.id || idx}
                card={card}
                messageId={message.id}
                sessionId={sessionId}
                userId={userId}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
        
        {/* Render top-level actions if no cards */}
        {hasTopLevelActions && (
          <ChatActionsRow
            actions={ui.actions}
            messageId={message.id}
            sessionId={sessionId}
            userId={userId}
            onAction={handleAction}
          />
        )}
      </div>
    );
  }

  // Render widget-based UI (trip_planner, form, etc.)
  if (ui.widgets && Array.isArray(ui.widgets)) {
    return (
      <div className="space-y-4">
        {ui.title && (
          <h3 className="text-lg font-semibold text-gp-text mb-4">{ui.title}</h3>
        )}
        <div className="space-y-4">
          {ui.widgets.map((widget: any, idx: number) => {
            switch (widget.kind) {
              case 'card':
                return (
                  <div
                    key={widget.id || idx}
                    className="bg-gp-surface border border-gp-border rounded-xl p-5 shadow-gp-md"
                  >
                    {widget.imageUrl && (
                      <img
                        src={widget.imageUrl}
                        alt={widget.title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}
                    <h4 className="text-gp-text font-semibold text-base mb-2">{widget.title}</h4>
                    {widget.description && (
                      <p className="text-gp-muted text-sm mb-3">{widget.description}</p>
                    )}
                    {widget.actions && widget.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {widget.actions.map((action: any, actionIdx: number) => (
                          <button
                            key={actionIdx}
                            onClick={() => handleAction(action, {
                              providerName: widget.providerName || widget.title,
                              planId: widget.planId || widget.id,
                              cardId: widget.id,
                              ...widget,
                            })}
                            className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-white font-medium rounded-lg transition-colors text-sm"
                          >
                            {action.label || action.name || action.action || 'Select'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );

              case 'input':
                return (
                  <div key={widget.id || idx} className="mb-4">
                    <label className="block text-sm font-medium text-gp-text mb-2">
                      {widget.label}
                    </label>
                    <input
                      type="text"
                      value={formData[widget.id] !== undefined ? formData[widget.id] : (widget.value || '')}
                      onChange={(e) => handleFieldChange(widget.id, e.target.value)}
                      placeholder={widget.placeholder}
                      className="w-full px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                    />
                  </div>
                );

              case 'number':
                return (
                  <div key={widget.id || idx} className="mb-4">
                    <label className="block text-sm font-medium text-gp-text mb-2">
                      {widget.label}
                    </label>
                    <input
                      type="number"
                      min={widget.min ?? 1}
                      max={widget.max ?? 20}
                      value={formData[widget.id] !== undefined ? formData[widget.id] : (widget.value ?? 1)}
                      onChange={(e) => handleFieldChange(widget.id, parseInt(e.target.value, 10) || 1)}
                      placeholder={widget.placeholder}
                      className="w-full px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                    />
                  </div>
                );

              case 'select':
                const selectOptions = widget.options || [];
                const selectValue = formData[widget.id] !== undefined ? formData[widget.id] : (widget.value ?? selectOptions[0]);
                return (
                  <div key={widget.id || idx} className="mb-4">
                    <label className="block text-sm font-medium text-gp-text mb-2">
                      {widget.label}
                    </label>
                    <select
                      value={selectValue}
                      onChange={(e) => handleFieldChange(widget.id, e.target.value)}
                      className="w-full px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                    >
                      {selectOptions.map((opt: string, optIdx: number) => (
                        <option key={optIdx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                );

              case 'datepicker':
                return (
                  <div key={widget.id || idx} className="mb-4">
                    <label className="block text-sm font-medium text-gp-text mb-2">
                      {widget.label}
                    </label>
                    <input
                      type="date"
                      value={formData[widget.id] !== undefined ? formData[widget.id] : (widget.value || '')}
                      onChange={(e) => handleFieldChange(widget.id, e.target.value)}
                      className="w-full px-4 py-2 bg-gp-bg border border-gp-border rounded-lg text-gp-text focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
                    />
                  </div>
                );

              case 'slider':
                return (
                  <div key={widget.id || idx} className="mb-4">
                    <label className="block text-sm font-medium text-gp-text mb-2">
                      {widget.label}: ${formData[widget.id] || widget.value || widget.min || 0}
                    </label>
                    <input
                      type="range"
                      min={widget.min || 0}
                      max={widget.max || 10000}
                      value={formData[widget.id] || widget.value || widget.min || 0}
                      onChange={(e) => handleFieldChange(widget.id, parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gp-muted mt-1">
                      <span>${widget.min || 0}</span>
                      <span>${widget.max || 10000}</span>
                    </div>
                  </div>
                );

              case 'chips':
                const selectedValues = formData[widget.id] || widget.selected || [];
                return (
                  <div key={widget.id || idx} className="mb-4">
                    <label className="block text-sm font-medium text-gp-text mb-2">
                      {widget.label}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {widget.options?.map((option: string, optionIdx: number) => {
                        const isSelected = selectedValues.includes(option);
                        return (
                          <button
                            key={optionIdx}
                            onClick={() => {
                              const newValues = isSelected
                                ? selectedValues.filter((v: string) => v !== option)
                                : [...selectedValues, option];
                              handleFieldChange(widget.id, newValues);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-gp-primary text-white'
                                : 'bg-gp-surface border border-gp-border text-gp-text hover:bg-gp-bg'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );

              case 'button':
                return (
                  <ButtonWidget
                    key={widget.id || idx}
                    label={widget.label}
                    url={widget.url}
                    action={widget.action?.name || widget.action?.action || widget.action}
                    payload={widget.action?.payload || widget.payload}
                    messageId={message.id}
                    sessionId={sessionId}
                    userId={userId}
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      if (widget.action) {
                        handleAction(widget.action);
                      }
                    }}
                  />
                );

              default:
                return null;
            }
          })}
        </div>
      </div>
    );
  }

  // Fallback: render as text
  return (
    <div className="prose prose-invert max-w-none">
      <p className="text-gp-text whitespace-pre-wrap">{parsed?.text ?? message.content}</p>
    </div>
  );
}

