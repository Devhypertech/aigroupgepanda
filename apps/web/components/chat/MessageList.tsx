/**
 * Message List Component - Displays conversation messages
 */

import { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { Avatar } from './Avatar';
import { UIRenderer } from './UIRenderer';
import { getPublicConfig } from '../../lib/config';

import type { UiSpec } from '../../types/chat';

export interface Message {
  id: string;
  type: 'text' | 'ui';
  text?: string;
  ui?: UiSpec;
  isAI: boolean;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
  sessionId: string;
  userId?: string;
  onMessageUpdate?: (messageId: string, updatedUi: any) => void;
  onUIEvent?: (eventName: string, payload?: any) => void;
}

export function MessageList({ messages, isTyping = false, sessionId, userId, onMessageUpdate, onUIEvent }: MessageListProps) {
  const config = getPublicConfig();
  const API_URL = config.apiUrl;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '1rem' : '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
      }}
    >
      {messages.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a0a0a0',
            textAlign: 'center',
            padding: isMobile ? '1.5rem 1rem' : '2rem',
          }}
        >
          <Avatar size={isMobile ? "medium" : "large"} />
          <h2 style={{ 
            marginTop: isMobile ? '1rem' : '1.5rem', 
            marginBottom: '0.5rem', 
            color: '#e5e5e5',
            fontSize: isMobile ? '1.125rem' : '1.5rem',
          }}>
            GePanda AI
          </h2>
          <p style={{ 
            fontSize: isMobile ? '0.875rem' : '0.9375rem', 
            maxWidth: isMobile ? '100%' : '400px',
            padding: isMobile ? '0 0.5rem' : '0',
          }}>
            Your AI travel companion. Ask me anything about planning your trip!
          </p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div key={message.id} style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: isMobile ? '8px' : '12px',
              marginBottom: isMobile ? '0.75rem' : '0',
            }}>
              {message.isAI && (
                <div style={{ marginTop: '0.25rem', flexShrink: 0 }}>
                  <Avatar size="small" />
                </div>
              )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {message.type === 'ui' && message.ui ? (
                          <div style={{ 
                            maxWidth: isMobile ? '85%' : '75%',
                            padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.125rem',
                            borderRadius: '1rem 1rem 1rem 0.25rem',
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                            border: '1px solid rgba(45, 45, 45, 0.5)',
                          }}>
                            <UIRenderer
                              ui={message.ui}
                              sessionId={sessionId}
                              apiUrl={API_URL}
                              userId={userId}
                              onUpdate={(updatedUi) => {
                                // UI updated
                                if (onMessageUpdate) {
                                  onMessageUpdate(message.id, updatedUi);
                                }
                              }}
                              onUIEvent={onUIEvent}
                            />
                          </div>
                        ) : (
                          <>
                            {console.log('[MessageList] Rendering text message:', {
                              type: message.type,
                              hasUI: !!message.ui,
                              text: message.text?.substring(0, 50)
                            })}
                            <MessageBubble
                              text={message.text || ''}
                              isAI={message.isAI}
                              timestamp={message.timestamp}
                              isMobile={isMobile}
                            />
                          </>
                        )}
                      </div>
            </div>
          ))}
          
          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ marginTop: '0.25rem' }}>
                <Avatar size="small" isTyping={true} />
              </div>
              <div
                style={{
                  padding: '0.875rem 1.125rem',
                  borderRadius: '1rem 1rem 1rem 0.25rem',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  border: '1px solid rgba(45, 45, 45, 0.5)',
                  display: 'inline-block',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#a0a0a0',
                      animation: 'typing 1.4s ease-in-out infinite',
                    }}
                  />
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#a0a0a0',
                      animation: 'typing 1.4s ease-in-out infinite 0.2s',
                    }}
                  />
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#a0a0a0',
                      animation: 'typing 1.4s ease-in-out infinite 0.4s',
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

