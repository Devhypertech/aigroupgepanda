/**
 * Message Bubble Component - Individual message display
 */

interface MessageBubbleProps {
  text: string;
  isAI: boolean;
  timestamp?: Date;
  isMobile?: boolean;
}

export function MessageBubble({ text, isAI, timestamp, isMobile = false }: MessageBubbleProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        marginBottom: '1.5rem',
        alignItems: 'flex-start',
        ...(isAI ? {} : { flexDirection: 'row-reverse' }),
      }}
    >
      {/* Avatar space for AI messages */}
      {isAI && (
        <div style={{ width: isMobile ? '32px' : '48px', flexShrink: 0 }} />
      )}
      
      {/* Message content */}
      <div
        style={{
          maxWidth: isMobile ? '85%' : '75%',
          padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.125rem',
          borderRadius: isAI ? '1rem 1rem 1rem 0.25rem' : '1rem 1rem 0.25rem 1rem',
          background: isAI
            ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #1a7a5e 0%, #2d9d7a 100%)',
          color: isAI ? '#e5e5e5' : '#ffffff',
          border: isAI
            ? '1px solid rgba(45, 45, 45, 0.5)'
            : '1px solid rgba(45, 157, 122, 0.4)',
          boxShadow: isAI
            ? '0 2px 8px rgba(0, 0, 0, 0.3)'
            : '0 4px 12px rgba(26, 122, 94, 0.4)',
          lineHeight: '1.6',
          fontSize: isMobile ? '0.875rem' : '0.9375rem',
          wordWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
        }}
      >
        {text}
        {timestamp && (
          <div
            style={{
              fontSize: '0.75rem',
              opacity: 0.7,
              marginTop: '0.5rem',
            }}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
      
      {/* Avatar space for user messages */}
      {!isAI && (
        <div style={{ width: isMobile ? '32px' : '48px', flexShrink: 0 }} />
      )}
    </div>
  );
}

