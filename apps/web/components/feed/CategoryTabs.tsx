/**
 * Category Tabs Component
 * Top navigation tabs for filtering feed by category
 */

'use client';

interface CategoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobile?: boolean;
}

export type TabId = 'for-you' | 'deals' | 'guides' | 'reels' | 'ai-news';

const TABS = [
  { id: 'for-you', label: 'For You', category: null },
  { id: 'deals', label: 'Deals', category: 'deals' },
  { id: 'guides', label: 'Guides', category: 'travel' },
  { id: 'reels', label: 'Reels', category: 'entertainment' },
  { id: 'ai-news', label: 'AI News', category: 'tech' },
];

export function CategoryTabs({ activeTab, onTabChange, isMobile = false }: CategoryTabsProps) {
  return (
    <div className={`sticky top-0 z-40 bg-gp-bg border-b border-gray-200 ${isMobile ? 'px-4' : ''}`}>
      <div className={`flex gap-1 overflow-x-auto ${isMobile ? 'py-2' : 'py-3'} ${!isMobile ? 'max-w-7xl mx-auto px-4' : ''}`}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gp-primary text-black'
                  : 'bg-gp-surface text-gp-text hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

