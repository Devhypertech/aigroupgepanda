'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { FeedItem, FeedItemCategory } from '@gepanda/shared';
import { getPublicConfig } from '../../../lib/config';
import { FeedLayout } from '../../../components/feed/FeedLayout';
import { PostCard } from '../../../components/feed/PostCard';
import { FeedComposer } from '../../../components/feed/FeedComposer';
import { CategoryTabs, type TabId as CategoryTabId } from '../../../components/feed/CategoryTabs';
import { FeedSkeleton } from '../../../components/feed/FeedSkeleton';
import { MobileTopBar } from '../../../components/feed/MobileTopBar';
import { MobileBottomNav } from '../../../components/feed/MobileBottomNav';
import { useToast } from '../../../components/ui/Toast';
import { getGuestUserId } from '../../../lib/guestAuth';


const TAB_CATEGORY_MAP: Record<CategoryTabId, FeedItemCategory | null> = {
  'for-you': null,
  'deals': 'deals',
  'guides': 'travel',
  'reels': 'entertainment',
  'ai-news': 'tech',
};

export default function FeedPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryTabId>('for-you');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const observerTarget = useRef<HTMLElement>(null);
  const { showToast, ToastComponent } = useToast();

  // Get selected category from active tab
  const selectedCategory = TAB_CATEGORY_MAP[activeTab];

  // Check if user needs onboarding (works for both real and guest users)
  useEffect(() => {
    const checkOnboarding = async () => {
      if (hasCheckedOnboarding) return;
      
      // Get user ID from session or guest cookie
      const realUserId = (session?.user as any)?.id;
      const guestUserId = getGuestUserId();
      const userId = realUserId || guestUserId;
      
      // Skip if no user at all (shouldn't happen with guest auth, but safety check)
      if (!userId) {
        setHasCheckedOnboarding(true);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/users/me/interests`, {
          headers: {
            'Content-Type': 'application/json',
            ...(userId ? { 'X-User-Id': userId } : {}), // Send userId header for auth
          },
          credentials: 'include', // Include cookies for guest auth
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[Feed] User interests check:', { 
            userId, 
            interestCount: data.interestIds?.length || 0 
          });
          
          // If user has no interests, redirect to onboarding
          if (!data.interestIds || data.interestIds.length === 0) {
            console.log('[Feed] No interests found, redirecting to onboarding');
            router.replace('/onboarding/interests');
            return;
          }
          
          console.log('[Feed] User has interests, showing feed');
        } else {
          console.warn('[Feed] Failed to check interests:', response.status);
          // Continue to feed even if check fails (don't block user)
        }
      } catch (error) {
        // Error handled gracefully
        // Continue to feed even if check fails
      } finally {
        setHasCheckedOnboarding(true);
      }
    };

    // Check onboarding for both authenticated and unauthenticated (guest) users
    if (status === 'authenticated' || status === 'unauthenticated') {
      checkOnboarding();
    }
  }, [status, session, API_URL, router, hasCheckedOnboarding]);

  // Redirect to login if not authenticated (skip in development with dev bypass)
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    if (status === 'unauthenticated' && !isDev) {
      router.push('/login?next=/feed');
    }
  }, [status, router]);

  // Detect mobile - initialize immediately to prevent layout shift
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 1024);
      }
    };
    checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Fetch feed items
  const fetchFeed = useCallback(async (cursor?: string | null, append: boolean = false) => {
    // Get user ID from session or guest cookie
    const realUserId = (session?.user as any)?.id;
    const guestUserId = getGuestUserId();
    const userId = realUserId || guestUserId;
    
    // Always allow (guest or real user)

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      // Use activeTab directly for category (for-you, deals, guides, reels, ai-news)
      if (activeTab && activeTab !== 'for-you') {
        params.set('category', activeTab);
      }
      if (cursor) {
        params.set('cursor', cursor);
      }
      params.set('limit', '20');

      // API will get user from cookie/session automatically
      const feedUrl = `${API_URL}/api/feed?${params.toString()}`;
      console.log('[FEED] fetch url', feedUrl);

      const response = await fetch(feedUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for guest auth
      });

      console.log('[FEED] response status', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[FEED] Error response:', errorText);
        throw new Error(`Failed to load feed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[FEED] response', response.status, data.items?.length || 0, 'items');
      
      if (append) {
        setFeedItems((prev) => [...prev, ...data.items]);
      } else {
        setFeedItems(data.items || []);
      }
      
      setNextCursor(data.nextCursor || null);
      setHasMore(data.nextCursor !== null && data.nextCursor !== undefined);
    } catch (error) {
      console.error('[FEED] Error fetching feed:', error);
      // Error handled by toast notification
      if (!append) {
        setFeedItems([]);
      }
      const errorMessage = error instanceof Error 
        ? `Failed to load feed: ${error.message}` 
        : 'Failed to load feed. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [session, activeTab, API_URL]);

  // Initial load and category change
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    const userId = (session?.user as any)?.id;
    
    if (!isDev && (status !== 'authenticated' || !userId)) return;
    if (!hasCheckedOnboarding) return; // Wait for onboarding check
    
    setFeedItems([]);
    setNextCursor(null);
    setHasMore(true);
    fetchFeed(null, false);
  }, [status, session, activeTab, fetchFeed, hasCheckedOnboarding]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as CategoryTabId);
    setFeedItems([]);
    setNextCursor(null);
    setHasMore(true);
  };


  // Infinite scroll observer (using IntersectionObserver instead of InfiniteLoader)
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchFeed(nextCursor, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, nextCursor, fetchFeed]);

  // Handle deal click
  const handleDealClick = useCallback((affiliateUrl: string) => {
    window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
  }, []);

  // Handle not interested
  const handleNotInterested = useCallback((itemId: string) => {
    setFeedItems((prev) => prev.filter(item => item.id !== itemId));
  }, []);

  // Handle seed demo feed
  const handleSeedFeed = async () => {
    try {
      const seedUrl = `${API_URL}/api/feed/dev/seed`;
      // Seeding feed
      
      const response = await fetch(seedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      // Handle 404 specifically
      if (response.status === 404) {
        showToast(
          'Seed endpoint not found. Make sure the API server is running and the endpoint is available in development mode.',
          'error'
        );
        return;
      }

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(
          `Invalid JSON response (Status: ${response.status} ${response.statusText})\n` +
          `Response: ${responseText.substring(0, 200)}`
        );
      }

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Unknown error';
        throw new Error(
          `Seed failed: ${response.status} ${response.statusText}\n` +
          `Error: ${errorMsg}`
        );
      }

      // Show success message - new endpoint returns { ok: true, inserted }
      const inserted = data.inserted || 0;
      showToast(
        `Feed seeded! ${inserted} items inserted.`,
        'success'
      );
      
      // Refetch the feed after seeding
      setFeedItems([]);
      setNextCursor(null);
      setHasMore(true);
      await fetchFeed(null, false);
    } catch (error) {
      // Error handled by toast notification
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to seed feed. Make sure you are in development mode.';
      showToast(errorMessage, 'error');
    }
  };

  // In development, allow rendering even without session
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && (status === 'loading' || status === 'unauthenticated')) {
    return (
      <div className="min-h-screen bg-gp-bg flex items-center justify-center">
        <div className="text-gp-text">Loading...</div>
      </div>
    );
  }

  // Show loading while checking onboarding
  if (!hasCheckedOnboarding && !isDev) {
    return (
      <div className="min-h-screen bg-gp-bg flex items-center justify-center">
        <div className="text-gp-text">Loading...</div>
      </div>
    );
  }


  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gp-bg pb-20">
        <MobileTopBar />
        
        {/* AI Preset Entry Buttons */}
        <AIPresetButtons isMobile={true} />
        
        {/* Category Tabs */}
        <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} isMobile={true} />
        
        <main className="w-full px-4" style={{ height: 'calc(100vh - 200px)' }}>
          {isLoading ? (
            <div className="p-4">
              <FeedSkeleton count={3} isMobile={true} />
            </div>
          ) : feedItems.length === 0 ? (
            <div className="p-4">
              <EmptyState isMobile={true} onSeedFeed={handleSeedFeed} />
            </div>
          ) : (
            <ul className="space-y-4 list-none p-0 m-0">
              {feedItems.map((item) => (
                <li key={item.id} className="list-none">
                  <PostCard
                    item={item}
                    onDealClick={handleDealClick}
                    onNotInterested={handleNotInterested}
                  />
                </li>
              ))}
              {hasMore && (
                <li ref={observerTarget as any} className="h-20 flex items-center justify-center mt-4 list-none">
                  {isLoadingMore && (
                    <FeedSkeleton count={1} isMobile={true} />
                  )}
                </li>
              )}
            </ul>
          )}
        </main>

        <MobileBottomNav />
        {ToastComponent}
      </div>
    );
  }

  // Desktop layout
  return (
    <FeedLayout isMobile={false} session={session}>
      {/* AI Preset Entry Buttons */}
      <AIPresetButtons />

      {/* Category Tabs */}
      <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} isMobile={false} />

      {/* Feed Composer */}
      <FeedComposer />

      {/* Feed Content - Single Column with Infinite Scroll */}
      {isLoading ? (
        <div className="max-w-2xl mx-auto px-4">
          <FeedSkeleton count={3} isMobile={false} />
        </div>
      ) : feedItems.length === 0 ? (
        <div className="max-w-2xl mx-auto px-4">
          <EmptyState isMobile={false} onSeedFeed={handleSeedFeed} />
        </div>
      ) : (
        <ul className="space-y-4 list-none p-0 m-0">
          {feedItems.map((item) => (
            <li key={item.id} className="list-none">
              <PostCard
                item={item}
                onDealClick={handleDealClick}
                onNotInterested={handleNotInterested}
              />
            </li>
          ))}
          {hasMore && (
            <li ref={observerTarget as any} className="h-20 flex items-center justify-center mt-6 list-none">
              {isLoadingMore && (
                <FeedSkeleton count={1} isMobile={false} />
              )}
            </li>
          )}
        </ul>
      )}

      {ToastComponent}
    </FeedLayout>
  );
}

