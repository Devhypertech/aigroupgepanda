# Chat Connection Fix - Verification Steps

## What Was Fixed

1. **Database Migration**: Added missing columns (`url`, `imageUrl`, `publishedAt`, `contentSnippet`, `lens`, `whyThisMatters`) to `feed_items` table
2. **Error Handling**: Added graceful error handling in feed ingestion to prevent crashes

## Steps to Verify

### 1. Restart API Server
```bash
# Stop the current API server (Ctrl+C)
# Then restart:
cd apps/api
npm run dev
```

### 2. Check API is Running
- Open: http://localhost:3001/api/healthz
- Should return: `{ "status": "ok", ... }`

### 3. Test Chat Endpoints
- Open: http://localhost:3000/dev
- Test POST `/api/stream/token` with `{ "userId": "test", "username": "Test User" }`
- Test POST `/api/companion/channel` with `{ "userId": "test" }`
- Both should return 200 OK

### 4. Test Chat Page
- Open: http://localhost:3000/chat
- Should connect within 10 seconds
- No "Connection timed out" error

## Expected Results

✅ API starts without Prisma errors about missing `url` column
✅ Feed ingestion runs without errors
✅ Chat page connects successfully
✅ No "Connection timed out" messages

## If Still Not Working

1. Check API terminal for any errors
2. Check browser console (F12) for errors
3. Verify both API (port 3001) and Web (port 3000) are running
4. Check `.env` files have correct `DATABASE_URL`, `STREAM_API_KEY`, `STREAM_API_SECRET`
