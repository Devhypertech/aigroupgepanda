'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { FeedItem } from '@gepanda/shared';
import { getPublicConfig } from '../../../lib/config';
import { getGuestUserId, isGuestUser } from '../../../lib/guestAuth';
import { FeedLayout } from '../../../components/feed/FeedLayout';
import { FeedCardV2 } from '../../../components/feed/FeedCardV2';
import { FeedSkeleton } from '../../../components/feed/FeedSkeleton';
import { MobileTopBar } from '../../../components/feed/MobileTopBar';
import { MobileBottomNav } from '../../../components/feed/MobileBottomNav';

export default function SavedPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;

  const [savedItems, setSavedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Get user ID (real or guest)
  const realUserId = (session?.user as any)?.id;
  const guestUserId = getGuestUserId();
  const currentUserId = realUserId || guestUserId;
  const isCurrentUserGuest = isGuestUser(currentUserId);

  // Detect mobile
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

  // Fetch saved items
  const fetchSaved = useCallback(async (cursor?: string | null, append: boolean = false) => {
    if (!currentUserId) {
      const isDev = process.env.NODE_ENV === 'development';
      if (!isDev) {
        setIsLoading(false);
        return;
      }
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (cursor) {
        params.set('cursor', cursor);
      }
      params.set('limit', '20');

      const savedUrl = `${API_URL}/api/feed/saved?${params.toString()}`;

      const response = await fetch(savedUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...(currentUserId && { 'X-User-Id': currentUserId }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to load saved items: ${response.status}`);
      }

      const data = await response.json();
      
      if (append) {
        setSavedItems((prev) => [...prev, ...data.items]);
      } else {
        setSavedItems(data.items || []);
      }
      
      setNextCursor(data.nextCursor || null);
      setHasMore(data.nextCursor !== null && data.nextCursor !== undefined);
    } catch (error) {
      console.error('Error loading saved items:', error);
      if (!append) {
        setSavedItems([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [currentUserId, API_URL]);

  // Initial load
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev && !currentUserId) {
      router.push('/login?next=/saved');
      return;
    }
    
    fetchSaved(null, false);
  }, [currentUserId, fetchSaved, router]);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchSaved(nextCursor, true);
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
  }, [hasMore, isLoadingMore, isLoading, nextCursor, fetchSaved]);

  // Handle deal click
  const handleDealClick = useCallback((affiliateUrl: string) => {
    window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
  }, []);

  // Handle unsave (remove from saved list)
  const handleUnsave = useCallback(async (itemId: string) => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`${API_URL}/api/saved/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        // Remove from local state
        setSavedItems((prev) => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error unsaving item:', error);
    }
  }, [currentUserId, API_URL]);

  // Handle not interested (remove from saved)
  const handleNotInterested = useCallback((itemId: string) => {
    handleUnsave(itemId);
  }, [handleUnsave]);

  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev && !currentUserId && (status === 'loading' || status === 'unauthenticated')) {
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
        
        <main className="p-4 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gp-text mb-6">Saved Items</h1>
          
          {isLoading ? (
            <FeedSkeleton count={3} isMobile={true} />
          ) : savedItems.length === 0 ? (
            <EmptyState isMobile={true} />
          ) : (
            <>
              <div className="space-y-4">
                {savedItems.map((item) => (
                  <FeedCardV2
                    key={item.id}
                    item={item}
                    isMobile={true}
                    onDealClick={handleDealClick}
                    onNotInterested={handleNotInterested}
                  />
                ))}
              </div>
              
              {hasMore && (
                <div ref={observerTarget} className="h-20 flex items-center justify-center mt-4">
                  {isLoadingMore && (
                    <FeedSkeleton count={1} isMobile={true} />
                  )}
                </div>
              )}
            </>
          )}
        </main>

        <MobileBottomNav />
      </div>
    );
  }

  // Desktop layout
  return (
    <FeedLayout isMobile={false} session={session}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gp-text mb-2">Saved Items</h1>
        <p className="text-gp-muted text-sm">
          {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      {isLoading ? (
        <FeedSkeleton count={3} isMobile={false} />
      ) : savedItems.length === 0 ? (
        <EmptyState isMobile={false} />
      ) : (
        <>
          <div className="space-y-6">
            {savedItems.map((item) => (
              <FeedCardV2
                key={item.id}
                item={item}
                isMobile={false}
                onDealClick={handleDealClick}
                onNotInterested={handleNotInterested}
              />
            ))}
          </div>
          
          {hasMore && (
            <div ref={observerTarget} className="h-20 flex items-center justify-center mt-6">
              {isLoadingMore && (
                <FeedSkeleton count={1} isMobile={false} />
              )}
            </div>
          )}
        </>
      )}
    </FeedLayout>
  );
}

// Empty state
function EmptyState({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl mb-4">🔖</div>
      <h2 className="text-gp-text font-semibold text-xl mb-2">
        No saved items yet
      </h2>
      <p className="text-gp-muted text-sm mb-6 max-w-md">
        Save items you like to view them later
      </p>
    </div>
  );
}
