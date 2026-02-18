# Production Build Guide

This document describes how to build and run the GePanda AI GroupChat application in production.

## Repository Structure

```
gepanda-ai-groupchat/
├── apps/
│   ├── api/          # Node.js/Express API server (TypeScript)
│   └── web/          # Next.js frontend (TypeScript)
├── packages/
│   └── shared/       # Shared TypeScript package
└── package.json      # Root package.json with workspace scripts
```

## Prerequisites

- Node.js >= 20
- npm >= 10
- PostgreSQL database (for API)
- Environment variables configured (see `.env.example` files)

## Environment Setup

### 1. API Server (`apps/api/.env`)

Create `apps/api/.env` file with the following variables:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `STREAM_API_KEY` - Stream Chat API key
- `STREAM_API_SECRET` - Stream Chat API secret
- `ZHIPU_API_KEY` - Zhipu AI API key for chat

**Optional (enable additional features):**
- `SERPAPI_API_KEY` - Google Shopping search
- `DOBA_PUBLIC_KEY` / `DOBA_PRIVATE_KEY` - Product catalog
- `CROSSMINT_API_KEY` - Checkout/payment links
- `TRAVELPAYOUTS_API_KEY` - Flight/hotel search
- `JWT_SECRET` - For authentication

### 2. Web App (`apps/web/.env.local`)

Copy `apps/web/.env.example` to `apps/web/.env.local` and configure:

**Required:**
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., `http://localhost:3001` or `https://api.example.com`)
- `NEXT_PUBLIC_STREAM_API_KEY` - Stream Chat public API key
- `NEXTAUTH_URL` - Base URL of your app
- `NEXTAUTH_SECRET` - Random secret for NextAuth

**Optional:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `NEXT_PUBLIC_TRAVELPAYOUTS_MARKER` - Travel affiliate ID

## Build Commands

### Development

```bash
# Install dependencies
npm install

# Run both API and web in development mode
npm run dev

# Or run separately:
npm run dev:api    # API on http://localhost:3001
npm run dev:web    # Web on http://localhost:3000
```

### Production Build

```bash
# Build everything (shared package, API, web)
npm run build

# Or build individually:
npm run build:shared   # Build shared package first
npm run build:api     # Compile TypeScript API to dist/
npm run build:web     # Build Next.js app (.next/)
```

### Production Start

```bash
# Start both API and web in production mode
npm run start

# Or start separately:
npm run start:api    # Runs node dist/index.js (API)
npm run start:web    # Runs next start (Web)
```

## Build Process Details

### API Server (`apps/api`)

1. **TypeScript Compilation:**
   - Source: `apps/api/src/**/*.ts`
   - Output: `apps/api/dist/**/*.js`
   - Config: `apps/api/tsconfig.json`
   - Command: `npm run build` → `tsc`

2. **Production Start:**
   - Runs: `node dist/index.js`
   - Listens on: `PORT` env var or `3001` default
   - Requires: Compiled `dist/` directory

### Web App (`apps/web`)

1. **Next.js Build:**
   - Output: `.next/` directory
   - Config: `apps/web/next.config.js`
   - Command: `npm run build` → `next build`
   - Mode: `standalone` output (includes dependencies)

2. **Production Start:**
   - Runs: `next start`
   - Listens on: `PORT` env var or `3000` default
   - Requires: Built `.next/` directory

## Deployment

### Railway (API)

Railway-specific build command:
```bash
npm run build:railway:api
```

This command:
1. Enables corepack
2. Prepares npm version
3. Installs dependencies
4. Builds shared package
5. Builds API

### Vercel (Web)

Vercel-specific build command:
```bash
npm run build:vercel:web
```

This command:
1. Installs dependencies
2. Builds shared package
3. Builds web app

**Vercel Configuration:**
- Framework Preset: Next.js
- Build Command: `npm run build:vercel:web`
- Output Directory: `.next` (auto-detected)
- Install Command: `npm install`

## Environment Variables for Deployment

### API Server (Railway/Render/etc.)

Set these in your hosting platform:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
STREAM_API_KEY=...
STREAM_API_SECRET=...
ZHIPU_API_KEY=...
# ... other optional keys
```

### Web App (Vercel/Netlify/etc.)

Set these in your hosting platform:

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_STREAM_API_KEY=...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=...
# ... other optional keys
```

## Local Production Testing

1. **Build everything:**
   ```bash
   npm install
   npm run build
   ```

2. **Set environment variables:**
   - Copy `.env.example` files to `.env` / `.env.local`
   - Fill in your actual values

3. **Start production servers:**
   ```bash
   npm run start
   ```

4. **Verify:**
   - API: http://localhost:3001/api/healthz
   - Web: http://localhost:3000

## Troubleshooting

### API Build Fails

- Check `tsconfig.json` configuration
- Ensure `dist/` directory is writable
- Verify all TypeScript dependencies are installed
- Check for circular dependencies

### Web Build Fails

- Check `next.config.js` configuration
- Verify `NEXT_PUBLIC_*` variables are set
- Ensure `.next/` directory is writable
- Check for missing dependencies

### Runtime Errors

- Verify all environment variables are set
- Check database connection (`DATABASE_URL`)
- Verify API keys are valid
- Check logs for specific error messages

## Notes

- The `dev` script uses `&` which works on Unix/Mac. On Windows, use separate terminals or a process manager.
- Production builds are optimized and minified.
- API uses ESM (`"type": "module"`), so imports use `.js` extensions.
- Next.js uses `standalone` output mode for easier deployment.
- Shared package must be built before API/web builds.

