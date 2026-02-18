/**
 * ChatGPT-style Input Component
 */

import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isMobile?: boolean;
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Message GePanda...', isMobile = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: isMobile ? '0.5rem' : '0.75rem',
          padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
          background: 'rgba(26, 26, 26, 0.8)',
          borderTop: '1px solid rgba(45, 45, 45, 0.5)',
          backdropFilter: 'blur(10px)',
          flexShrink: 0,
        }}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            minHeight: isMobile ? '20px' : '24px',
            maxHeight: isMobile ? '150px' : '200px',
            padding: isMobile ? '0.625rem 0.875rem' : '0.75rem 1rem',
            borderRadius: '1.5rem',
            border: '1px solid rgba(45, 45, 45, 0.5)',
            background: 'rgba(10, 10, 10, 0.8)',
            color: '#e5e5e5',
            fontSize: isMobile ? '0.875rem' : '0.9375rem',
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            lineHeight: '1.5',
            overflowY: 'auto',
            ...(disabled && {
              opacity: 0.5,
              cursor: 'not-allowed',
            }),
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(45, 157, 122, 0.5)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(45, 45, 45, 0.5)';
          }}
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          style={{
            width: isMobile ? '36px' : '40px',
            height: isMobile ? '36px' : '40px',
            borderRadius: '50%',
            border: 'none',
            background: message.trim() && !disabled
              ? 'linear-gradient(135deg, #1a7a5e 0%, #2d9d7a 100%)'
              : 'rgba(45, 45, 45, 0.5)',
            color: '#ffffff',
            cursor: message.trim() && !disabled ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0,
            touchAction: 'manipulation', // Better touch handling on mobile
          }}
          onMouseEnter={(e) => {
            if (message.trim() && !disabled) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(45, 157, 122, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <svg
            width={isMobile ? "18" : "20"}
            height={isMobile ? "18" : "20"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </form>
  );
}

