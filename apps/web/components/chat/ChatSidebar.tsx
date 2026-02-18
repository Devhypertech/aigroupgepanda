/**
 * Chat Sidebar Component
 * Shows conversation history list (like ChatGPT's left panel)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getPublicConfig } from '../../lib/config';
import { useStableUserId } from '../../lib/useStableUserId';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
}

interface ChatSidebarProps {
  currentSessionId?: string;
  onSelectConversation?: (sessionId: string) => void;
  onNewChat?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChatSidebar({
  currentSessionId,
  onSelectConversation,
  onNewChat,
  isOpen = true,
  onClose,
}: ChatSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { stableUserId, isReady } = useStableUserId();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;
  const API_BASE = typeof window !== 'undefined' ? '' : API_URL;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!stableUserId || !isReady) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/chat/conversations?userId=${encodeURIComponent(stableUserId)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to load conversations');
      }
    } catch (err) {
      console.error('[ChatSidebar] Error loading conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [stableUserId, isReady, API_BASE]);

  // Load conversations on mount and when userId changes
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refresh conversations when pathname changes (user navigated)
  useEffect(() => {
    if (pathname === '/chat') {
      loadConversations();
    }
  }, [pathname, loadConversations]);

  // Refresh conversations periodically (every 30 seconds) to catch new conversations
  // Less frequent to avoid blinking
  useEffect(() => {
    if (pathname !== '/chat') return;
    
    const interval = setInterval(() => {
      // Only refresh if not currently loading to avoid flickering
      if (!isLoading) {
        loadConversations();
      }
    }, 30000); // Refresh every 30 seconds (less aggressive)

    return () => clearInterval(interval);
  }, [pathname, loadConversations, isLoading]);

  const handleSelectConversation = (sessionId: string) => {
    if (onSelectConversation) {
      onSelectConversation(sessionId);
    } else {
      // Default: navigate to chat with sessionId
      router.push(`/chat?sessionId=${encodeURIComponent(sessionId)}`);
    }
  };

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      router.push('/chat');
    }
    // Refresh list after a short delay to show new conversation
    setTimeout(() => {
      loadConversations();
    }, 1000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-gp-surface border-r border-gp-border">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gp-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gp-text">Conversations</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gp-muted hover:text-gp-text transition-colors"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>
        <button
          onClick={handleNewChat}
          className="w-full px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-black font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gp-muted text-sm">Loading conversations...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500 text-sm">{error}</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gp-muted text-sm">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                  currentSessionId === conv.id
                    ? 'bg-gp-primary text-black'
                    : 'hover:bg-gp-hover text-gp-text'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p
                    className={`text-sm font-medium truncate flex-1 ${
                      currentSessionId === conv.id ? 'text-black' : 'text-gp-text'
                    }`}
                  >
                    {conv.title}
                  </p>
                  <span
                    className={`text-xs flex-shrink-0 ${
                      currentSessionId === conv.id ? 'text-black/70' : 'text-gp-muted'
                    }`}
                  >
                    {formatDate(conv.lastMessageAt)}
                  </span>
                </div>
                {conv.lastMessage && (
                  <p
                    className={`text-xs truncate ${
                      currentSessionId === conv.id ? 'text-black/70' : 'text-gp-muted'
                    }`}
                  >
                    {conv.lastMessage}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

