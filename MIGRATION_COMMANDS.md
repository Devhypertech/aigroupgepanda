# Prisma Migration Commands

This document provides the exact commands to run Prisma migrations for the Gepanda authentication and onboarding system.

## Prerequisites

1. **Database is running**: Ensure PostgreSQL is running and accessible
2. **DATABASE_URL is set**: Check `apps/api/.env` has `DATABASE_URL` configured
3. **Navigate to API directory**: All commands should be run from `apps/api/`

## Step 1: Check Current Schema Status

```bash
cd apps/api
npx prisma validate --schema=../../prisma/schema.prisma
```

This validates your Prisma schema without making changes.

## Step 2: Create Migration

```bash
cd apps/api
npx prisma migrate dev --name add_auth_and_onboarding --schema=../../prisma/schema.prisma
```

This will:
- Create a new migration file in `prisma/migrations/`
- Apply the migration to your database
- Generate the Prisma Client

**Note**: If you get an error about existing migrations, you may need to reset first (see Step 4).

## Step 3: Generate Prisma Client

After migration, generate the Prisma Client (usually done automatically by `migrate dev`, but can be run separately):

```bash
cd apps/api
npx prisma generate --schema=../../prisma/schema.prisma
```

## Step 4: Reset Database (⚠️ WARNING: Deletes All Data)

**Only run this if you need to start fresh or if migrations are failing:**

```bash
cd apps/api
npx prisma migrate reset --schema=../../prisma/schema.prisma
```

This will:
- Drop the database
- Recreate it
- Apply all migrations
- Run seed scripts (if configured)

## Step 5: Verify Migration

Check that all tables were created:

```bash
cd apps/api
npx prisma studio --schema=../../prisma/schema.prisma
```

This opens Prisma Studio at `http://localhost:5555` where you can:
- View all tables
- Verify User, Interest, UserInterest, FeedItem, FeedInteraction tables exist
- Check data

## Step 6: Seed Interests (Optional)

If you have an interests seed script, run it:

```bash
cd apps/api
# Check if seed script exists in package.json
npm run seed
```

Or manually seed via API:

```bash
# Start API server first
cd apps/api
npm run dev

# In another terminal, call seed endpoint
curl -X POST http://localhost:3001/api/interests/seed
```

## Common Issues

### Error: "Migration failed"

1. **Check database connection:**
   ```bash
   cd apps/api
   # Test connection
   npx prisma db execute --stdin --schema=../../prisma/schema.prisma
   # Type: SELECT 1;
   # Press Ctrl+D to exit
   ```

2. **Check DATABASE_URL:**
   ```bash
   cd apps/api
   cat .env | grep DATABASE_URL
   ```

3. **Reset and retry:**
   ```bash
   cd apps/api
   npx prisma migrate reset --schema=../../prisma/schema.prisma
   npx prisma migrate dev --name add_auth_and_onboarding --schema=../../prisma/schema.prisma
   ```

### Error: "Schema validation failed"

1. **Validate schema:**
   ```bash
   cd apps/api
   npx prisma validate --schema=../../prisma/schema.prisma
   ```

2. **Format schema:**
   ```bash
   cd apps/api
   npx prisma format --schema=../../prisma/schema.prisma
   ```

### Error: "Prisma Client not generated"

```bash
cd apps/api
npx prisma generate --schema=../../prisma/schema.prisma
```

## Quick Reference

```bash
# All-in-one setup (from project root)
cd apps/api

# 1. Validate schema
npx prisma validate --schema=../../prisma/schema.prisma

# 2. Create and apply migration
npx prisma migrate dev --name add_auth_and_onboarding --schema=../../prisma/schema.prisma

# 3. Generate client
npx prisma generate --schema=../../prisma/schema.prisma

# 4. Open Prisma Studio to verify
npx prisma studio --schema=../../prisma/schema.prisma
```

## Production Deployment

For production, use `migrate deploy` instead of `migrate dev`:

```bash
cd apps/api
npx prisma migrate deploy --schema=../../prisma/schema.prisma
npx prisma generate --schema=../../prisma/schema.prisma
```

This applies pending migrations without creating new ones.

## Schema Models Required

After migration, verify these models exist:

- ✅ `User` - User accounts with email/password
- ✅ `Interest` - Available interests (travel, deals, tech, etc.)
- ✅ `UserInterest` - User's selected interests
- ✅ `FeedItem` - Feed content items
- ✅ `FeedInteraction` - User interactions (saves, views, etc.)
- ✅ `GuestUser` - Guest user accounts

## Next Steps

After successful migration:

1. ✅ Start API server: `cd apps/api && npm run dev`
2. ✅ Start web app: `cd apps/web && npm run dev`
3. ✅ Test signup: `http://localhost:3000/signup`
4. ✅ Test onboarding: `http://localhost:3000/onboarding/interests`
5. ✅ Test feed: `http://localhost:3000/feed`

