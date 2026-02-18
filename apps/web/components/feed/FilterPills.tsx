/**
 * Filter Pills Component
 * Category filter pills for feed
 */

'use client';

import type { FeedItemCategory } from '@gepanda/shared';

interface FilterPillsProps {
  categories: FeedItemCategory[];
  selectedCategory: FeedItemCategory | null;
  onCategoryChange: (category: FeedItemCategory | null) => void;
  isMobile: boolean;
}

export function FilterPills({
  categories,
  selectedCategory,
  onCategoryChange,
  isMobile,
}: FilterPillsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: isMobile ? '0.5rem' : '0.75rem',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    }}
    onScroll={(e) => {
      // Hide scrollbar
      (e.currentTarget as HTMLElement).style.scrollbarWidth = 'none';
    }}
    >
      <style>{`
        .filter-pills::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* All category */}
      <button
        onClick={() => onCategoryChange(null)}
        style={{
          padding: isMobile ? '0.5rem 1rem' : '0.625rem 1.25rem',
          borderRadius: '2rem',
          border: selectedCategory === null
            ? '2px solid var(--gp-primary)'
            : '1px solid rgba(255, 255, 255, 0.2)',
          background: selectedCategory === null
            ? 'rgba(18, 195, 165, 0.1)'
            : 'transparent',
          color: selectedCategory === null
            ? 'var(--gp-primary)'
            : 'var(--gp-text)',
          fontWeight: selectedCategory === null ? '600' : '400',
          fontSize: isMobile ? '0.8125rem' : '0.875rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (selectedCategory !== null) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedCategory !== null) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        All
      </button>
      {/* Category pills */}
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          style={{
            padding: isMobile ? '0.5rem 1rem' : '0.625rem 1.25rem',
            borderRadius: '2rem',
            border: selectedCategory === category
              ? '2px solid var(--gp-primary)'
              : '1px solid rgba(255, 255, 255, 0.2)',
            background: selectedCategory === category
              ? 'rgba(18, 195, 165, 0.1)'
              : 'transparent',
            color: selectedCategory === category
              ? 'var(--gp-primary)'
              : 'var(--gp-text)',
            fontWeight: selectedCategory === category ? '600' : '400',
            fontSize: isMobile ? '0.8125rem' : '0.875rem',
            cursor: 'pointer',
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (selectedCategory !== category) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedCategory !== category) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

