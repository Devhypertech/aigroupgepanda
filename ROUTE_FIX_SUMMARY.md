# Route Fix Summary

## Files Edited

### 1. `apps/api/src/index.ts`
- **Added**: Critical route verification on startup
- **Added**: Better logging for route registration
- **Added**: Route tracking in `registeredRoutesList`
- **Changed**: Route loading now verifies `/api/stream` and `/api/companion` are registered

### 2. `apps/api/src/routes/companion.ts`
- **Fixed**: Schema validation to include optional `sessionId`
- **Fixed**: Proper handling of `sessionId` from validated data

## Route Map

### Pre-imported Routes (Registered First)
- ✅ `/api/rooms` → `roomsRouter`
- ✅ `/api/invites` → `invitesRouter`
- ✅ `/api/stream` → `streamRouter` (includes POST /token)
- ✅ `/api/ai` → `aiRouter`

### Dynamically Loaded Routes
- ✅ `/api/feed` → `feedRouter`
- ✅ `/api/products` → `productsRouter`
- ✅ `/api/checkout` → `checkoutRouter`
- ✅ `/api/orders` → `ordersRouter`
- ✅ `/api/channels` → `channelsRouter`
- ✅ `/api/companion` → `companionRouter` (includes POST /channel)
- ✅ `/api/chat` → `chatRouter`
- ✅ `/api/auth` → `authRouter`
- ✅ `/api/healthz` → `healthzRouter`
- ... and more

## Critical Endpoints

### POST /api/stream/token
- **File**: `apps/api/src/routes/stream.ts`
- **Body**: `{ userId: string, username: string }`
- **Returns**: `{ token: string, userId: string }`
- **Status**: ✅ Registered as pre-imported route

### POST /api/companion/channel
- **File**: `apps/api/src/routes/companion.ts`
- **Body**: `{ userId: string, sessionId?: string }`
- **Returns**: `{ channelId: string }` (e.g., `"ai-{userId}"`)
- **Status**: ✅ Registered as dynamically loaded route

## Testing

### Test POST /api/companion/channel

```bash
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123"}' \
  -v
```

**Expected Response:**
```json
{
  "channelId": "ai-test-user-123"
}
```

**With sessionId:**
```bash
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123","sessionId":"ai-test-user-123-1234567890-abc"}' \
  -v
```

**Expected Response:**
```json
{
  "channelId": "ai-test-user-123-1234567890-abc"
}
```

### Test POST /api/stream/token

```bash
curl -X POST http://localhost:3001/api/stream/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123","username":"Test User"}' \
  -v
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "test-user-123"
}
```

## Startup Logs

When the server starts, you should see:

```
📦 Loading routes...
✅ Health check route loaded
   ✓ Registered route: /api/ai
   ✓ Registered route: /api/invites
   ✓ Registered route: /api/rooms
   ✓ Registered route: /api/stream
   ✓ Registered route: /api/feed
   ...
   ✓ Registered route: /api/companion
   ...

✅ Routes loaded: X successful, 0 failed

📋 Registered Routes Summary:
   ✓ /api/ai
   ✓ /api/auth
   ✓ /api/chat
   ✓ /api/companion
   ✓ /api/stream
   ...

✅ All critical routes registered (/api/stream, /api/companion)
```

## Error Handling

### Missing userId
```bash
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response (400):**
```json
{
  "error": "Invalid request body",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["userId"],
      "message": "Required"
    }
  ]
}
```

### Invalid sessionId (doesn't start with ai-{userId})
```bash
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","sessionId":"invalid-session"}'
```

**Response (400):**
```json
{
  "error": "Invalid sessionId",
  "message": "SessionId must start with ai-{userId}"
}
```

## Verification

After starting the server, verify routes are registered:

1. **Check startup logs** - Should show `/api/companion` registered
2. **Check root endpoint** - `GET http://localhost:3001/` shows `registeredRoutes` array
3. **Test endpoint** - Use curl commands above

## Notes

- All routes return JSON (no HTML error pages)
- Validation errors return 400 with JSON details
- Server errors return 500 with JSON error message
- Routes are registered before server starts listening (await loadRoutes())

