# Vercel Deployment Checklist

## Pre-Deployment Code Changes ✅

### 1. Hardcoded URLs Removed
- ✅ All API calls use `NEXT_PUBLIC_API_URL` via `config.apiUrl`
- ✅ `getBaseUrl()` function handles Vercel URL detection
- ✅ Error messages updated for production vs development

### 2. Environment Variables
- ✅ All API URLs use `NEXT_PUBLIC_API_URL`
- ✅ Stream API key uses `NEXT_PUBLIC_STREAM_API_KEY`
- ✅ NextAuth uses `NEXTAUTH_URL` and `NEXTAUTH_SECRET`

### 3. Build Configuration
- ✅ `next.config.js` uses `NEXT_PUBLIC_API_URL` for rewrites
- ✅ `package.json` has `build:vercel:web` script
- ✅ Standalone output mode configured

## Vercel Dashboard Settings

### Project Configuration

| Setting | Value |
|---------|-------|
| **Root Directory** | `apps/web` |
| **Framework Preset** | Next.js (auto-detected) |
| **Build Command** | `npm run build:vercel:web` |
| **Output Directory** | `.next` (auto-detected) |
| **Install Command** | `npm install` (auto) |

### Environment Variables (Set in Vercel Dashboard)

#### Required (Production)

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.railway.app
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret
```

#### Optional

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_TRAVELPAYOUTS_MARKER=613624
```

## Deployment Steps

### 1. Connect Repository
- [ ] Go to https://vercel.com/new
- [ ] Import `Devhypertech/aigroupgepanda` repository
- [ ] Authorize GitHub access

### 2. Configure Project
- [ ] Set **Root Directory** to `apps/web`
- [ ] Verify **Framework Preset** is Next.js
- [ ] Set **Build Command** to `npm run build:vercel:web`
- [ ] Leave **Output Directory** as `.next` (auto)

### 3. Set Environment Variables
- [ ] Add `NEXT_PUBLIC_API_URL` (your deployed API URL)
- [ ] Add `NEXT_PUBLIC_STREAM_API_KEY`
- [ ] Add `NEXTAUTH_URL` (will be set after first deploy)
- [ ] Add `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- [ ] Add optional variables if needed

### 4. Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Note the deployment URL

### 5. Update NEXTAUTH_URL
- [ ] After first deploy, copy your Vercel URL
- [ ] Update `NEXTAUTH_URL` in Vercel environment variables
- [ ] Redeploy

## Post-Deployment Verification

### API Connectivity
- [ ] Open browser console
- [ ] Check for API connection errors
- [ ] Verify `NEXT_PUBLIC_API_URL` is correct
- [ ] Test API health endpoint: `https://your-app.vercel.app/api/healthz`

### Authentication
- [ ] Test login flow
- [ ] Test signup flow
- [ ] Verify session persistence
- [ ] Check for NextAuth errors

### Features
- [ ] Test chat functionality
- [ ] Test feed loading
- [ ] Test product search
- [ ] Test hotel search
- [ ] Test checkout flow

### CORS Issues
- [ ] Check browser console for CORS errors
- [ ] Verify API server allows Vercel domain
- [ ] Update API CORS settings if needed

## Common Issues & Solutions

### Issue: Build fails with "Cannot find module @gepanda/shared"
**Solution:** Ensure `build:vercel:web` includes `npm run build:shared`

### Issue: API calls fail with "Failed to fetch"
**Solution:** 
1. Check `NEXT_PUBLIC_API_URL` is set correctly
2. Verify API server is deployed and accessible
3. Check API server CORS configuration
4. Redeploy after changing env vars

### Issue: Environment variables not working
**Solution:**
- `NEXT_PUBLIC_*` vars are embedded at build time
- Must redeploy after changing them
- Use Vercel's "Redeploy" button

### Issue: NextAuth redirects to wrong URL
**Solution:**
- Set `NEXTAUTH_URL` to your Vercel deployment URL
- Include protocol: `https://your-app.vercel.app`
- Redeploy after changing

## Files Modified for Vercel

1. **`apps/web/app/api/chat/ui/event/route.ts`**
   - Updated `getBaseUrl()` to handle Vercel URL detection

2. **`apps/web/app/(app)/chat/ChatPageClient.tsx`**
   - Updated error messages for production vs development
   - Removed hardcoded port references

3. **`apps/web/next.config.js`**
   - Already uses `NEXT_PUBLIC_API_URL` for rewrites ✅

4. **`apps/web/lib/config.ts`**
   - Already uses `NEXT_PUBLIC_API_URL` ✅

## Quick Reference

### Build Command
```bash
npm run build:vercel:web
```

### Environment Variables Template
```bash
# Copy to Vercel Dashboard → Environment Variables
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_STREAM_API_KEY=your_key
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_secret
```

### Verify Deployment
```bash
# Check deployment URL
curl https://your-app.vercel.app/api/healthz

# Check environment variables (in browser console)
console.log(process.env.NEXT_PUBLIC_API_URL)
```

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Monorepo Guide:** https://vercel.com/docs/monorepos
- **Environment Variables:** https://vercel.com/docs/environment-variables

