# NextAuth Integration Fix

## Summary
Fixed NextAuth integration in the monorepo. All components are properly configured.

## Commands to Run

### 1. Install next-auth in workspace
```bash
npm install --workspace=@gepanda/web next-auth@^4.24.5
```

**Status:** ✅ Already executed

## File Changes

### 1. ✅ `apps/web/package.json`
**Status:** Already has next-auth dependency
```json
"dependencies": {
  "next-auth": "^4.24.5",
  ...
}
```

### 2. ✅ `apps/web/app/api/auth/[...nextauth]/route.ts`
**Status:** Already exists and configured correctly
- Uses Google provider
- Has proper callbacks (signIn, jwt, session, redirect)
- Upserts user to API database
- Default redirects to `/feed`

### 3. ✅ `apps/web/app/providers.tsx`
**Status:** Already exists and correct
```tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

### 4. ✅ `apps/web/app/layout.tsx`
**Status:** Already wraps children in `<Providers>`
```tsx
<body>
  <Providers>
    {children}
  </Providers>
</body>
```

### 5. ✅ All files using `useSession` have `'use client'`
- ✅ `apps/web/app/page.tsx` - has `'use client'`
- ✅ `apps/web/app/(app)/feed/page.tsx` - has `'use client'`
- ✅ `apps/web/app/(app)/chat/page.tsx` - has `'use client'`
- ✅ `apps/web/components/navigation/AppNav.tsx` - has `'use client'`
- ✅ `apps/web/app/providers.tsx` - has `'use client'`

### 6. ✅ `apps/web/app/page.tsx` - Updated redirect logic
**Change:** Now redirects to `/feed` if logged in, otherwise `/login`

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    
    // Check if there's a redirect parameter from auth
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      
      if (next) {
        router.replace(next);
        return;
      }
    }
    
    // If logged in, redirect to feed; otherwise redirect to login
    if (session) {
      router.replace('/feed');
    } else {
      router.replace('/login');
    }
  }, [status, session, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--gp-bg)',
    }}>
      <div style={{ color: 'var(--gp-text)' }}>Redirecting...</div>
    </div>
  );
}
```

### 7. ✅ `apps/web/.env.example` - Created
**New file:** Environment variables template

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here  # Generate with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Stream Chat
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key_here
```

## Environment Variables Required

Create `apps/web/.env.local` with:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STREAM_API_KEY=<from Stream Dashboard>
```

## Verification Steps

1. ✅ NextAuth installed in workspace
2. ✅ Route handler exists at `apps/web/app/api/auth/[...nextauth]/route.ts`
3. ✅ SessionProvider wrapper in `apps/web/app/providers.tsx`
4. ✅ Layout wraps children in `<Providers>`
5. ✅ All `useSession` files have `'use client'`
6. ✅ Root page redirects based on auth status
7. ✅ `.env.example` created

## Next Steps

1. Copy `.env.example` to `.env.local` in `apps/web/`
2. Fill in the required environment variables
3. Run `npm run dev:web` to test
4. Build should now succeed: `npm run build:web`

