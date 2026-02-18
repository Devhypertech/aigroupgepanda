# POST /api/companion/channel Endpoint

## Summary

The endpoint `POST /api/companion/channel` is now fully implemented with graceful handling of missing Stream API keys.

## Files Edited

1. **`apps/api/src/routes/companion.ts`**
   - Added Stream keys availability check
   - Returns channelId even if Stream keys are missing (idempotent)
   - Logs warning when Stream keys are not configured
   - Handles Stream errors gracefully - still returns channelId

## Endpoint Specification

### Request
```http
POST /api/companion/channel
Content-Type: application/json

{
  "userId": "string"  // Required
}
```

### Response (Success - Stream keys available)
```json
{
  "channelId": "ai-{userId}"
}
```

### Response (Success - Stream keys missing)
```json
{
  "channelId": "ai-{userId}",
  "warning": "Stream API keys not configured - channel not created in Stream"
}
```

### Response (Success - Stream error, but idempotent)
```json
{
  "channelId": "ai-{userId}",
  "warning": "Stream channel creation failed - channelId returned anyway",
  "error": "Error message"
}
```

### Response (Error - Invalid input)
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

## Behavior

### 1. Input Validation
- Validates `userId` is a non-empty string
- Validates `sessionId` (optional) starts with `ai-{userId}` for security

### 2. Channel ID Generation
- Uses provided `sessionId` if present
- Otherwise generates `ai-${userId}`

### 3. Stream Channel Creation (if keys available)
- Creates or retrieves messaging channel with id = `channelId`
- Ensures members include:
  - `userId` (the user)
  - `gepanda_ai` (AI companion)
- Idempotent: safe to call multiple times

### 4. Graceful Degradation (if keys missing)
- Logs warning: `⚠️ Stream API keys not configured`
- Still returns `channelId` (idempotent behavior)
- Frontend can continue without Stream

### 5. Error Handling
- Stream errors don't prevent response
- Always returns `channelId` (idempotent)
- Logs errors for debugging

## Test Commands

### Test with Stream keys configured
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

### Test with Stream keys missing
```bash
# Remove STREAM_API_KEY and STREAM_API_SECRET from .env
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-123"}' \
  -v
```

**Expected Response (200):**
```json
{
  "channelId": "ai-test-user-123",
  "warning": "Stream API keys not configured - channel not created in Stream"
}
```

### Test with invalid userId
```bash
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v
```

**Expected Response (400):**
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

### Test with custom sessionId
```bash
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","sessionId":"ai-test-user-1234567890-abc"}' \
  -v
```

**Expected Response (200):**
```json
{
  "channelId": "ai-test-user-1234567890-abc"
}
```

## Implementation Details

### Stream Channel Creation Flow

1. **Check Stream Keys**
   ```typescript
   const hasStreamKeys = !!(process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET);
   ```

2. **If Keys Missing**
   - Log warning
   - Return channelId immediately
   - Skip Stream operations

3. **If Keys Available**
   - Create/get channel: `streamServerClient.channel('messaging', channelId)`
   - Try to watch (channel exists)
   - If not found, create channel
   - Ensure members: `channel.addMembers([userId, 'gepanda_ai'])`
   - Return channelId

### Idempotent Behavior

The endpoint is **idempotent**:
- Can be called multiple times with same `userId`
- Always returns same `channelId`
- Safe to retry on errors
- Works even if Stream is unavailable

## Console Logs

### With Stream keys configured
```
[Companion] Creating/getting channel for userId: test-user-123, channelId: ai-test-user-123
[Companion] Channel watched successfully (45ms)
[Companion] Members added successfully (23ms)
[Companion] Total channel request time: 68ms
```

### Without Stream keys
```
[Companion] ⚠️  Stream API keys not configured. Returning channelId without creating Stream channel.
[Companion]    userId: test-user-123, channelId: ai-test-user-123
```

### On Stream error (but still returns channelId)
```
[Companion] Creating/getting channel for userId: test-user-123, channelId: ai-test-user-123
[Companion] Error creating/getting channel: Error: Connection timeout
[Companion] ⚠️  Stream operation failed, but returning channelId anyway (idempotent)
```

## Notes

- **Idempotent**: Always returns `channelId` regardless of Stream status
- **Graceful degradation**: Works without Stream keys
- **Security**: Validates `sessionId` starts with `ai-{userId}`
- **Error handling**: Stream errors don't prevent response
- **Logging**: Clear warnings when Stream is unavailable

