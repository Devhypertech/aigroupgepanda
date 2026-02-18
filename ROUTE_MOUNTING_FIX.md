# Route Mounting Fix Summary

## Issue
Frontend calls `POST http://localhost:3001/api/companion/channel` but backend returns 404.

## Investigation
Routes are correctly mounted:
- `app.use('/api/companion', companionRouter)` 
- `app.use('/api/stream', streamRouter)`

Router files define:
- `router.post('/channel', ...)` in `companion.ts`
- `router.post('/token', ...)` in `stream.ts`

So full paths should be:
- `/api/companion/channel` ✅
- `/api/stream/token` ✅

## Changes Made

### 1. Enhanced Route Logging
- Added router stack count logging to verify routes are registered
- Shows how many middleware/routes each router has

### 2. Debug Endpoint
- Added `GET /api/debug/routes` to list all registered routes
- Shows critical route status
- Lists all Express routes

### 3. Better 404 Handler
- Catch-all 404 handler returns JSON (not HTML)
- Shows available routes in error response
- Helps debug routing issues

## Files Edited

1. **`apps/api/src/index.ts`**
   - Enhanced route registration logging
   - Added `/api/debug/routes` endpoint
   - Added JSON 404 handler

## Route Map

### Pre-imported Routes (Registered First)
```
app.use('/api/stream', streamRouter)     → POST /api/stream/token
app.use('/api/ai', aiRouter)
app.use('/api/rooms', roomsRouter)
app.use('/api/invites', invitesRouter)
```

### Dynamically Loaded Routes
```
app.use('/api/companion', companionRouter) → POST /api/companion/channel
app.use('/api/chat', chatRouter)
app.use('/api/feed', feedRouter)
... and more
```

## Verification

### Check Routes Are Registered
```bash
curl http://localhost:3001/api/debug/routes
```

**Expected Response:**
```json
{
  "registeredRoutes": [
    "/api/ai",
    "/api/auth",
    "/api/chat",
    "/api/companion",
    "/api/stream",
    ...
  ],
  "criticalRoutes": {
    "/api/stream": true,
    "/api/companion": true
  }
}
```

### Test POST /api/companion/channel
```bash
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123"}' \
  -v
```

**Expected Response (200):**
```json
{
  "channelId": "ai-test-user-123"
}
```

**If 404, Response:**
```json
{
  "error": "Route not found",
  "path": "/api/companion/channel",
  "method": "POST",
  "availableRoutes": ["/api/stream", "/api/companion", ...],
  "hint": "Check /api/debug/routes for detailed route information"
}
```

### Test POST /api/stream/token
```bash
curl -X POST http://localhost:3001/api/stream/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123","username":"Test User"}' \
  -v
```

**Expected Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "test-user-123"
}
```

## Startup Logs

When server starts, you should see:
```
📦 Loading routes...
✅ Health check route loaded
   ✓ Registered route: /api/stream (router has 3 middleware/routes)
   ✓ Registered route: /api/companion (router has 2 middleware/routes)
   ...

✅ Routes loaded: X successful, 0 failed

✅ All critical routes registered (/api/stream, /api/companion)
```

## Troubleshooting

### If Routes Still Return 404

1. **Check startup logs** - Verify routes are registered
2. **Check debug endpoint** - `GET /api/debug/routes`
3. **Check router stack** - Logs show router middleware count
4. **Check 404 response** - Shows available routes

### Common Issues

1. **Route not in registeredRoutesList** - Route loading failed silently
2. **Router has 0 middleware** - Router file not exporting correctly
3. **Path mismatch** - Frontend calling wrong path

## Notes

- All routes are mounted with `/api` prefix
- No compatibility mounts needed (routes already use `/api`)
- Routes are loaded BEFORE server starts listening
- 404 handler returns JSON (not HTML) for better debugging

