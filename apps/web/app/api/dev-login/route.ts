/**
 * Development Demo Login Route
 * Sets a dev_auth cookie for local development only
 * This route ONLY works in development mode (NODE_ENV !== 'production')
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // SECURITY: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Demo login is not available in production' },
      { status: 403 }
    );
  }

  // Get next redirect URL from request body or default to /feed
  const body = await req.json().catch(() => ({}));
  const nextUrl = body.next || '/feed';

  // Create response with redirect
  const response = NextResponse.json(
    { success: true, redirect: nextUrl },
    { status: 200 }
  );

  // Set httpOnly cookie for dev auth
  // Cookie expires in 7 days, httpOnly for security, sameSite for CSRF protection
  response.cookies.set('dev_auth', '1', {
    httpOnly: true,
    secure: false, // false for localhost, would be true in production (but this route doesn't work in prod)
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return response;
}

/**
 * DELETE /api/dev-login
 * Remove dev auth cookie (logout)
 */
export async function DELETE(req: NextRequest) {
  // SECURITY: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Demo logout is not available in production' },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  
  // Delete the cookie
  response.cookies.delete('dev_auth');

  return response;
}

