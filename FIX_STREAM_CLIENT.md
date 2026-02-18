# Stream Chat Client Fix

## Problem
The Stream Chat server-side client was failing with:
- "Both secret and user tokens are not set"
- "Call connectUser or connectAnonymousUser before creating a channel"

## Root Cause
`StreamChat.getInstance()` can return a singleton instance that was created without the secret key, especially if the module was imported before environment variables were loaded.

## Fix Applied
Changed from:
```typescript
export const streamServerClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_SECRET);
```

To:
```typescript
export const streamServerClient = new StreamChat(STREAM_API_KEY, STREAM_SECRET);
```

This ensures a fresh instance is created with the secret key properly set.

## Next Steps
1. **Restart the API server** (stop with Ctrl+C, then `npm run dev`)
2. **Test again** at http://localhost:3000/test-chat-api
3. **Check API terminal** for the new debug logs showing API key/secret status

## Expected Result
After restart, the test page should show:
- ✅ Health check: 200 OK
- ✅ Token fetch: 200 OK (with token)
- ✅ Channel fetch: 200 OK (with channelId)

If it still fails, check:
- Environment variables are loaded (`STREAM_API_KEY` and `STREAM_API_SECRET` in `.env`)
- API terminal shows the debug logs with API key/secret status
- No errors about missing secret in the terminal
