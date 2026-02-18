/**
 * Left Sidebar Component
 * Profile card, nav links, saved items list
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { getGuestUserId, isGuestUser } from '../../lib/guestAuth';
import { getPublicConfig } from '../../lib/config';

interface LeftSidebarProps {
  session?: any;
}

export function LeftSidebar({ session }: LeftSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessionData } = useSession();
  const currentSession = session || sessionData;
  
  // Get user info (real or guest)
  const realUserId = (currentSession?.user as any)?.id;
  const guestUserId = getGuestUserId();
  const userId = realUserId || guestUserId;
  const isGuest = isGuestUser(userId);
  
  const userName = currentSession?.user?.name || (isGuest ? 'Guest User' : 'User');
  const userEmail = currentSession?.user?.email || (isGuest ? 'guest@gepanda.ai' : undefined);

  const handleLogout = async () => {
    try {
      // If user is logged in with NextAuth, sign out
      if (currentSession && !isGuest) {
        await signOut({ callbackUrl: '/login', redirect: true });
      } else {
        // If guest user, clear guest cookie and redirect
        // Clear guest cookie by setting it to expire
        document.cookie = 'gp_guest_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; sameSite=lax';
        router.push('/login');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: clear guest cookie and redirect anyway
      document.cookie = 'gp_guest_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; sameSite=lax';
      router.push('/login');
    }
  };

  const navLinks = [
    { href: '/feed', label: 'Home', icon: '🏠' },
    { href: '/chat', label: 'Ask AI', icon: '💬' },
    { href: '/saved', label: 'Saved', icon: '🔖' },
    { href: '/alerts', label: 'Alerts', icon: '🔔' },
  ];

  // Fetch saved items
  const [savedItems, setSavedItems] = useState<Array<{ id: string; type: string; title: string }>>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  useEffect(() => {
    const fetchSavedItems = async () => {
      if (!userId) return;
      
      setIsLoadingSaved(true);
      try {
        const config = getPublicConfig();
        const API_URL = config.apiUrl;
        
        const response = await fetch(`${API_URL}/api/feed/saved?limit=5`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const items = (data.items || []).slice(0, 5).map((item: any) => ({
            id: item.id,
            type: item.type || 'article',
            title: item.title || 'Untitled',
          }));
          setSavedItems(items);
        }
      } catch (error) {
        console.error('Error loading saved items:', error);
      } finally {
        setIsLoadingSaved(false);
      }
    };

    fetchSavedItems();
  }, [userId]);

  return (
    <div className="h-full bg-gp-surface border-r border-gray-200 p-4 rounded-xl">
      {/* Profile Card */}
      <div className="mb-6">
        <div className="bg-gp-bg rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gp-primary/20 flex items-center justify-center text-xl">
              {currentSession?.user?.image ? (
                <img
                  src={currentSession.user.image}
                  alt={userName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>👤</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gp-text font-semibold text-sm truncate">
                {userName}
              </p>
              {userEmail && (
                <p className="text-gp-muted text-xs truncate">{userEmail}</p>
              )}
              {isGuest && (
                <p className="text-gp-primary text-xs mt-1">Guest Mode</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/profile"
              className="flex-1 text-center py-2 px-4 bg-gp-primary/10 hover:bg-gp-primary/20 border border-gp-primary/30 rounded-lg text-gp-primary text-sm font-medium transition-colors"
            >
              View Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 py-2 px-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="mb-6">
        <ul className="space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href === '/chat' && pathname === '/');
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gp-primary/10 text-gp-primary font-semibold'
                      : 'text-gp-text hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-sm">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Saved Items */}
      <div>
        <h3 className="text-gp-text font-semibold text-sm mb-3">Saved Items</h3>
        {isLoadingSaved ? (
          <div className="text-gp-muted text-xs px-3 py-2">Loading...</div>
        ) : (
          <ul className="space-y-2">
            {savedItems.length > 0 ? (
              savedItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/saved#${item.id}`}
                    className="block px-3 py-2 bg-gp-bg rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-gp-text text-xs font-medium truncate">{item.title}</p>
                    <p className="text-gp-muted text-xs capitalize">{item.type}</p>
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-gp-muted text-xs px-3 py-2">No saved items yet</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
