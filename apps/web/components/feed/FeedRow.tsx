/**
 * FeedRow Component
 * Row component for react-window virtualized list
 */

'use client';

import { useEffect, useRef } from 'react';
import type { FeedItem } from '@gepanda/shared';
import { PostCard } from './PostCard';
import { FeedSkeleton } from './FeedSkeleton';

interface FeedRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: FeedItem[];
    isMobile: boolean;
    onDealClick?: (affiliateUrl: string) => void;
    onNotInterested?: (itemId: string) => void;
    setItemSize: (index: number, size: number) => void;
  };
}

export function FeedRow({ index, style, data }: FeedRowProps) {
  const { items, isMobile, onDealClick, onNotInterested, setItemSize } = data;
  const item = items[index];
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rowRef.current) {
      const height = rowRef.current.getBoundingClientRect().height;
      setItemSize(index, height);
    }
  }, [index, setItemSize]);

  if (!item) {
    return (
      <div style={style} className="px-4">
        <FeedSkeleton count={1} isMobile={isMobile} />
      </div>
    );
  }

  return (
    <div style={style} ref={rowRef} className="px-4 pb-4">
      <PostCard
        item={item}
        onDealClick={onDealClick}
        onNotInterested={onNotInterested}
      />
    </div>
  );
}

