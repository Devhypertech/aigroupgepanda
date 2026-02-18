/**
 * AI Avatar Component - Persistent avatar for the AI companion
 */

interface AvatarProps {
  size?: 'small' | 'medium' | 'large';
  isTyping?: boolean;
}

export function Avatar({ size = 'medium', isTyping = false }: AvatarProps) {
  const sizeMap = {
    small: '32px',
    medium: '48px',
    large: '64px',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: sizeMap[size],
        height: sizeMap[size],
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a7a5e 0%, #2d9d7a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(45, 157, 122, 0.3)',
        border: '2px solid rgba(45, 157, 122, 0.4)',
      }}
    >
      {/* AI Icon/Initial */}
      <span
        style={{
          color: '#ffffff',
          fontSize: size === 'small' ? '16px' : size === 'medium' ? '20px' : '28px',
          fontWeight: 'bold',
        }}
      >
        GP
      </span>
      
      {/* Typing indicator */}
      {isTyping && (
        <div
          style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#2d9d7a',
            border: '2px solid #0a0a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ffffff',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}

