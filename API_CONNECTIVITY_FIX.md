# API Connectivity Fix - Summary

## Changes Made

### Backend (`apps/api`)

1. **Added `/health` endpoint** (`apps/api/src/index.ts`)
   - Returns: `{ ok: true, service: "api", time: ISO_STRING }`
   - Accessible at: `http://localhost:4000/health`

2. **Updated CORS configuration** (`apps/api/src/index.ts`)
   - Added `http://localhost:3001` to allowed origins
   - Added `credentials: true` for cookie/auth support
   - Allows: `localhost:3000`, `localhost:3001`, `127.0.0.1:3000`, `127.0.0.1:3001`

3. **Changed default PORT** (`apps/api/src/index.ts`)
   - Changed from `3001` to `4000`
   - Logs: `🚀 API listening on 0.0.0.0:4000`
   - Health check URL logged on startup

### Frontend (`apps/web`)

4. **Updated API URL defaults** 
   - `apps/web/lib/config.ts`: Default changed to `http://localhost:4000`
   - `apps/web/app/api/auth/[...nextauth]/route.ts`: Default changed to `http://localhost:4000`

5. **Improved error handling**
   - `apps/web/app/(app)/feed/page.tsx`: Seed button shows detailed errors (status, URL, response)
   - `apps/web/app/onboarding/interests/page.tsx`: Interest save shows detailed errors
   - `apps/web/app/api/auth/[...nextauth]/route.ts`: Better error logging for signup

## Environment Variables

### Backend (`apps/api/.env`)
```env
PORT=4000  # Optional, defaults to 4000
DATABASE_URL=your_database_url
STREAM_API_KEY=your_stream_key
STREAM_API_SECRET=your_stream_secret
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STREAM_API_KEY=your_stream_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Testing

1. **Check API is running:**
   ```bash
   curl http://localhost:4000/health
   # Should return: {"ok":true,"service":"api","time":"2024-..."}
   ```

2. **Test from frontend:**
   - Visit `http://localhost:3000/feed`
   - Click "Seed Demo Feed" button
   - Check browser console for detailed error messages if it fails

3. **Test signup:**
   - Visit `http://localhost:3000/signup`
   - Click "Continue with Google"
   - Check browser console and server logs for errors

## Troubleshooting

### "Failed to fetch" error
- **Check API is running:** `curl http://localhost:4000/health`
- **Check CORS:** Verify `NEXT_PUBLIC_API_URL` matches API port
- **Check browser console:** Look for CORS errors or network errors

### Signup does nothing
- **Check NextAuth config:** Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- **Check API logs:** Look for `/auth/upsert` errors
- **Check browser console:** Look for NextAuth errors

### Seed button fails
- **Check API logs:** Look for `/api/feed/seed` errors
- **Check environment:** Ensure `NODE_ENV=development` or `ALLOW_FEED_SEED=true`
- **Check database:** Ensure `DATABASE_URL` is set and database is accessible

