# Environment Variables Setup

## Required Environment Variables

### 1. Backend API (`apps/api/.env`)

Add or update the following variables in `apps/api/.env`:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gepanda?schema=public

# JWT Secret (for email/password authentication)
JWT_SECRET=your-secret-key-change-in-production

# Stream Chat API (if not already set)
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# AI API (if not already set)
ZHIPU_API_KEY=your_zhipu_api_key

# Port (optional, defaults to 3001)
PORT=3001
```

**Important:** 
- Replace `your-secret-key-change-in-production` with a strong random string (at least 32 characters)
- Replace `DATABASE_URL` with your actual PostgreSQL connection string
- The `JWT_SECRET` is critical for security - use a strong random value in production

### 2. Frontend Web (`apps/web/.env.local`)

Add or update the following variable in `apps/web/.env.local`:

```bash
# API Base URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# NextAuth (if using Google OAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Stream Chat (if not already set)
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
```

## After Setting Environment Variables

1. **Run Prisma Migration** (if DATABASE_URL is now set):
   ```bash
   cd apps/api
   npx prisma migrate dev --name add_password_field --schema=../../prisma/schema.prisma
   ```

2. **Install Dependencies** (if not already done):
   ```bash
   cd apps/api
   npm install
   ```

3. **Restart API Server**:
   ```bash
   cd apps/api
   npm run dev
   ```

4. **Restart Web Server** (if needed):
   ```bash
   cd apps/web
   npm run dev
   ```

## Quick Setup Commands

If you have DATABASE_URL already set, you can run:

```bash
# From project root
cd apps/api
npm install
npx prisma migrate dev --name add_password_field --schema=../../prisma/schema.prisma
```

Then add `JWT_SECRET` to `apps/api/.env` and `NEXT_PUBLIC_API_URL` to `apps/web/.env.local`.

