'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getPublicConfig } from '../../../lib/config';
import { useToast } from '../../../components/ui/Toast';
import { getGuestUserId } from '../../../lib/guestAuth';

const ONBOARDING_INTERESTS_PATH = '/onboarding/interests';

interface Interest {
  id: string;
  slug: string;
  label: string;
  group: string;
}

export default function InterestsOnboardingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;
  const { showToast, ToastComponent } = useToast();

  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [groupedInterests, setGroupedInterests] = useState<Record<string, Interest[]>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const realUserId = (session?.user as any)?.id;
  const guestUserId = getGuestUserId();
  const userId = realUserId || guestUserId;

  const catalogFetchedRef = useRef(false);
  const userInterestsFetchedRef = useRef<string | null>(null);

  const isOnOnboardingPage = pathname === ONBOARDING_INTERESTS_PATH;

  // Fetch catalog only on /onboarding/interests and only once per mount
  useEffect(() => {
    if (!isOnOnboardingPage || catalogFetchedRef.current) return;
    catalogFetchedRef.current = true;

    const fetchInterests = async () => {
      try {
        const response = await fetch(`${API_URL}/api/interests`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to load interests: ${response.status} ${response.statusText}\n` +
            `Response: ${errorText.substring(0, 200)}`
          );
        }

        const data = await response.json();
        console.log('[Onboarding] Fetched interests:', {
          allCount: data.all?.length || 0,
          groupsCount: Object.keys(data.interests || {}).length,
        });
        setAllInterests(data.all || []);
        setGroupedInterests(data.interests || {});

        if (!data.all || data.all.length === 0) {
          showToast('No interests available. Please contact support.', 'error');
        }
      } catch (error) {
        console.error('[Onboarding] Error loading interests:', error);
        showToast('Failed to load interests. Please refresh the page.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterests();
  }, [API_URL, isOnOnboardingPage, showToast]);

  // Fetch user's current selections only on /onboarding/interests and once per userId
  useEffect(() => {
    if (!isOnOnboardingPage || !userId || userInterestsFetchedRef.current === userId) return;
    userInterestsFetchedRef.current = userId;

    const fetchUserInterests = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/me/interests`, {
          headers: {
            'Content-Type': 'application/json',
            ...(userId ? { 'X-User-Id': userId } : {}),
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.interestIds && data.interestIds.length > 0) {
            setSelectedIds(new Set(data.interestIds));
          }
        }
      } catch (error) {
        console.error('[Onboarding] Error loading user interests:', error);
      }
    };

    fetchUserInterests();
  }, [isOnOnboardingPage, userId, API_URL]);

  // Filter interests by search query
  const filteredInterests = useMemo(() => {
    if (!searchQuery.trim()) {
      return allInterests;
    }
    const query = searchQuery.toLowerCase();
    return allInterests.filter(
      interest =>
        interest.label.toLowerCase().includes(query) ||
        interest.slug.toLowerCase().includes(query) ||
        interest.group.toLowerCase().includes(query)
    );
  }, [allInterests, searchQuery]);

  // Group filtered interests
  const filteredGrouped = useMemo(() => {
    const grouped: Record<string, Interest[]> = {};
    filteredInterests.forEach(interest => {
      if (!grouped[interest.group]) {
        grouped[interest.group] = [];
      }
      grouped[interest.group].push(interest);
    });
    return grouped;
  }, [filteredInterests]);

  const handleToggleInterest = (interestId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(interestId)) {
        next.delete(interestId);
      } else {
        next.add(interestId);
      }
      return next;
    });
  };

  const handleSaveInterests = async () => {
    if (selectedIds.size < 5) {
      showToast('Please select at least 5 interests to continue.', 'error');
      return;
    }

    if (!userId) {
      showToast('Please wait while we set up your account...', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/users/me/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {}), // Send userId header for auth
        },
        credentials: 'include', // Include cookies for guest auth
        body: JSON.stringify({
          interestIds: Array.from(selectedIds),
        }),
      });

      const responseText = await response.text();
      console.log('[Onboarding] Response status:', response.status);
      console.log('[Onboarding] Response text:', responseText.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[Onboarding] Failed to parse response:', parseError);
        throw new Error(`Invalid response from ${API_URL}/api/users/me/interests: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error('[Onboarding] API error:', data);
        throw new Error(data.error || data.message || `Failed to save interests: ${response.status} ${response.statusText}`);
      }

      console.log('[Onboarding] Interests saved successfully:', data);
      
      // Verify the response indicates success
      if (data.success !== false && (data.success === true || data.interestIds)) {
        showToast('Interests saved! Personalizing your feed...', 'success');
        
        // Use replace instead of push to avoid back button issues
        // Small delay to ensure API has processed the request and cookie is set
        setTimeout(() => {
          console.log('[Onboarding] Redirecting to /feed');
          router.replace('/feed');
        }, 500);
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Error saving interests:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to save interests',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gp-bg flex items-center justify-center">
        <div className="text-gp-text">Loading interests...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gp-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gp-primary/20 mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h1 className="text-3xl font-bold text-gp-text mb-2">
            What interests you?
          </h1>
          <p className="text-gp-muted text-base">
            Select at least 5 interests to personalize your feed
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gp-surface border border-gray-200 rounded-xl text-gp-text placeholder-gp-muted focus:outline-none focus:ring-2 focus:ring-gp-primary focus:border-transparent"
          />
        </div>

        {/* Selected Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gp-text font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? 'interest' : 'interests'} selected
          </p>
          {selectedIds.size < 5 && (
            <p className="text-gp-primary text-sm">
              Select {5 - selectedIds.size} more
            </p>
          )}
        </div>

        {/* Interest Cards Grid - Pinterest Style */}
        {Object.keys(filteredGrouped).length > 0 ? (
          <div className="space-y-8 mb-8">
            {Object.entries(filteredGrouped).map(([group, interests]) => (
              <div key={group}>
                <h3 className="text-gp-text font-semibold text-lg mb-4 capitalize">
                  {group.replace(/-/g, ' ')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {interests.map((interest) => {
                    const isSelected = selectedIds.has(interest.id);
                    // Map interest slugs to emoji icons
                    const iconMap: Record<string, string> = {
                      'japan': '🗾',
                      'europe': '🇪🇺',
                      'budget-travel': '💰',
                      'luxury': '💎',
                      'food': '🍜',
                      'nature': '🌲',
                      'ai-news': '🤖',
                      'startup': '🚀',
                      'investing': '📈',
                      'deals': '🎁',
                      'safety': '🛡️',
                      'weather': '🌤️',
                      'traveling': '✈️',
                      'adventures': '🏔️',
                      'beaches': '🏖️',
                      'hiking': '🥾',
                      'solo': '🧳',
                      'family': '👨‍👩‍👧‍👦',
                      'reels': '🎬',
                      'news': '📰',
                    };
                    const icon = iconMap[interest.slug] || '📍';
                    
                    return (
                      <button
                        key={interest.id}
                        onClick={() => handleToggleInterest(interest.id)}
                        className={`relative p-4 rounded-xl text-center transition-all transform hover:scale-105 ${
                          isSelected
                            ? 'bg-gp-primary text-black shadow-lg ring-2 ring-gp-primary ring-offset-2'
                            : 'bg-gp-surface text-gp-text border-2 border-gray-200 hover:border-gp-primary/50 hover:bg-gp-primary/5'
                        }`}
                      >
                        {/* Icon */}
                        <div className="text-3xl mb-2">{icon}</div>
                        {/* Label */}
                        <div className="text-xs font-medium leading-tight">
                          {interest.label}
                        </div>
                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gp-muted mb-4">
              {allInterests.length === 0 
                ? 'No interests available. Please refresh the page or contact support.'
                : `No interests found matching "${searchQuery}"`}
            </p>
            {allInterests.length === 0 && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gp-primary text-white rounded-lg hover:bg-gp-primary-dark"
              >
                Refresh Page
              </button>
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="sticky bottom-0 bg-gp-bg border-t border-gray-200 pt-4 pb-4 -mx-4 px-4">
          <button
            onClick={handleSaveInterests}
            disabled={selectedIds.size < 5 || isSaving}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-base transition-all ${
              selectedIds.size >= 5 && !isSaving
                ? 'bg-gp-primary hover:bg-gp-primary-dark text-black shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : selectedIds.size >= 5 ? 'Continue to Feed' : `Select ${5 - selectedIds.size} more`}
          </button>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}
