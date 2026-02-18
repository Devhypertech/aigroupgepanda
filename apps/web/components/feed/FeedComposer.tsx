/**
 * Feed Composer Component
 * Optional feed composer for creating posts
 */

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface FeedComposerProps {
  onPost?: () => void;
}

export function FeedComposer({ onPost }: FeedComposerProps) {
  const { data: session } = useSession();
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      // TODO: Implement post creation
      console.log('Post:', text);
      setText('');
      setIsExpanded(false);
      onPost?.();
    }
  };

  return (
    <div className="bg-gp-surface rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gp-primary/20 flex items-center justify-center flex-shrink-0">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder="What's on your mind?"
              className="w-full bg-gp-bg border border-gray-200 rounded-lg px-4 py-3 text-gp-text text-sm placeholder-gp-muted resize-none focus:outline-none focus:border-gp-primary/50 transition-colors"
              rows={isExpanded ? 4 : 2}
            />
            {isExpanded && (
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 text-gp-muted hover:text-gp-text hover:bg-gray-100 rounded-lg transition-colors"
                    title="Add image"
                  >
                    📷
                  </button>
                  <button
                    type="button"
                    className="p-2 text-gp-muted hover:text-gp-text hover:bg-gray-100 rounded-lg transition-colors"
                    title="Add location"
                  >
                    📍
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setText('');
                      setIsExpanded(false);
                    }}
                    className="px-4 py-2 text-gp-muted hover:text-gp-text text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    className="px-4 py-2 bg-gp-primary hover:bg-gp-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
