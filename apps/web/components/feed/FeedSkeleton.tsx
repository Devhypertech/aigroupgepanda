/**
 * Feed Skeleton Loading Component
 * Premium skeleton loader for feed cards
 */

'use client';

interface FeedSkeletonProps {
  count?: number;
  isMobile?: boolean;
}

export function FeedSkeleton({ count = 3, isMobile = false }: FeedSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-gp-surface rounded-xl border border-gray-200 overflow-hidden animate-pulse"
        >
          {/* Header skeleton */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-full bg-gray-300" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-24" />
              <div className="h-3 bg-gray-300 rounded w-16" />
            </div>
            <div className="w-6 h-6 bg-gray-300 rounded" />
          </div>

          {/* Body skeleton */}
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-300 rounded w-3/4" />
            <div className="h-4 bg-gray-300 rounded w-full" />
            <div className="h-4 bg-gray-300 rounded w-5/6" />
            <div className="h-6 bg-gray-300 rounded w-20" />
          </div>

          {/* Media skeleton */}
          <div className={`w-full ${isMobile ? 'h-48' : 'h-64'} bg-gray-300`} />

          {/* Actions skeleton */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="h-8 bg-gray-300 rounded w-16" />
                <div className="h-8 bg-gray-300 rounded w-20" />
                <div className="h-8 bg-gray-300 rounded w-16" />
              </div>
              <div className="h-8 w-8 bg-gray-300 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

