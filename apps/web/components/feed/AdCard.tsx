/**
 * Advertisement Card Component
 * Sponsored content/advertisement
 */

'use client';

import Link from 'next/link';

export function AdCard() {
  return (
    <div className="bg-gradient-to-br from-gp-primary/10 to-gp-primary/5 rounded-xl p-4 border border-gp-primary/20">
      <div className="text-center">
        <div className="text-3xl mb-2">✈️</div>
        <h4 className="text-gp-text font-semibold text-sm mb-1">
          Plan Your Next Trip
        </h4>
        <p className="text-gp-muted text-xs mb-3">
          Get personalized travel recommendations from GePanda AI
        </p>
        <Link
          href="/chat"
          className="block w-full py-2 px-4 bg-gp-primary hover:bg-gp-primary-dark border-none rounded-lg text-black text-sm font-semibold text-center no-underline transition-colors"
        >
          Ask AI
        </Link>
      </div>
      <p className="text-gp-muted text-[10px] text-center mt-3 opacity-60">
        Sponsored
      </p>
    </div>
  );
}
