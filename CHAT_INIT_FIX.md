# Chat Initialization Fix

## Issues Fixed

1. **CORS Configuration**: Updated to explicitly allow `http://localhost:3000` in development
2. **API URL Usage**: Frontend now uses `NEXT_PUBLIC_API_URL` directly
3. **Environment Variables**: Added `.env.example` for web app

## Changes Made

### 1. Backend CORS (`apps/api/src/index.ts`)
- Enhanced CORS to always allow `localhost:3000` in development
- Added better logging for blocked origins
- Added explicit methods and headers

### 2. Frontend API URL (`apps/web/app/(app)/chat/ChatPageClient.tsx`)
- Changed `API_BASE` to use `process.env.NEXT_PUBLIC_API_URL` directly
- Added development logging for API configuration
- Ensured all fetch calls use the correct API URL

### 3. Config Utility (`apps/web/lib/config.ts`)
- Added development logging for API URL
- Ensures `NEXT_PUBLIC_API_URL` is properly read

### 4. Environment Variables (`apps/web/.env.example`)
- Created example file with `NEXT_PUBLIC_API_URL=http://localhost:3001`

## Setup Instructions

### 1. Create `.env.local` in `apps/web/`

```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
```

### 2. Verify Backend is Running

```bash
cd apps/api
npm run dev
```

Check that you see:
```
🚀 API listening on 0.0.0.0:3001
🏥 Health check: http://localhost:3001/health
```

### 3. Test API Health

```bash
curl http://localhost:3001/api/healthz
```

Should return:
```json
{
  "ok": true,
  "checks": {
    "server": "ok",
    "db": "ok",
    ...
  }
}
```

### 4. Verify Frontend Configuration

Open browser console on `http://localhost:3000/chat` and look for:
```
[Chat] API Configuration: {
  API_URL: "http://localhost:3001",
  API_BASE: "http://localhost:3001",
  NEXT_PUBLIC_API_URL: "http://localhost:3001",
  windowLocation: "http://localhost:3000"
}
```

## Troubleshooting

### "Failed to fetch" Error

1. **Check API server is running:**
   ```bash
   curl http://localhost:3001/api/healthz
   ```

2. **Check environment variable:**
   ```bash
   # In apps/web/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. **Restart Next.js dev server** after changing `.env.local`:
   ```bash
   cd apps/web
   npm run dev
   ```

4. **Check CORS in browser console:**
   - Look for CORS errors
   - Check Network tab for failed requests
   - Verify request URL is correct

5. **Check backend logs** for CORS warnings:
   ```
   [CORS] Blocked origin: ...
   ```

### Port Conflicts

If port 3001 is already in use:
```bash
# Find process using port 3001
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # macOS/Linux

# Kill the process or change PORT in apps/api/.env
```

## Verification Checklist

- [ ] `apps/web/.env.local` exists with `NEXT_PUBLIC_API_URL=http://localhost:3001`
- [ ] Backend server running on port 3001
- [ ] `curl http://localhost:3001/api/healthz` returns OK
- [ ] Browser console shows correct API configuration
- [ ] No CORS errors in browser console
- [ ] Chat initializes without "Failed to fetch" error

