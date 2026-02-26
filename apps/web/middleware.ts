import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const host = req.headers.get('host') || '';
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');

  // Never run auth logic on NextAuth API or auth pages (avoids 404/500 on Vercel Edge)
  if (path.startsWith('/api/auth') || path === '/login' || path === '/signup') {
    return NextResponse.next();
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/chat', '/feed', '/orders'];
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  // Skip middleware for non-protected routes
  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // ✅ HARD DEV BYPASS (localhost only, development mode only)
  if (process.env.NODE_ENV === 'development' && isLocalhost) {
    const res = NextResponse.next();
    res.headers.set('x-dev-bypass', '1');
    return res;
  }

  // ✅ DEV DEMO LOGIN (development mode only)
  if (process.env.NODE_ENV === 'development') {
    const devAuthCookie = req.cookies.get('dev_auth');
    if (devAuthCookie?.value === '1') {
      const res = NextResponse.next();
      res.headers.set('x-dev-auth', '1');
      return res;
    }
  }

  // getToken can throw on Vercel Edge if NEXTAUTH_SECRET is missing or env is not available
  let token = null;
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.warn('[middleware] NEXTAUTH_SECRET is not set; redirecting to login');
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', path);
      return NextResponse.redirect(loginUrl);
    }
    token = await getToken({
      req: req as any,
      secret,
    });
  } catch (e) {
    console.error('[middleware] getToken error:', e);
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude API routes, NextAuth, static assets so auth flows never hit token check
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