// AI Preset Entry Buttons Component
function AIPresetButtons({ isMobile = false }: { isMobile?: boolean }) {
  const router = useRouter();

  const handlePresetClick = (message: string) => {
    // Navigate to chat with preset message
    router.push(`/chat?message=${encodeURIComponent(message)}`);
  };

  const presets = [
    {
      id: 'shop',
      label: 'Shop with AI',
      message: 'I want to shop with AI',
      icon: '🛍️',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'esim',
      label: 'Buy eSIM',
      message: 'I want to buy an eSIM',
      icon: '📱',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      id: 'trip',
      label: 'Plan Trip',
      message: 'Plan my trip',
      icon: '✈️',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'track',
      label: 'Track Order',
      message: 'Track my order',
      icon: '📦',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ];

  return (
    <div className={`w-full ${isMobile ? 'px-4 py-3' : 'max-w-2xl mx-auto px-4 py-6'}`}>
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-3`}>
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.message)}
            className={`
              ${preset.color}
              text-white
              font-semibold
              rounded-xl
              px-4 py-3
              transition-all
              transform
              hover:scale-105
              active:scale-95
              shadow-lg
              hover:shadow-xl
              flex flex-col items-center justify-center gap-2
              ${isMobile ? 'text-sm' : 'text-base'}
            `}
          >
            <span className="text-2xl">{preset.icon}</span>
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Empty state
function EmptyState({ 
  isMobile, 
  onSeedFeed 
}: { 
  isMobile: boolean;
  onSeedFeed?: () => void;
}) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl mb-4">📭</div>
      <h2 className="text-gp-text font-semibold text-xl mb-2">
        No feed items yet
      </h2>
      <p className="text-gp-muted text-sm mb-6 max-w-md">
        {isDev 
          ? 'Seed demo feed items to get started with development.'
          : 'Check back soon for new content!'}
      </p>
      {isDev && onSeedFeed && (
        <button
          onClick={onSeedFeed}
          className="px-6 py-3 bg-gp-primary/10 hover:bg-gp-primary/20 border border-gp-primary/30 text-gp-primary font-semibold rounded-lg transition-colors"
        >
          🌱 Seed Demo Feed
        </button>
      )}
    </div>
  );
}
