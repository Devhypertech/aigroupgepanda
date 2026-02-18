'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Placeholder: wire to your password-reset API when ready
      await new Promise((r) => setTimeout(r, 800));
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden
      >
        <source src="/bgvideo.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black" style={{ opacity: 0.4 }} aria-hidden />
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl border border-white/20 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password?</h1>
          <p className="text-gray-600 text-sm mb-6">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
          {sent ? (
            <p className="text-gray-700 text-sm mb-4">
              If an account exists for that email, we&apos;ve sent a reset link. Check your inbox.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-red-600 text-sm" role="alert">{error}</p>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--gp-primary)]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[var(--gp-primary)] hover:bg-[var(--gp-primary-dark)] text-white font-semibold disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          )}
          <Link href="/login" className="mt-4 block text-center text-sm text-[var(--gp-primary)] hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
