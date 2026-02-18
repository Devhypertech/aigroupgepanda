/**
 * Button Widget Component
 * Renders interactive buttons with click logging to backend
 */

'use client';

import { useCallback } from 'react';
import { getPublicConfig } from '../../lib/config';

interface ButtonWidgetProps {
  label: string;
  url?: string;
  action?: string;
  payload?: Record<string, any>;
  messageId: string;
  sessionId: string;
  userId?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  onClick?: () => void;
}

export function ButtonWidget({
  label,
  url,
  action,
  payload = {},
  messageId,
  sessionId,
  userId,
  variant = 'primary',
  className = '',
  onClick,
}: ButtonWidgetProps) {
  const config = getPublicConfig();
  const API_URL = config.apiUrl;

  const handleClick = useCallback(async () => {
    // Call custom onClick if provided
    if (onClick) {
      onClick();
    }

    // Open URL in new tab if provided
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
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
          messageId,
          event: {
            type: 'click',
            label,
            url,
            action,
            payload,
          },
        }),
      });
      console.log('[ButtonWidget] Click logged to backend:', { label, url, action });
    } catch (error) {
      console.error('[ButtonWidget] Failed to log click:', error);
      // Don't block user action if logging fails
    }
  }, [url, action, payload, messageId, sessionId, userId, label, onClick, API_URL]);

  const baseClasses = 'px-4 py-2 font-medium rounded-lg transition-colors text-sm';
  const variantClasses = {
    primary: 'bg-gp-primary hover:bg-gp-primary-dark text-black shadow-md hover:shadow-lg',
    secondary: 'bg-gp-surface border border-gp-border text-gp-text hover:bg-gp-hover',
    outline: 'border-2 border-gp-primary text-gp-primary hover:bg-gp-primary hover:text-black',
  };

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {label}
    </button>
  );
}
