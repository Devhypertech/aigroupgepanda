/**
 * Right Sidebar Component
 * Recent notifications list + advertisement card
 */

'use client';

import { NotificationsList } from './NotificationsList';
import { AdCard } from './AdCard';

interface RightSidebarProps {
  session?: any;
}

export function RightSidebar({ session }: RightSidebarProps) {
  return (
    <div className="h-full bg-gp-surface border-l border-gray-200 p-4 space-y-6 rounded-xl">
      {/* Notifications */}
      <NotificationsList />

      {/* Advertisement Card */}
      <AdCard />
    </div>
  );
}
