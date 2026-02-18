/**
 * Chat Actions Row Component
 * Renders a row of action buttons
 */

'use client';

import { ButtonWidget } from './ButtonWidget';

interface ChatActionsRowProps {
  actions: Array<{
    label: string;
    url?: string;
    action?: string;
    payload?: Record<string, any>;
  }>;
  messageId: string;
  sessionId: string;
  userId?: string;
  onAction?: (action: string, payload?: any) => void;
}

export function ChatActionsRow({ actions, messageId, sessionId, userId, onAction }: ChatActionsRowProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {actions.map((action, idx) => (
        <ButtonWidget
          key={idx}
          label={action.label}
          url={action.url}
          action={action.action}
          payload={action.payload}
          messageId={messageId}
          sessionId={sessionId}
          userId={userId}
          variant={idx === 0 ? 'primary' : 'secondary'}
          onClick={() => {
            if (onAction && action.action) {
              onAction(action.action, action.payload);
            }
          }}
        />
      ))}
    </div>
  );
}
