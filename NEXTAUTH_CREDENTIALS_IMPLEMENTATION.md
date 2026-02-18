# NextAuth Credentials Provider Implementation

## ✅ Implementation Complete

### Approach Used: **Prisma Direct** (Recommended)

The implementation uses Prisma directly in the Next.js app (`apps/web`) to authenticate users. This approach:
- ✅ Reduces API round trips
- ✅ Faster authentication
- ✅ Simpler architecture
- ✅ Direct database access

## 📁 Files Changed

### 1. `apps/web/app/api/auth/[...nextauth]/route.ts`
- ✅ Added `CredentialsProvider` from `next-auth/providers/credentials`
- ✅ Implemented `authorize()` function that:
  - Queries Prisma User table directly
  - Verifies password with `bcryptjs.compare()`
  - Returns user object for NextAuth session
- ✅ Added JWT session strategy
- ✅ Updated session callback to include `user.id`

### 2. `apps/web/lib/prisma.ts` (NEW)
- ✅ Created Prisma client singleton for Next.js
- ✅ Uses shared Prisma schema from monorepo root
- ✅ Properly handles development vs production

### 3. `apps/web/app/(auth)/login/page.tsx`
- ✅ Updated to use NextAuth `signIn('credentials')` instead of direct API call
- ✅ Proper error handling with toast messages
- ✅ Redirects to `/feed` or `next` parameter on success

### 4. `apps/web/app/(auth)/signup/page.tsx`
- ✅ After signup, automatically signs in with NextAuth Credentials
- ✅ Checks user interests and redirects accordingly
- ✅ Falls back to login page if auto-signin fails

### 5. `apps/web/middleware.ts`
- ✅ Updated to only protect `/feed` and `/chat` in **production**
- ✅ Development localhost bypass remains active
- ✅ Production requires valid NextAuth session

### 6. `apps/web/package.json`
- ✅ Added `@prisma/client` dependency

## 🔐 Required Environment Variables

### `apps/web/.env.local`

```env
# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Database (for Prisma)
DATABASE_URL=postgresql://user:password@localhost:5432/gepanda?schema=public

# API URL (for other API calls)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Google OAuth (optional, for Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Generate NEXTAUTH_SECRET

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🧪 Test Plan

### 1. Prerequisites

```bash
# Install dependencies
cd apps/web
npm install

# Generate Prisma Client (if not already done)
cd apps/api
npx prisma generate --schema=../../prisma/schema.prisma
```

### 2. Test Signup Flow

1. **Navigate to signup page:**
   ```
   http://localhost:3000/signup
   ```

2. **Fill in form:**
   - Email: `test@example.com`
   - Password: `password123` (min 8 chars)
   - Name: `Test User` (optional)

3. **Submit form:**
   - Should create user in database
   - Should automatically sign in with NextAuth
   - Should redirect to `/onboarding/interests` (if no interests)
   - Should redirect to `/feed` (if has interests)

4. **Verify session:**
   - Check browser DevTools → Application → Cookies
   - Should see `next-auth.session-token` cookie
   - Should be httpOnly and secure

### 3. Test Login Flow

1. **Navigate to login page:**
   ```
   http://localhost:3000/login
   ```

2. **Fill in form:**
   - Email: `test@example.com`
   - Password: `password123`

3. **Submit form:**
   - Should authenticate with NextAuth
   - Should redirect to `/feed` or `next` parameter
   - Should show success toast

4. **Test error cases:**
   - Wrong password → Should show error toast
   - Non-existent email → Should show error toast
   - OAuth user trying credentials → Should show appropriate error

### 4. Test Protected Routes

#### Development (localhost):
- ✅ `/feed` should be accessible without auth (bypass active)
- ✅ `/chat` should be accessible without auth (bypass active)

#### Production:
- ❌ `/feed` should redirect to `/login` if not authenticated
- ❌ `/chat` should redirect to `/login` if not authenticated
- ✅ `/feed` should be accessible if authenticated
- ✅ `/chat` should be accessible if authenticated

### 5. Test Session Access

1. **After login, check session in component:**
   ```typescript
   import { useSession } from 'next-auth/react';
   
   const { data: session } = useSession();
   console.log(session?.user?.id); // Should have user.id
   console.log(session?.user?.email); // Should have email
   ```

2. **Verify session includes:**
   - ✅ `user.id` (from Prisma User.id)
   - ✅ `user.email`
   - ✅ `user.name`
   - ✅ `user.image` (if available)

### 6. Test API Endpoint (Still Available)

The API endpoint `/api/auth/login` is still available for other use cases:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🔍 Verification Checklist

- [ ] Prisma client generates successfully
- [ ] NextAuth route handler works (`/api/auth/[...nextauth]`)
- [ ] Credentials provider appears in NextAuth providers
- [ ] Signup creates user and auto-signs in
- [ ] Login authenticates and creates session
- [ ] Session includes `user.id`
- [ ] Protected routes work in production
- [ ] Development bypass works on localhost
- [ ] Error messages display correctly
- [ ] Redirects work after auth

## 🐛 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

**Solution:**
```bash
cd apps/web
npm install @prisma/client
```

### Error: "Prisma Client not generated"

**Solution:**
```bash
cd apps/api
npx prisma generate --schema=../../prisma/schema.prisma
```

### Error: "NEXTAUTH_SECRET is missing"

**Solution:**
Add to `apps/web/.env.local`:
```env
NEXTAUTH_SECRET=your-generated-secret-here
```

### Error: "Invalid credentials" but password is correct

**Check:**
1. User exists in database
2. `passwordHash` field is set (not null)
3. Password was hashed with bcryptjs (not bcrypt)
4. Database connection is working

### Session not persisting

**Check:**
1. `NEXTAUTH_URL` is set correctly
2. Cookies are enabled in browser
3. SameSite cookie settings (should be 'lax' in dev)
4. HTTPS in production (secure cookies)

## 📝 Notes

- **Prisma Client Location**: Uses shared Prisma schema from `prisma/schema.prisma` at monorepo root
- **Password Hashing**: Uses `bcryptjs` (JavaScript implementation, no native dependencies)
- **Session Strategy**: JWT (no database session table needed)
- **Development Bypass**: Only works on `localhost` in `NODE_ENV=development`
- **Production Security**: All protected routes require valid NextAuth session

## 🚀 Next Steps

1. ✅ Test signup flow end-to-end
2. ✅ Test login flow end-to-end
3. ✅ Verify session persistence
4. ✅ Test protected routes in production mode
5. ✅ Set strong `NEXTAUTH_SECRET` for production
6. ✅ Configure `NEXTAUTH_URL` for production domain

