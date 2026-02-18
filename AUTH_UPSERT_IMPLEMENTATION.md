# Auth Upsert Endpoint Implementation

## Summary

Implemented the `/auth/upsert` endpoint for user authentication with Prisma User model support.

## Files Modified

### 1. Prisma Schema (`prisma/schema.prisma`)
Added `User` model:
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

### 2. Auth Route (`apps/api/src/routes/auth.ts`)
- **Endpoint**: `POST /auth/upsert` (also available at `/api/auth/upsert`)
- **Request Body**: `{ email: string, name?: string, imageUrl?: string }`
- **Response**: `{ userId: string }`
- **Validation**: Zod schema validates email format and optional fields
- **Behavior**:
  - If user exists by email → updates `name` and `imageUrl`
  - If user doesn't exist → creates new user
  - Always upserts user in Stream Chat
  - Returns consistent `userId` generated from email

### 3. CORS Configuration (`apps/api/src/index.ts`)
- Updated CORS to allow requests from web app domain
- Supports environment variable `WEB_APP_URL` for production domain
- Allows localhost origins for development
- Credentials enabled for cookie-based auth

### 4. NextAuth Route (`apps/web/app/api/auth/[...nextauth]/route.ts`)
- Updated to call `/auth/upsert` endpoint
- Changed `image` field to `imageUrl` to match Prisma schema

## Migration Instructions

### Step 1: Generate Prisma Client
```bash
cd apps/api
npm run db:generate
```

### Step 2: Create and Apply Migration
```bash
cd apps/api
npm run db:migrate -- --name add_user_model
```

Or manually:
```bash
npx prisma migrate dev --schema=../../prisma/schema.prisma --name add_user_model
```

### Step 3: Verify Migration
```bash
# Check that users table exists
cd apps/api
npx prisma studio
```

## Environment Variables

Add to `apps/api/.env` (optional for CORS):
```env
WEB_APP_URL=https://your-web-app-domain.com
```

## API Usage

### Request
```bash
curl -X POST http://localhost:3001/auth/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "imageUrl": "https://example.com/avatar.jpg"
  }'
```

### Response
```json
{
  "userId": "user_user_example_com"
}
```

## Error Handling

- **400 Bad Request**: Invalid request body (Zod validation failed)
- **500 Internal Server Error**: Database or Stream Chat error

The endpoint gracefully handles:
- Missing database connection (continues with Stream Chat only)
- Stream Chat failures (returns success if DB operation succeeded)
- Partial failures (logs errors but attempts to complete operation)

## Testing

1. **Test with database:**
   ```bash
   curl -X POST http://localhost:3001/auth/upsert \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test User"}'
   ```

2. **Verify in database:**
   ```bash
   cd apps/api
   npx prisma studio
   # Navigate to User model
   ```

3. **Test without database:**
   - Remove `DATABASE_URL` from `.env`
   - Endpoint will still work with Stream Chat only

## Notes

- `userId` is generated consistently from email: `user_${email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`
- User model fields are optional except `email` (required and unique)
- `imageUrl` is validated as URL format by Zod
- CORS allows both `/auth/upsert` and `/api/auth/upsert` paths

