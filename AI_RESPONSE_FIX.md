# AI Response Fix - Direct API Call

## Problem
AI was not responding to user messages. The system was relying on Stream webhooks, which may not be configured or may be unreliable.

## Solution
**Changed the frontend to call the AI API directly** after sending a message, instead of relying solely on webhooks.

## Changes Made

### 1. Frontend (`apps/web/app/page.tsx`)
- **Added direct API call** after sending message to Stream
- Calls `/api/ai/message` endpoint immediately after `channel.sendMessage()`
- This ensures AI responds even if webhooks aren't configured
- Falls back gracefully if API call fails (webhook might still work)

```typescript
// After sending message to Stream
await channel.sendMessage({ text, user_id: userId });

// Trigger AI response directly (more reliable than webhooks)
const aiResponse = await fetch(`${API_URL}/api/ai/message`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, channelId, text }),
});
```

### 2. Backend API Route (`apps/api/src/routes/ai.ts`)
- **Fixed AI user ID constant** - now uses `AI_COMPANION_USER_ID` instead of hardcoded string
- **Added comprehensive logging** for debugging
- **Added error handling** with fallback responses
- **Validates response** before sending to Stream

### 3. Webhook Handler (`apps/api/src/services/stream/webhooks.ts`)
- **Improved logging** to see if webhooks are being received
- Better error messages with context
- Still works as backup if frontend API call fails

## How It Works Now

1. **User sends message** → Frontend sends to Stream channel
2. **Frontend immediately calls** `/api/ai/message` endpoint
3. **Backend processes** message with AI agent
4. **Backend posts AI response** to Stream channel as `gepanda-ai` user
5. **Frontend receives** new message via Stream's `message.new` event
6. **Message appears** in chat UI

## Debugging

If AI still doesn't respond, check:

### 1. Check Server Logs
Look for these log messages:

**✅ Good signs:**
```
[AI Message] Request received: { channelId: 'user-xxx', userId: 'xxx', textLength: 10 }
[AI Message] Calling processMessage...
[AI Message] processMessage completed: { intent: 'travel.plan', responseLength: 150 }
[AI Message] Success - posted to channel in 2500 ms
```

**❌ Problems:**
```
ZHIPU_API_KEY not set - AI features will not work
```
→ **Fix**: Set `ZHIPU_API_KEY` environment variable

```
[AI Message] processMessage failed: Error: ...
```
→ **Fix**: Check the error message for details

```
[AI Message] Error sending AI message to Stream: ...
```
→ **Fix**: Check Stream API credentials (`STREAM_API_KEY`, `STREAM_API_SECRET`)

### 2. Check Browser Console
Open browser DevTools (F12) and check Console tab:

**✅ Good signs:**
```
AI response received: { intent: 'travel.plan', ... }
```

**❌ Problems:**
```
Error calling AI API: Failed to fetch
```
→ **Fix**: Check `NEXT_PUBLIC_API_URL` is correct and API server is running

```
AI response failed: 500 Internal Server Error
```
→ **Fix**: Check server logs for the actual error

### 3. Test API Endpoint Directly
Use curl or Postman to test:

```bash
curl -X POST http://localhost:3001/api/ai/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "channelId": "user-test-user",
    "text": "Hello"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "AI reply posted to channel",
  "text": "Hello! I'm GePanda...",
  "intent": "general.chat",
  "duration": 2500
}
```

### 4. Check Environment Variables

**Required:**
- `STREAM_API_KEY` - Stream Chat API key
- `STREAM_API_SECRET` - Stream Chat API secret

**Optional (but needed for AI):**
- `ZHIPU_API_KEY` - Zhipu AI API key (required for AI responses)

**Frontend (NEXT_PUBLIC_*):**
- `NEXT_PUBLIC_STREAM_API_KEY` - Must match `STREAM_API_KEY`
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., `http://localhost:3001`)

### 5. Verify Stream Channel Setup
Check that:
- Channel is created successfully
- User is added as member
- AI Companion user (`gepanda-ai`) exists in Stream

## Common Issues

### Issue: "ZHIPU_API_KEY not set"
**Symptom**: AI responds with "AI features are not currently available"
**Fix**: Set `ZHIPU_API_KEY` in environment variables

### Issue: "Failed to fetch" in browser
**Symptom**: Browser console shows network error
**Fix**: 
- Check `NEXT_PUBLIC_API_URL` is correct
- Check API server is running
- Check CORS settings

### Issue: "Error sending AI message to Stream"
**Symptom**: Server logs show Stream API error
**Fix**:
- Verify `STREAM_API_KEY` and `STREAM_API_SECRET` are correct
- Check AI Companion user is initialized
- Check channel permissions

### Issue: Messages sent but no response
**Symptom**: User message appears, but no AI response
**Fix**:
1. Check server logs for errors
2. Check browser console for API call errors
3. Verify `ZHIPU_API_KEY` is set
4. Test API endpoint directly

## Testing Checklist

- [ ] API server is running on correct port
- [ ] `ZHIPU_API_KEY` is set in environment
- [ ] `STREAM_API_KEY` and `STREAM_API_SECRET` are set
- [ ] `NEXT_PUBLIC_API_URL` points to correct API server
- [ ] Browser console shows no errors
- [ ] Server logs show `[AI Message] Request received`
- [ ] Server logs show `[AI Message] Success - posted to channel`
- [ ] AI response appears in chat UI

## Next Steps

If still not working:
1. Check all logs (server + browser)
2. Test API endpoint directly with curl
3. Verify all environment variables
4. Check Stream dashboard for channel/message status
5. Verify Zhipu API key is valid and has credits

