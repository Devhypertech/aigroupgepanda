# Persistent Guest User Authentication - Implementation Complete

## Summary

Implemented persistent guest user authentication that works across web and API. Guest users can save interests, saved items, and preferences, which persist via httpOnly cookies.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)

**Added GuestUser Model:**
```prisma
model GuestUser {
  id        String   @id @default(uuid())
  name      String   @default("Guest User")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  signals UserSignals?
  interests UserInterest[]
  interactions FeedInteraction[]

  @@map("guest_users")
}
```

**Updated Relations:**
- `UserSignals` now supports both `User` and `GuestUser`
- `UserInterest` now supports both `User` and `GuestUser`
- `FeedInteraction` now supports both `User` and `GuestUser`

### 2. Backend Authentication Middleware (`apps/api/src/middleware/auth.ts`)

**New File:**
- `getCurrentUser(req, res)` function:
  - Checks for NextAuth session (real user)
  - Falls back to `gp_guest_id` cookie (guest user)
  - Creates new guest user + sets cookie if neither exists
- Sets httpOnly cookie: `gp_guest_id=<uuid>` (path=/, sameSite=lax, 1 year expiry)

### 3. Updated API Routes

All feed-related endpoints now use `getCurrentUser()`:

- **`apps/api/src/routes/feed.ts`** - Feed fetching
- **`apps/api/src/routes/feedInteract.ts`** - Interactions (like, save, view, click)
- **`apps/api/src/routes/feedSaved.ts`** - Save/unsave items
- **`apps/api/src/routes/feedNotInterested.ts`** - Not interested preferences
- **`apps/api/src/routes/interests.ts`** - Interest selection

### 4. Frontend Guest Auth Helper (`apps/web/lib/guestAuth.ts`)

**New File:**
- `getGuestUserId()` - Reads guest ID from cookie
- `isGuestUser(userId)` - Checks if user is a guest

### 5. Updated Frontend Components

**Feed Pages:**
- `apps/web/app/(app)/feed/page.tsx` - Uses guest auth for feed fetching
- `apps/web/app/(app)/saved/page.tsx` - Uses guest auth for saved items
- `apps/web/app/onboarding/interests/page.tsx` - Uses guest auth for interests

**Components:**
- `apps/web/components/feed/FeedCardV2.tsx` - Uses guest auth for interactions
- `apps/web/components/feed/LeftSidebar.tsx` - Shows "Guest User" and "Guest Mode" badge

### 6. API Configuration

**`apps/api/src/index.ts`:**
- Added `cookie-parser` middleware
- CORS configured with `credentials: true`

**`apps/api/package.json`:**
- Added `cookie-parser` dependency

## How It Works

1. **First Request:**
   - User visits site without session
   - API `getCurrentUser()` creates new `GuestUser` in DB
   - Sets `gp_guest_id` httpOnly cookie
   - Returns guest user ID

2. **Subsequent Requests:**
   - Cookie is sent automatically
   - API reads cookie and fetches guest user from DB
   - Guest user can save interests, items, preferences

3. **Real User Login:**
   - NextAuth session takes priority
   - Real user ID used instead of guest
   - Guest data remains in DB (can be migrated later)

## Database Migration

Run Prisma migration:

```bash
cd apps/api
npx prisma migrate dev --name add_guest_user
npx prisma generate
```

## Install Dependencies

```bash
cd apps/api
npm install cookie-parser
```

## Testing

1. **Guest User Flow:**
   - Visit `/feed` without logging in
   - Should see "Guest User" in sidebar
   - Can select interests, save items, mark not interested
   - Data persists across page refreshes

2. **Real User Flow:**
   - Login with Google OAuth
   - Should see real user name/email
   - Guest data remains separate

## Notes

- Guest users have IDs prefixed with `guest_`
- Cookie expires after 1 year
- Guest data can be migrated to real user account on signup (future feature)
- All feed endpoints now work for both guest and real users

