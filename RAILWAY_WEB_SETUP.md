# Railway Web App Deployment Setup

## Problem
Railway is trying to start the web app without building it first, causing the error:
```
Error: ENOENT: no such file or directory, open '/app/apps/web/.next/BUILD_ID'
```

## Solution

### Option 1: Use Dockerfile.web (Recommended)

1. In Railway dashboard, go to your **@gepanda/web** service
2. Go to **Settings** → **Build & Deploy**
3. Set **Dockerfile Path** to: `Dockerfile.web`
4. Deploy

### Option 2: Configure Build Commands

1. In Railway dashboard, go to your **@gepanda/web** service
2. Go to **Settings** → **Build & Deploy**
3. Set **Build Command** to:
   ```
   npm run build:railway:web
   ```
4. Set **Start Command** to:
   ```
   npm run start:web
   ```
5. Set **Root Directory** to: (leave empty or set to repo root)
6. Deploy

### Option 3: Use Nixpacks with Build Command

If Railway is using Nixpacks (auto-detected):
1. In Railway dashboard, go to **Settings** → **Build & Deploy**
2. Set **Build Command** to:
   ```
   npm run build:railway:web
   ```
3. Set **Start Command** to:
   ```
   cd apps/web && npm run start
   ```

## Verify

After deployment, check that:
- ✅ Build completes successfully
- ✅ `.next/BUILD_ID` file exists
- ✅ Server starts on the configured PORT

## Note

The web app is configured for **Vercel** deployment by default. For Railway, use one of the options above.

