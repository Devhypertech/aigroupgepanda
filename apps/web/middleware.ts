import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const host = req.headers.get('host') || '';
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');

  // Protected routes that require authentication
  const protectedRoutes = ['/chat', '/feed', '/orders'];
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  // Skip middleware for non-protected routes
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // ✅ HARD DEV BYPASS (localhost only, development mode only)
  // This makes protected routes accessible while Google OAuth is not configured yet.
  // SECURITY: This bypass ONLY works when:
  // 1. NODE_ENV === 'development' (hard check - cannot be bypassed)
  // 2. Request is from localhost/127.0.0.1 (hard check - cannot be bypassed)
  // Production will ALWAYS require authentication regardless of any env vars
  if (process.env.NODE_ENV === 'development' && isLocalhost) {
    const res = NextResponse.next();
    res.headers.set('x-dev-bypass', '1'); // debug header to confirm middleware bypassed
    return res;
  }

  // ✅ DEV DEMO LOGIN (development mode only)
  // Check for dev_auth cookie in development
  // SECURITY: This ONLY works in development (NODE_ENV !== 'production')
  if (process.env.NODE_ENV === 'development') {
    const devAuthCookie = req.cookies.get('dev_auth');
    if (devAuthCookie?.value === '1') {
      const res = NextResponse.next();
      res.headers.set('x-dev-auth', '1'); // debug header
      return res;
    }
  }

  // Check for NextAuth session token
  const token = await getToken({
    req: req as any, // Type compatibility for Next.js 14 middleware
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
