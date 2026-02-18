# Migration: Add User Model

## Prisma Schema Changes

The `User` model has been added to `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

## Migration Steps

### Option 1: Using Prisma Migrate (Recommended)

1. **Generate migration:**
   ```bash
   cd apps/api
   npm run db:migrate -- --name add_user_model
   ```
   
   Or if using Prisma CLI directly:
   ```bash
   cd apps/api
   npx prisma migrate dev --name add_user_model
   ```

2. **Apply migration:**
   ```bash
   npm run db:migrate:deploy
   ```
   
   Or:
   ```bash
   npx prisma migrate deploy
   ```

### Option 2: Manual SQL Migration

If you prefer to run SQL directly:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
```

### Option 3: Using Prisma Studio (Development Only)

For development, you can use Prisma Studio to inspect the database:

```bash
cd apps/api
npx prisma studio
```

## Regenerate Prisma Client

After running the migration, regenerate the Prisma client:

```bash
cd apps/api
npm run db:generate
```

Or:
```bash
npx prisma generate
```

## Verify Migration

1. Check that the `users` table exists:
   ```sql
   SELECT * FROM "users" LIMIT 1;
   ```

2. Test the upsert endpoint:
   ```bash
   curl -X POST http://localhost:3001/auth/upsert \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test User"}'
   ```

## Rollback (if needed)

If you need to rollback:

```sql
DROP TABLE IF EXISTS "users";
```

Or using Prisma:
```bash
cd apps/api
npx prisma migrate reset
```

**Warning:** `migrate reset` will drop all data in your database!

