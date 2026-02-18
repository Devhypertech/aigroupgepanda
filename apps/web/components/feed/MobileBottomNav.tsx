/**
 * Mobile Bottom Navigation Component
 * Tabs: Home (Feed), Ask AI, Alerts
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MobileBottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/feed', label: 'Home', icon: '🏠' },
    { href: '/chat', label: 'Ask AI', icon: '💬' },
    { href: '/saved', label: 'Saved', icon: '🔖' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gp-surface border-t border-gray-200 backdrop-blur-sm z-50">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === '/chat' && pathname === '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg no-underline transition-colors ${
                isActive
                  ? 'text-gp-primary'
                  : 'text-gp-muted'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
