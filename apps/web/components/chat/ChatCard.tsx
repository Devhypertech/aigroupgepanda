/**
 * Chat Card Component
 * Renders a card with title, subtitle, image, bullets, and actions
 */

'use client';

import { ButtonWidget } from './ButtonWidget';

interface ChatCardProps {
  card: {
    id?: string;
    title: string;
    subtitle?: string;
    description?: string;
    image?: string;
    imageUrl?: string;
    bullets?: string[];
    items?: string[];
    actions?: Array<{
      label: string;
      url?: string;
      action?: string;
      payload?: Record<string, any>;
    }>;
  };
  messageId: string;
  sessionId: string;
  userId?: string;
  onAction?: (action: string, payload?: any) => void;
}

export function ChatCard({ card, messageId, sessionId, userId, onAction }: ChatCardProps) {
  const imageUrl = card.image || card.imageUrl;
  const bullets = card.bullets || card.items || [];

  return (
    <div className="bg-gp-surface border border-gp-border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={card.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            // Hide image on error
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className="p-5">
        <h4 className="text-gp-text font-semibold text-base mb-1">{card.title}</h4>
        {card.subtitle && (
          <p className="text-gp-muted text-xs mb-2">{card.subtitle}</p>
        )}
        {card.description && (
          <p className="text-gp-muted text-sm mb-3 leading-relaxed">{card.description}</p>
        )}
        {bullets.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {bullets.map((item: string, itemIdx: number) => (
              <li key={itemIdx} className="text-gp-muted text-xs flex items-start gap-2">
                <span className="text-gp-primary mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        {card.actions && card.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {card.actions.map((action, actionIdx) => (
              <ButtonWidget
                key={actionIdx}
                label={action.label}
                url={action.url}
                action={action.action}
                payload={action.payload}
                messageId={messageId}
                sessionId={sessionId}
                userId={userId}
                variant={actionIdx === 0 ? 'primary' : 'secondary'}
                onClick={() => {
                  if (onAction && action.action) {
                    onAction(action.action, action.payload);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
