# Email/Password Authentication - Implementation Complete

## Summary

Implemented end-to-end email/password authentication with JWT session cookies. Users can sign up and log in with email/password, and errors are surfaced in the UI.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)

**Updated User Model:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String?  // Hashed password (null for OAuth users)
  name      String?
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // ... relations
}
```

### 2. Backend API Routes (`apps/api/src/routes/auth.ts`)

**New Endpoints:**

1. **POST /api/auth/signup**
   - Body: `{ email, password, name? }`
   - Validates with Zod (email format, password min 8 chars)
   - Hashes password with bcrypt (10 rounds)
   - Creates user in Prisma
   - Sets `gp_session` httpOnly cookie (JWT, 7 days)
   - Returns: `{ user: { id, email, name } }`

2. **POST /api/auth/login**
   - Body: `{ email, password }`
   - Validates credentials
   - Verifies password with bcrypt
   - Sets `gp_session` httpOnly cookie (JWT, 7 days)
   - Returns: `{ user: { id, email, name } }`

3. **GET /api/auth/me**
   - Reads `gp_session` cookie
   - Verifies JWT token
   - Returns: `{ user: { id, email, name, imageUrl } }` or 401

**Updated:**
- `POST /auth/upsert` - Now sets `password: null` for OAuth users

### 3. Authentication Middleware (`apps/api/src/middleware/auth.ts`)

**Updated `getCurrentUser()`:**
- Priority 1: JWT session cookie (`gp_session`) - email/password auth
- Priority 2: NextAuth session
- Priority 3: Guest cookie
- Priority 4: Create new guest

### 4. Frontend Signup Page (`apps/web/app/(auth)/signup/page.tsx`)

**Updated:**
- Email form now calls `POST ${API_URL}/api/auth/signup`
- Shows toast with detailed error messages (response text)
- On success: redirects to `/onboarding/interests`
- Added name field (optional)
- Password validation (min 8 chars, match confirmation)

### 5. Frontend Login Page (`apps/web/app/(auth)/login/page.tsx`)

**Updated:**
- Email form now calls `POST ${API_URL}/api/auth/login`
- Shows toast with detailed error messages
- On success: redirects to `next` param or `/feed`
- Credentials included in fetch (cookies)

### 6. Configuration Updates

**`apps/web/lib/config.ts`:**
- Updated default `apiUrl` to `http://localhost:3001`

**`apps/api/src/index.ts`:**
- Updated default `PORT` to `3001`

**`apps/api/package.json`:**
- Added `bcrypt` and `jsonwebtoken` dependencies
- Added `@types/bcrypt` and `@types/jsonwebtoken` dev dependencies

## Next Steps

1. **Install Dependencies:**
   ```bash
   cd apps/api
   npm install
   ```

2. **Run Prisma Migration:**
   ```bash
   cd apps/api
   npx prisma migrate dev --name add_password_field
   npx prisma generate
   ```

3. **Set Environment Variables:**
   ```bash
   # apps/api/.env
   JWT_SECRET=your-secret-key-change-in-production
   ```

4. **Restart API Server:**
   - Should now listen on port 3001
   - Verify: `http://localhost:3001/health`

5. **Set Frontend Environment:**
   ```bash
   # apps/web/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

## Testing

1. **Signup Flow:**
   - Visit `/signup`
   - Click "Continue with email"
   - Enter email, password (8+ chars), confirm password
   - Submit → Should redirect to `/onboarding/interests`
   - Check browser cookies → Should see `gp_session`

2. **Login Flow:**
   - Visit `/login`
   - Click "Continue with email"
   - Enter email/password
   - Submit → Should redirect to `/feed`
   - Check browser cookies → Should see `gp_session`

3. **Error Handling:**
   - Try duplicate email → Should show "User already exists"
   - Try wrong password → Should show "Email or password is incorrect"
   - Try invalid email → Should show validation error

4. **Session Persistence:**
   - After login, refresh page → Should stay logged in
   - Check `GET /api/auth/me` → Should return user data

## Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire after 7 days
- Cookies are httpOnly (not accessible via JavaScript)
- Cookies use `sameSite: 'lax'` for CSRF protection
- In production, set `secure: true` for HTTPS-only cookies
- Change `JWT_SECRET` in production!

