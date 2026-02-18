/**
 * PostCard Component
 * Single column feed card with avatar, username, time, image, title, description, and action buttons
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { FeedItem } from '@gepanda/shared';
import { getPublicConfig } from '../../lib/config';
import { getGuestUserId, isGuestUser } from '../../lib/guestAuth';

interface PostCardProps {
  item: FeedItem;
  onDealClick?: (affiliateUrl: string) => void;
  onNotInterested?: (itemId: string) => void;
}

// Debounce helper
function useDebounce(callback: () => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(callback, delay);
  }, [callback, delay]);
}

export function PostCard({ item, onDealClick, onNotInterested }: PostCardProps) {
  const { data: session } = useSession();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isWhyLoading, setIsWhyLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Get user ID (real or guest)
  const realUserId = (session?.user as any)?.id;
  const guestUserId = getGuestUserId();
  const currentUserId = realUserId || guestUserId;
  const isCurrentUserGuest = isGuestUser(currentUserId);

  // Check if item is saved on mount
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!currentUserId) return;

      try {
        const response = await fetch(`${API_URL}/api/feed/saved`, {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUserId,
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const isItemSaved = data.items?.some((savedItem: FeedItem) => savedItem.id === item.id);
          setIsSaved(isItemSaved);
        }
      } catch (error) {
        // Silently handle error
      }
    };

    checkSavedStatus();
  }, [item.id, currentUserId, API_URL]);

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const timestamp = formatTimestamp(item.createdAt);
  const authorName = item.source || 'GePanda';
  const authorAvatar = '👤';

  // Track view when card enters viewport (debounced)
  const trackView = useCallback(async () => {
    if (hasTrackedView.current || !currentUserId) return;

    try {
      await fetch(`${API_URL}/api/feed/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUserId,
        },
        credentials: 'include',
        body: JSON.stringify({
          feedItemId: item.id,
          action: 'view',
        }),
      });
      hasTrackedView.current = true;
    } catch (error) {
      // Silently handle error
    }
  }, [item.id, currentUserId, API_URL]);

  const debouncedTrackView = useDebounce(trackView, 1000);

  // Intersection Observer for view tracking
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            debouncedTrackView();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [debouncedTrackView]);

  // Handle save/unsave toggle
  const handleSave = async () => {
    if (!currentUserId || isSaving) return;

    setIsSaving(true);
    const newSaved = !isSaved;

    try {
      const url = `${API_URL}/api/feed/${item.id}/save`;
      const method = newSaved ? 'POST' : 'DELETE';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        setIsSaved(newSaved);
      }
    } catch (error) {
      // Silently handle error
    } finally {
      setIsSaving(false);
    }
  };

  const handleDealClick = () => {
    if (item.affiliateUrl && onDealClick) {
      onDealClick(item.affiliateUrl);
    } else if (item.affiliateUrl) {
      window.open(item.affiliateUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleNotInterested = async () => {
    if (!currentUserId) return;

    setIsHiding(true);

    try {
      await fetch(`${API_URL}/api/feed/not-interested`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUserId,
        },
        credentials: 'include',
        body: JSON.stringify({
          feedItemId: item.id,
          tag: (item.tagsJson as string[])?.[0],
          category: item.category,
        }),
      });

      // Hide card with animation
      if (cardRef.current) {
        cardRef.current.style.opacity = '0';
        cardRef.current.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          onNotInterested?.(item.id);
        }, 300);
      }
    } catch (error) {
      setIsHiding(false);
    }
  };

  // Handle "Why this matters" - send context to AI and open chat
  const handleWhyToggle = async () => {
    if (!currentUserId) {
      console.error('[PostCard] User ID required for followup');
      return;
    }

    setIsWhyLoading(true);

    try {
      // Send context to AI
      const response = await fetch(`${API_URL}/api/chat/followup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUserId,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          source: item.source,
          product_id: item.id, // Use item.id as product_id if it's a product
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to generate explanation: ${response.status}`);
      }

      const data = await response.json();

      // Navigate to chat with conversation ID
      // The chat will load the conversation history which includes both user message and AI response
      const chatUrl = `/chat?sessionId=${encodeURIComponent(data.conversationId)}`;
      window.location.href = chatUrl;
    } catch (error) {
      console.error('[PostCard] Error generating followup:', error);
      alert(`Failed to generate explanation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsWhyLoading(false);
    }
  };

  if (isHiding) {
    return null;
  }

  return (
    <article 
      ref={cardRef}
      className="bg-gp-surface rounded-xl border border-gray-200 overflow-hidden hover:border-gp-primary/30 transition-all shadow-sm"
    >
      {/* Header: Avatar, Username, Time */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-10 h-10 rounded-full bg-gp-primary/20 flex items-center justify-center flex-shrink-0 text-lg">
          {authorAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gp-text font-semibold text-sm truncate">
            {authorName}
          </p>
          <p className="text-gp-muted text-xs">{timestamp}</p>
        </div>
      </div>

      {/* Image */}
      {item.mediaUrl && (
        <div className="w-full">
          {item.type === 'video' ? (
            <div className="relative w-full pb-[56.25%] bg-black">
              {item.mediaUrl.includes('youtube.com') || item.mediaUrl.includes('youtu.be') ? (
                <iframe
                  src={item.mediaUrl}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl">🎥</span>
                </div>
              )}
            </div>
          ) : (
            <img
              src={item.mediaUrl}
              alt={item.title}
              className="w-full h-auto max-h-[500px] object-cover"
            />
          )}
        </div>
      )}

      {/* Content: Title, Description */}
      <div className="px-5 py-4">
        {item.category && (
          <span className="inline-block px-3 py-1 bg-gp-primary/10 text-gp-primary text-xs font-semibold rounded-full mb-3 tracking-wide uppercase">
            {item.category}
          </span>
        )}
        
        <h3 className="text-gp-text font-semibold text-lg mb-2 leading-tight">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-gp-muted text-sm leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="px-5 pb-4 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Like */}
          <button
            onClick={async () => {
              if (isLiking) return;
              setIsLiking(true);
              try {
                // Track like interaction
                await fetch(`${API_URL}/api/feed/interact`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(currentUserId ? { 'X-User-Id': currentUserId } : {}),
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    feedItemId: item.id,
                    action: 'like',
                    userId: currentUserId,
                  }),
                });
                setIsLiked(!isLiked);
              } catch (error) {
                console.error('[PostCard] Error liking:', error);
              } finally {
                setIsLiking(false);
              }
            }}
            disabled={isLiking}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isLiked
                ? 'text-red-500 hover:text-red-600'
                : 'text-gp-muted hover:text-gp-text'
            } hover:bg-gray-100 ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <span className="text-xl">{isLiked ? '❤️' : '🤍'}</span>
            <span className="text-sm font-medium hidden sm:inline">Like</span>
          </button>

          {/* Center: Save */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isSaved
                ? 'text-gp-primary bg-gp-primary/10'
                : 'text-gp-muted hover:text-gp-text'
            } hover:bg-gray-100 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isSaved ? 'Unsave' : 'Save'}
          >
            <span className="text-xl">{isSaved ? '🔖' : '📌'}</span>
            <span className="text-sm font-medium hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Share */}
          <button
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: item.title,
                    text: item.description,
                    url: item.url || window.location.href,
                  });
                } catch (error) {
                  // User cancelled or error
                  console.log('[PostCard] Share cancelled or failed');
                }
              } else {
                // Fallback: copy to clipboard
                const shareUrl = item.url || window.location.href;
                await navigator.clipboard.writeText(shareUrl);
                alert('Link copied to clipboard!');
              }
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gp-muted hover:text-gp-text hover:bg-gray-100"
            title="Share"
          >
            <span className="text-xl">🔗</span>
            <span className="text-sm font-medium hidden sm:inline">Share</span>
          </button>

          {/* Ask Follow-up */}
          <Link
            href={`/chat?followUp=${encodeURIComponent(`Tell me more about: ${item.title || 'this post'}.`)}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gp-muted hover:text-gp-text hover:bg-gray-100"
            title="Ask Follow-up"
          >
            <span className="text-xl">💬</span>
            <span className="text-sm font-medium hidden sm:inline">Ask Follow-up</span>
          </Link>
        </div>

        {/* Deal/Product CTA */}
        {(item.type === 'deal' || item.type === 'product') && item.affiliateUrl && (
          <button
            onClick={handleDealClick}
            className="w-full mt-4 py-3 px-5 bg-gp-primary hover:bg-gp-primary-dark text-white font-semibold rounded-xl transition-smooth shadow-gp-md hover:shadow-gp-lg text-sm tracking-wide uppercase"
          >
            {item.type === 'deal' ? 'View Deal' : 'Buy Now'}
          </button>
        )}
      </div>
    </article>
  );
}

