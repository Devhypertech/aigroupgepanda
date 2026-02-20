# Vercel Deployment Guide

This guide covers deploying the Next.js web app (`apps/web`) to Vercel.

## Prerequisites

- Vercel account (sign up at https://vercel.com)
- GitHub repository connected to Vercel
- API server deployed separately (Railway, Render, etc.)

## Vercel Project Settings

### 1. Root Directory

Set **Root Directory** to:
```
apps/web
```

### 2. Build Command

Use the monorepo-aware build command:
```bash
npm run build:vercel:web
```

Or if using Vercel's automatic detection:
```bash
npm run build
```

**Note:** Vercel will automatically detect Next.js and use the correct build command if `package.json` has a `build` script.

### 3. Output Directory

**Default:** `.next` (auto-detected by Vercel)

Vercel automatically detects Next.js output directory, so no manual configuration needed.

### 4. Install Command

```bash
npm install
```

Vercel will run this automatically from the root directory, which installs all workspace dependencies.

### 5. Framework Preset

**Auto-detect:** Next.js (Vercel will detect automatically)

## Environment Variables

Set these in **Vercel Dashboard → Project Settings → Environment Variables**:

### Required Variables

```bash
# Backend API URL (your deployed API server)
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
# OR
NEXT_PUBLIC_API_URL=https://your-api-domain.render.com

# Stream Chat Public API Key
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key_here

# NextAuth Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### Optional Variables

```bash
# Google OAuth (if using Google sign-in)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Travelpayouts Affiliate ID
NEXT_PUBLIC_TRAVELPAYOUTS_MARKER=613624
```

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. **Import Project:**
   - Go to https://vercel.com/new
   - Import your GitHub repository: `Devhypertech/aigroupgepanda`
   - Vercel will auto-detect it's a Next.js app

2. **Configure Project:**
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build:vercel:web` (or leave auto)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto)

3. **Set Environment Variables:**
   - Add all required variables listed above
   - Set for **Production**, **Preview**, and **Development** environments

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-app.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
cd /path/to/gepanda-ai-groupchat
vercel

# Follow prompts:
# - Set root directory: apps/web
# - Link to existing project or create new
# - Set environment variables
```

## Monorepo Configuration

Since this is a monorepo, Vercel needs to:

1. **Install from root:** Runs `npm install` from repository root (installs all workspaces)
2. **Build shared package first:** The `build:vercel:web` script handles this:
   ```bash
   npm install && npm run build:shared && npm -w @gepanda/web run build
   ```
3. **Build web app:** Compiles Next.js app to `.next/`

## Build Process

The build command (`npm run build:vercel:web`) does:

1. `npm install` - Installs all dependencies (including workspace dependencies)
2. `npm run build:shared` - Builds the shared TypeScript package
3. `npm -w @gepanda/web run build` - Builds the Next.js app

## Environment Variable Notes

### NEXT_PUBLIC_API_URL

**Important:** This must point to your deployed API server (not localhost).

- **Development:** `http://localhost:3001`
- **Production:** `https://your-api-domain.railway.app` or similar

**Note:** Next.js embeds `NEXT_PUBLIC_*` variables at build time. If you change this variable, you **must redeploy** for changes to take effect.

### NEXTAUTH_URL

Must match your Vercel deployment URL:
- **Production:** `https://your-app.vercel.app`
- **Preview:** Auto-set by Vercel (can use `VERCEL_URL`)

## Troubleshooting

### Build Fails: "Cannot find module @gepanda/shared"

**Solution:** Ensure `build:vercel:web` script builds shared package first:
```bash
npm run build:shared && npm -w @gepanda/web run build
```

### API Calls Fail: "Failed to fetch"

**Check:**
1. `NEXT_PUBLIC_API_URL` is set correctly in Vercel
2. API server is deployed and accessible
3. API server CORS allows your Vercel domain
4. Redeploy after changing `NEXT_PUBLIC_API_URL`

### Environment Variables Not Working

**Remember:**
- `NEXT_PUBLIC_*` variables are embedded at **build time**
- Changing them requires a **new deployment**
- Use Vercel's "Redeploy" button after changing env vars

### Build Timeout

**Solution:** Increase build timeout in Vercel settings:
- Project Settings → General → Build & Development Settings
- Increase "Build Command Timeout" if needed

## Post-Deployment Checklist

- [ ] Verify `NEXT_PUBLIC_API_URL` points to deployed API server
- [ ] Test API connectivity (check browser console)
- [ ] Verify authentication works (login/signup)
- [ ] Test chat functionality
- [ ] Test feed loading
- [ ] Check for CORS errors in browser console
- [ ] Verify environment variables are set correctly
- [ ] Test on mobile devices

## Custom Domain Setup

1. Go to **Project Settings → Domains**
2. Add your custom domain
3. Update `NEXTAUTH_URL` to match your custom domain
4. Redeploy

## Continuous Deployment

Vercel automatically deploys on:
- Push to `main` branch → Production
- Push to other branches → Preview deployment
- Pull requests → Preview deployment

## Monitoring

- **Vercel Dashboard:** View deployments, logs, analytics
- **Function Logs:** Check serverless function logs for API route issues
- **Real-time Logs:** Use `vercel logs` CLI command

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Vercel Support: https://vercel.com/support

