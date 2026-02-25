'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { getPublicConfig } from '../../../lib/config';
import { useToast } from '../../../components/ui/Toast';

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;
  const { showToast, ToastComponent } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const nextUrl = searchParams.get('next') || '/feed';

  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Ensure video plays (some browsers require user interaction; we use muted + playsInline)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const play = () => video.play().catch(() => {});
    play();
    video.addEventListener('loadeddata', play);
    return () => video.removeEventListener('loadeddata', play);
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: nextUrl });
      // signIn redirects; if we're still here, something failed
      setIsLoading(false);
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: nextUrl,
      });

      if (result?.error) {
        const errorMessage =
          result.error === 'CredentialsSignin'
            ? 'Invalid email or password.'
            : typeof result.error === 'string'
              ? result.error
              : 'Invalid email or password.';
        setError(errorMessage);
        showToast(errorMessage, 'error');
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        const session = await getSession();
        const name = session?.user?.name;
        showToast(name ? `Welcome back, ${name}!` : 'Signed in successfully!', 'success');

        try {
          const interestsResponse = await fetch(`${API_URL}/api/users/me/interests`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (interestsResponse.ok) {
            const data = await interestsResponse.json();
            const hasInterests = data.interestIds && data.interestIds.length > 0;
            if (!hasInterests) {
              router.push('/onboarding/interests');
            } else {
              router.push(nextUrl);
            }
          } else {
            router.push(nextUrl);
          }
        } catch {
          router.push(nextUrl);
        }
        return;
      }

      setError('Failed to sign in. Please try again.');
      showToast('Failed to sign in. Please try again.', 'error');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    if (process.env.NODE_ENV !== 'development') return;
    setError(null);
    setIsDemoLoading(true);
    try {
      const res = await fetch('/api/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next: nextUrl }),
      });
      if (!res.ok) throw new Error('Demo login failed');
      const data = await res.json();
      router.push(data.redirect || nextUrl);
    } catch {
      setError('Demo login failed. Run in development mode.');
      showToast('Demo login failed. Make sure you are running in development mode.', 'error');
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden
      >
        <source src="/bgvideo.mp4" type="video/mp4" />
      </video>

      {/* Semi-transparent black overlay - opacity 0.4 */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: 0.4 }}
        aria-hidden
      />

      {/* Centered login form */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 py-8 sm:py-10">
        <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl border border-white/20 p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Sign in to continue to GePanda
            </p>
          </div>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Login with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isDemoLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 bg-white text-gray-800 font-medium shadow-sm hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--gp-primary)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Signing in...' : 'Login with Google'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white/95 text-gray-600">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--gp-primary)] focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--gp-primary)] focus:border-transparent transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || isDemoLoading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--gp-primary)] hover:bg-[var(--gp-primary-dark)] text-white font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--gp-primary)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Forgot password & Sign up */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
            <Link
              href="/forgot-password"
              className="text-gray-600 hover:text-[var(--gp-primary)] transition-colors"
            >
              Forgot password?
            </Link>
            <span className="text-gray-600">
              Need an account?{' '}
              <Link
                href={`/signup${nextUrl !== '/feed' ? `?next=${encodeURIComponent(nextUrl)}` : ''}`}
                className="font-medium text-[var(--gp-primary)] hover:underline"
              >
                Sign up
              </Link>
            </span>
          </div>

          {/* Demo login (dev only) */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
              </div>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isDemoLoading || isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--gp-primary)]/50 bg-[var(--gp-primary)]/10 text-[var(--gp-primary)] font-medium hover:bg-[var(--gp-primary)]/20 transition-colors disabled:opacity-60"
              >
                {isDemoLoading ? 'Logging in...' : 'Demo Login (Dev Only)'}
              </button>
            </>
          )}
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}
