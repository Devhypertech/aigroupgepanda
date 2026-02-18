'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { getPublicConfig } from '../../../lib/config';
import { useToast } from '../../../components/ui/Toast';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = getPublicConfig();
  const API_URL = config.apiUrl;
  const { showToast, ToastComponent } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

  const nextUrl = searchParams.get('next') || '/feed';

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const play = () => video.play().catch(() => {});
    play();
    video.addEventListener('loadeddata', play);
    return () => video.removeEventListener('loadeddata', play);
  }, []);

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: nextUrl });
      setIsLoading(false);
    } catch (err) {
      console.error('Google sign-up error:', err);
      setError('Failed to sign up with Google. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      showToast('Passwords do not match', 'error');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
        }),
      });

      const responseText = await response.text();
      let data: { message?: string; error?: string; user?: { id: string } } = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || 'Signup failed');
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || `Signup failed: ${response.status}`;
        setError(errorMessage);
        showToast(errorMessage, 'error');
        setIsLoading(false);
        return;
      }

      showToast('Account created successfully! Signing you in...', 'success');

      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        showToast('Account created but sign-in failed. Please sign in.', 'error');
        router.push('/login');
        setIsLoading(false);
        return;
      }

      let hasInterests = false;
      if (data.user?.id) {
        try {
          const interestsResponse = await fetch(`${API_URL}/api/users/me/interests`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          if (interestsResponse.ok) {
            const interestsData = await interestsResponse.json();
            hasInterests = !!(interestsData.interestIds && interestsData.interestIds.length > 0);
          }
        } catch {
          // ignore
        }
      }

      if (hasInterests) {
        router.push(nextUrl);
      } else {
        router.push('/onboarding/interests');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create account. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
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
      <div className="absolute inset-0 bg-black" style={{ opacity: 0.4 }} aria-hidden />

      {/* Centered signup form */}
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 py-8 sm:py-10">
        <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl border border-white/20 p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Join GePanda to start planning your next adventure
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
            onClick={handleGoogleSignUp}
            disabled={isLoading}
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
            {isLoading ? 'Signing up...' : 'Sign up with Google'}
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-1">
                Name (optional)
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--gp-primary)] focus:border-transparent transition-shadow"
              />
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--gp-primary)] focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-800 mb-1">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--gp-primary)] focus:border-transparent transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[var(--gp-primary)] hover:bg-[var(--gp-primary-dark)] text-white font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--gp-primary)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href={nextUrl !== '/feed' ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login'}
              className="font-medium text-[var(--gp-primary)] hover:underline"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            By creating an account, you agree to GePanda&apos;s{' '}
            <Link href="/terms" className="text-[var(--gp-primary)] hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-[var(--gp-primary)] hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {ToastComponent}
    </div>
  );
}
