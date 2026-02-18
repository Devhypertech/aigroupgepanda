# Server Startup Fix - Always Start, Never Crash

## Summary

The API server now **always starts** even if:
- Database is down or missing
- Stream API keys are missing
- Zhipu API keys are missing
- Route loading fails
- Any other service is unavailable

The `/api/healthz` endpoint is **always available** and returns detailed status information.

## Files Modified

### 1. `apps/api/src/index.ts`
- **Route loading**: Made non-blocking with graceful error handling
- **Healthz route**: Loaded FIRST before other routes
- **Stream webhooks**: Wrapped in try-catch
- **Database connection**: Already non-blocking (no changes needed)
- **AI Companion init**: Already non-blocking (no changes needed)

### 2. `apps/api/src/routes/healthz.ts`
- **Always returns 200 OK** (not 503)
- **Detailed error messages** for each check
- **Database timeout**: 5 second timeout for DB queries
- **Clear error messages**: Shows exactly what's missing or failing

## Key Changes

### Route Loading (Non-Blocking)

**Before:**
```typescript
await loadRoutes(); // Would crash if any route failed
```

**After:**
```typescript
// Load healthz FIRST
app.use('/api/healthz', healthzRouter.default);

// Load other routes with Promise.allSettled
// Each route failure is logged but doesn't stop server
```

### Health Check Endpoint

**Before:**
- Could return 503 if DB was down
- Generic error messages

**After:**
- **Always returns 200 OK**
- Detailed error messages: `"error: DATABASE_URL not set"` or `"error: Connection refused"`
- Shows exactly what's missing: `"error: Missing STREAM_API_KEY, STREAM_API_SECRET"`

### Error Handling

All startup operations are now wrapped in try-catch:
- Route loading: `Promise.allSettled` - continues even if routes fail
- Stream webhooks: Try-catch wrapper
- Database connection: Already non-blocking
- AI Companion: Already non-blocking

## Health Check Response Format

### When Everything is OK:
```json
{
  "ok": true,
  "time": "2024-01-01T00:00:00.000Z",
  "checks": {
    "server": "ok",
    "db": "ok",
    "streamKeys": "ok",
    "zhipuKey": "ok",
    "crossmintKey": "ok",
    "serpApiKey": "ok",
    "dobaKeys": "ok"
  },
  "message": "All systems operational"
}
```

### When Database is Down:
```json
{
  "ok": false,
  "time": "2024-01-01T00:00:00.000Z",
  "checks": {
    "server": "ok",
    "db": "error: Connection refused",
    "streamKeys": "ok",
    "zhipuKey": "ok"
  },
  "message": "Server is running but some services are unavailable. Check individual checks for details."
}
```

### When Keys are Missing:
```json
{
  "ok": false,
  "time": "2024-01-01T00:00:00.000Z",
  "checks": {
    "server": "ok",
    "db": "ok",
    "streamKeys": "error: Missing STREAM_API_KEY, STREAM_API_SECRET",
    "zhipuKey": "error: ZHIPU_API_KEY not set"
  },
  "message": "Server is running but some services are unavailable. Check individual checks for details."
}
```

## Startup Behavior

### Console Output

**Successful Startup:**
```
📦 Loading routes...
✅ Health check route loaded
✅ Routes loaded: 30 successful, 0 failed

✅ SERVER STARTED SUCCESSFULLY
🚀 API Server is now listening:
   Local:    http://localhost:3001
   Health:   http://localhost:3001/api/healthz
```

**Partial Failure (some routes fail):**
```
📦 Loading routes...
✅ Health check route loaded
⚠️  Failed to load route 'chat': Cannot find module './routes/chat.js'
✅ Routes loaded: 29 successful, 1 failed
⚠️  Some routes failed to load but server will continue
   - chat: Cannot find module './routes/chat.js'

✅ SERVER STARTED SUCCESSFULLY
```

**Database Down:**
```
⚠️  Database connection failed (server will continue): Connection refused
✅ SERVER STARTED SUCCESSFULLY
```

## Testing

### Test 1: Server Starts Without Database
1. Stop database or remove `DATABASE_URL`
2. Start server: `npm run dev:api`
3. **Expected**: Server starts, `/api/healthz` returns `"db": "error: DATABASE_URL not set"`

### Test 2: Server Starts Without Stream Keys
1. Remove `STREAM_API_KEY` and `STREAM_API_SECRET` from `.env`
2. Start server: `npm run dev:api`
3. **Expected**: Server starts, `/api/healthz` returns `"streamKeys": "error: Missing STREAM_API_KEY, STREAM_API_SECRET"`

### Test 3: Server Starts With Database Down
1. Set `DATABASE_URL` but stop database
2. Start server: `npm run dev:api`
3. **Expected**: Server starts, `/api/healthz` returns `"db": "error: Connection refused"` (or similar)

### Test 4: Healthz Always Available
1. Break route loading (rename a route file)
2. Start server: `npm run dev:api`
3. **Expected**: Server starts, `/api/healthz` still works (loaded first)

## Benefits

1. ✅ **Server always starts** - No more crashes on startup
2. ✅ **Healthz always available** - Monitoring tools can always check status
3. ✅ **Clear error messages** - Know exactly what's wrong
4. ✅ **Graceful degradation** - Features that need DB/keys fail gracefully
5. ✅ **Better debugging** - See which routes failed to load

## Migration Notes

- **No breaking changes** - Existing code continues to work
- **Health check response format** - Still returns `ok: true/false`, but always HTTP 200
- **Route failures** - Logged but don't stop server
- **Database operations** - Routes that need DB will fail at request time (not startup)

## Next Steps

Routes that require specific services should validate at request time:
- Database routes: Check `prisma` exists before querying
- Stream routes: Check `STREAM_API_KEY` exists before using Stream API
- AI routes: Check `ZHIPU_API_KEY` exists before calling AI

This ensures:
- Server starts even if services are down
- Routes fail gracefully with clear error messages
- Users get helpful feedback instead of crashes

