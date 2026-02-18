/**
 * Mobile Top Bar Component
 * Top app bar with brand "GePanda" for mobile
 */

'use client';

import Link from 'next/link';

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-50 bg-gp-surface border-b border-gray-200 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/feed" className="text-gp-text font-bold text-lg no-underline">
          GePanda
        </Link>
        <div className="flex items-center gap-3">
          <button className="p-2 text-gp-muted hover:text-gp-text hover:bg-gray-100 rounded-lg transition-colors text-xl">
            🔔
          </button>
          <button className="p-2 text-gp-muted hover:text-gp-text hover:bg-gray-100 rounded-lg transition-colors text-xl">
            ⚙️
          </button>
        </div>
      </div>
    </header>
  );
}
