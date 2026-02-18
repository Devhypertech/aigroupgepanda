/**
 * Feed Layout Component
 * 3-column layout: Left Sidebar | Center Feed | Right Sidebar
 * Desktop: max-w-7xl container, grid layout
 * Mobile: Stacked layout with top nav
 */

'use client';

import { ReactNode } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';

interface FeedLayoutProps {
  children: ReactNode;
  isMobile: boolean;
  session?: any;
}

export function FeedLayout({ children, isMobile, session }: FeedLayoutProps) {
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gp-bg">
        <div className="flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  // Desktop: 3-column layout with left sidebar, center feed, right sidebar
  return (
    <div className="min-h-screen bg-gp-bg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-6 py-6">
          {/* Left Sidebar - Profile, saved items, nav (280px) */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0">
            <div className="sticky top-6">
              <LeftSidebar session={session} />
            </div>
          </aside>

          {/* Center Column - Single column feed (600-700px) */}
          <main className="flex-1 max-w-[650px] mx-auto lg:mx-0">
            {children}
          </main>

          {/* Right Sidebar - Sticky notifications/promo (320px) */}
          <aside className="hidden lg:block w-[320px] flex-shrink-0">
            <div className="sticky top-6">
              <RightSidebar session={session} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
