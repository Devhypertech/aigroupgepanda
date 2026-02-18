# NextAuth Google Authentication Setup

## Overview

Google authentication has been implemented using NextAuth.js v4 for Next.js 14 App Router.

## Files Created/Modified

### Backend (apps/api)
- **`apps/api/src/routes/auth.ts`** (new)
  - `POST /api/auth/upsert` - Upserts user in database and Stream Chat
  - Validates user data with Zod
  - Generates consistent userId from email

### Frontend (apps/web)
- **`apps/web/app/api/auth/[...nextauth]/route.ts`** (new)
  - NextAuth route handler for App Router
  - Google OAuth provider configuration
  - Callbacks: signIn → upsert user, jwt → store userId, session → expose to client

- **`apps/web/lib/auth.ts`** (new)
  - Client-side auth helper functions
  - `getAuthSession()`, `signInWithGoogle()`, `signOutUser()`, etc.
  - Typed session interface

- **`apps/web/app/providers.tsx`** (new)
  - SessionProvider wrapper for NextAuth

- **`apps/web/app/layout.tsx`** (updated)
  - Wrapped with SessionProvider

- **`apps/web/app/(auth)/login/page.tsx`** (updated)
  - Google button calls `signInWithGoogle('/')`

- **`apps/web/app/(auth)/signup/page.tsx`** (updated)
  - Google button calls `signInWithGoogle('/')`

- **`apps/web/package.json`** (updated)
  - Added `next-auth@^4.24.5` dependency

## Environment Variables

Add these to your `.env` file in `apps/web/`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
4. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
5. Copy Client ID and Client Secret to `.env`

## Installation

```bash
cd apps/web
npm install
```

## Authentication Flow

1. User clicks "Continue with Google" on login/signup page
2. NextAuth redirects to Google OAuth consent screen
3. User authorizes app
4. Google redirects back to `/api/auth/callback/google`
5. NextAuth `signIn` callback:
   - Calls `POST /api/auth/upsert` with user data
   - API creates/updates user in Stream Chat
   - Returns userId
6. NextAuth `jwt` callback stores userId in token
7. NextAuth `session` callback exposes userId to client
8. User redirected to `/` (home/chat page)

## Usage Examples

### Check if user is authenticated

```typescript
import { getAuthSession } from '@/lib/auth';

const session = await getAuthSession();
if (session) {
  console.log('User ID:', session.user.id);
  console.log('Email:', session.user.email);
}
```

### Get current user ID

```typescript
import { getCurrentUserId } from '@/lib/auth';

const userId = await getCurrentUserId();
```

### Sign out

```typescript
import { signOutUser } from '@/lib/auth';

await signOutUser('/login');
```

## Session Structure

```typescript
interface GePandaSession {
  user: {
    id: string;        // userId from API (e.g., "user_email_example_com")
    email: string;     // User's email
    name: string;      // User's display name
    image?: string;    // User's profile image URL
  };
  expires: string;
}
```

## API Endpoint

### POST /api/auth/upsert

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "image": "https://...",
  "provider": "google",
  "providerId": "123456789"
}
```

**Response:**
```json
{
  "success": true,
  "userId": "user_email_example_com",
  "email": "user@example.com",
  "name": "John Doe",
  "image": "https://..."
}
```

## Notes

- User ID is generated from email: `user_${email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
- User is automatically created in Stream Chat on first sign-in
- Session persists across page refreshes
- NextAuth handles token refresh automatically

## Troubleshooting

### "Cannot find module 'next-auth'"
- Run `npm install` in `apps/web`

### "Invalid credentials" error
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Verify redirect URI matches Google Console settings

### "NEXTAUTH_SECRET is not set"
- Generate secret: `openssl rand -base64 32`
- Add to `.env` file

### User not created in Stream
- Check API server is running
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check API logs for errors

