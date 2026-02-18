/**
 * Feed Card Component V2
 * Modern social feed card with Tailwind styling
 * Only includes save/bookmark action
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { FeedItem } from '@gepanda/shared';
import { getPublicConfig } from '../../lib/config';
import { getGuestUserId, isGuestUser } from '../../lib/guestAuth';

interface FeedCardV2Props {
  item: FeedItem;
  isMobile: boolean;
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

export function FeedCardV2({ item, isMobile, onDealClick, onNotInterested }: FeedCardV2Props) {
  const { data: session } = useSession();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  const [isSaved, setIsSaved] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);
  const [isWhyLoading, setIsWhyLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [whyContent, setWhyContent] = useState<{
    summary?: string;
    why?: string;
    impact?: string;
    actions: { now: string; soon: string; later: string };
    // Legacy support
    whyThisMatters?: string[];
    whatShouldIDo?: { now: string; soon: string; later: string };
    // New structured UI format
    text?: string;
    ui?: {
      type: 'panel';
      title?: string;
      bullets?: string[];
      actions?: Array<{
        label: string;
        action?: string;
        payload?: any;
      }>;
    };
  } | null>(null);

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
      } else {
        const errorData = await response.json().catch(() => ({}));
        // Error handled below
      }
    } catch (error) {
      // Error handled by toast notification
    } finally {
      setIsSaving(false);
    }
  };

  // Share: copy link or Web Share API
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin + `/feed?item=${item.id}` : '';
    const title = item.title || 'Feed post';
    const text = item.contentSnippet || item.title || '';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text, url });
        setShareCopied(true);
      } else {
        await navigator.clipboard?.writeText(url);
        setShareCopied(true);
      }
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard?.writeText(url);
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
        } catch (_) {}
      }
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
      // Error handled by toast notification
      setIsHiding(false);
    }
  };

  // Handle "Why this matters" toggle
  const handleWhyToggle = async () => {
    if (isWhyExpanded) {
      setIsWhyExpanded(false);
      return;
    }

    // If content is already cached, just expand
    if (whyContent) {
      setIsWhyExpanded(true);
      return;
    }

    // Fetch content
    setIsWhyExpanded(true);
    setIsWhyLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/feed/${item.id}/why`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch why content: ${response.status}`);
      }

      const data = await response.json();
      
      // Support new structured UI format, new format (summary, why, impact, actions), and legacy format
      setWhyContent({
        // New structured UI format
        text: data.text,
        ui: data.ui,
        // New format
        summary: data.summary || data.text,
        why: data.why,
        impact: data.impact,
        actions: data.actions || data.whatShouldIDo || {
          now: '',
          soon: '',
          later: '',
        },
        // Legacy fields for backward compatibility
        whyThisMatters: data.whyThisMatters,
        whatShouldIDo: data.whatShouldIDo,
      });
    } catch (error) {
      // Error handled by fallback content
      setWhyContent({
        summary: 'Unable to generate insights at this time.',
        why: 'Please try again later.',
        impact: 'Please try again later.',
        actions: {
          now: 'Try again later',
          soon: 'Try again later',
          later: 'Try again later',
        },
      });
    } finally {
      setIsWhyLoading(false);
    }
  };

  if (isHiding) {
    return null; // Card is being hidden
  }

  return (
    <article 
      ref={cardRef}
      className="bg-gp-surface rounded-xl border border-gray-200 overflow-hidden mb-6 hover:border-gp-primary/30 transition-all shadow-sm"
    >
      {/* Card Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200">
        <div className="w-10 h-10 rounded-full bg-gp-primary/20 flex items-center justify-center flex-shrink-0 text-lg">
          {authorAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gp-text font-semibold text-sm truncate">
            {authorName}
          </p>
          <p className="text-gp-muted text-xs">{timestamp}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNotInterested}
            className="p-1.5 text-gp-muted hover:text-gp-text hover:bg-gray-100 rounded-lg transition-colors"
            title="Not interested"
          >
            ✕
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`p-1.5 rounded-lg transition-colors ${
              isSaved
                ? 'text-gp-primary bg-gp-primary/10'
                : 'text-gp-muted hover:text-gp-text hover:bg-gray-100'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isSaved ? 'Unsave' : 'Save'}
          >
            <span className="text-lg">{isSaved ? '🔖' : '📌'}</span>
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        {/* Category Badge */}
        {item.category && (
          <span className="inline-block px-3 py-1 bg-gp-primary/10 text-gp-primary text-xs font-semibold rounded-full mb-3 tracking-wide uppercase">
            {item.category}
          </span>
        )}
        
        <h3 className="text-gp-text font-semibold text-lg mb-2.5 line-clamp-2 leading-tight">
          {item.title}
        </h3>
        <p className="text-gp-muted text-sm mb-4 line-clamp-3 leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Media */}
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
              className="w-full h-auto max-h-[400px] object-cover"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={handleWhyToggle}
            disabled={isWhyLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isWhyExpanded
                ? 'text-gp-primary bg-gp-primary/10'
                : 'text-gp-muted hover:text-gp-text hover:bg-gray-100'
            } ${isWhyLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isWhyLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span className="text-sm font-medium">Loading...</span>
              </>
            ) : (
              <>
                <span className="text-lg">💡</span>
                <span className="text-sm font-medium">
                  {isWhyExpanded ? 'Hide' : 'Why this matters'}
                </span>
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-gp-muted hover:text-gp-text hover:bg-gray-100"
          >
            <span className="text-lg">↗️</span>
            <span className="text-sm font-medium">{shareCopied ? 'Copied!' : 'Share'}</span>
          </button>
          <Link
            href={`/chat?followUp=${encodeURIComponent(`Tell me more about: ${item.title || 'this post'}.`)}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-gp-muted hover:text-gp-text hover:bg-gray-100"
          >
            <span className="text-lg">💬</span>
            <span className="text-sm font-medium">Ask Follow-up</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isSaved
                ? 'text-gp-primary bg-gp-primary/10'
                : 'text-gp-muted hover:text-gp-text hover:bg-gray-100'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isSaved ? 'Unsave' : 'Save'}
          >
            <span className="text-lg">{isSaved ? '🔖' : '📌'}</span>
            <span className="text-sm font-medium">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

                {/* Why This Matters Accordion */}
                {isWhyExpanded && (
                  <div className="mt-4 pt-4 border-t border-gp-border animate-fade-in-up">
            {isWhyLoading ? (
              <div className="py-4 text-center text-gp-muted text-sm">
                Generating insights...
              </div>
            ) : whyContent ? (
              <div className="space-y-4">
                {/* New structured UI format (panel with bullets and actions) */}
                {whyContent.ui && whyContent.ui.type === 'panel' ? (
                  <>
                    {/* Panel title */}
                    {whyContent.ui.title && (
                      <h4 className="text-gp-text font-semibold text-sm mb-3">{whyContent.ui.title}</h4>
                    )}
                    
                    {/* Panel bullets */}
                    {whyContent.ui.bullets && whyContent.ui.bullets.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {whyContent.ui.bullets.map((bullet, idx) => (
                          <li key={idx} className="text-gp-muted text-sm flex items-start gap-2">
                            <span className="text-gp-primary mt-0.5 flex-shrink-0">•</span>
                            <span className="leading-relaxed">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    {/* Panel actions */}
                    {whyContent.ui.actions && whyContent.ui.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {whyContent.ui.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (action.action === 'ask_followup' && action.payload?.itemId) {
                                // Navigate to chat with pre-filled message
                                const topic = action.payload.topic || item.title;
                                window.location.href = `/chat?message=${encodeURIComponent(`Tell me more about: ${topic}`)}`;
                              }
                            }}
                            className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark text-white text-sm font-medium rounded-lg transition-smooth"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Fallback text if provided */}
                    {whyContent.text && !whyContent.ui.bullets && (
                      <p className="text-gp-muted text-sm leading-relaxed">{whyContent.text}</p>
                    )}
                  </>
                ) : (
                  <>
                    {/* Legacy format: Summary */}
                    {whyContent.summary && (
                      <div>
                        <h4 className="text-gp-text font-semibold text-sm mb-2">Summary</h4>
                        <p className="text-gp-muted text-sm leading-relaxed">{whyContent.summary}</p>
                      </div>
                    )}

                    {/* Legacy format: Why This Matters */}
                    {whyContent.why && (
                      <div>
                        <h4 className="text-gp-text font-semibold text-sm mb-2">Why this matters</h4>
                        <p className="text-gp-muted text-sm leading-relaxed">{whyContent.why}</p>
                      </div>
                    )}

                    {/* Legacy format: Impact */}
                    {whyContent.impact && (
                      <div>
                        <h4 className="text-gp-text font-semibold text-sm mb-2">Impact</h4>
                        <p className="text-gp-muted text-sm leading-relaxed">{whyContent.impact}</p>
                      </div>
                    )}

                    {/* Legacy format support: bullets list */}
                    {!whyContent.why && whyContent.whyThisMatters && whyContent.whyThisMatters.length > 0 && (
                      <div>
                        <h4 className="text-gp-text font-semibold text-sm mb-2">Why this matters:</h4>
                        <ul className="space-y-1.5">
                          {whyContent.whyThisMatters.map((bullet, idx) => (
                            <li key={idx} className="text-gp-muted text-sm flex items-start gap-2">
                              <span className="text-gp-primary mt-0.5">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Legacy format: Actions: What Should I Do */}
                    {whyContent.actions && (
                      <div>
                        <h4 className="text-gp-text font-semibold text-sm mb-2">What you should do</h4>
                        <div className="space-y-2">
                          {whyContent.actions.now && (
                            <div className="flex items-start gap-2">
                              <span className="text-gp-primary font-medium text-xs min-w-[60px]">Now:</span>
                              <span className="text-gp-muted text-sm">{whyContent.actions.now}</span>
                            </div>
                          )}
                          {whyContent.actions.soon && (
                            <div className="flex items-start gap-2">
                              <span className="text-gp-primary font-medium text-xs min-w-[60px]">Soon:</span>
                              <span className="text-gp-muted text-sm">{whyContent.actions.soon}</span>
                            </div>
                          )}
                          {whyContent.actions.later && (
                            <div className="flex items-start gap-2">
                              <span className="text-gp-primary font-medium text-xs min-w-[60px]">Later:</span>
                              <span className="text-gp-muted text-sm">{whyContent.actions.later}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Legacy format support: whatShouldIDo */}
                    {!whyContent.actions && whyContent.whatShouldIDo && (
                      <div>
                        <h4 className="text-gp-text font-semibold text-sm mb-2">What should I do:</h4>
                        <div className="space-y-2">
                          {whyContent.whatShouldIDo.now && (
                            <div className="flex items-start gap-2">
                              <span className="text-gp-primary font-medium text-xs min-w-[60px]">Now:</span>
                              <span className="text-gp-muted text-sm">{whyContent.whatShouldIDo.now}</span>
                            </div>
                          )}
                          {whyContent.whatShouldIDo.soon && (
                            <div className="flex items-start gap-2">
                              <span className="text-gp-primary font-medium text-xs min-w-[60px]">Soon:</span>
                              <span className="text-gp-muted text-sm">{whyContent.whatShouldIDo.soon}</span>
                            </div>
                          )}
                          {whyContent.whatShouldIDo.later && (
                            <div className="flex items-start gap-2">
                              <span className="text-gp-primary font-medium text-xs min-w-[60px]">Later:</span>
                              <span className="text-gp-muted text-sm">{whyContent.whatShouldIDo.later}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>
        )}

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
