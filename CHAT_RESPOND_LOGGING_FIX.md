# Chat Respond Logging and Error Handling Fix

## Summary

Added comprehensive logging and proper error handling to `POST /api/chat/respond` to identify the root cause of errors.

## Files Edited

### 1. `apps/api/src/routes/chat.ts`
- **Added**: Request logging with redacted secrets
- **Added**: Request ID for tracking
- **Added**: Provider logging (Zhipu AI)
- **Added**: Upstream response logging
- **Added**: Full stack trace logging
- **Changed**: Error responses now return proper JSON with error codes
- **Changed**: HTTP status codes (400/401/429/500/503) based on error type

### 2. `apps/api/src/services/ai/zhipu.ts`
- **Added**: Comprehensive API call logging
- **Added**: Request/response logging with redacted tokens
- **Added**: Error details logging
- **Added**: Network error detection

## Logging Format

### Request Logging
```
[CHAT_RESPOND] [req_1234567890_abc123] ========================================
[CHAT_RESPOND] [req_1234567890_abc123] Request received
[CHAT_RESPOND] [req_1234567890_abc123] Method: POST
[CHAT_RESPOND] [req_1234567890_abc123] Path: /api/chat/respond
[CHAT_RESPOND] [req_1234567890_abc123] Headers: { ... }
[CHAT_RESPOND] [req_1234567890_abc123] Request body: { ... }
[CHAT_RESPOND] [req_1234567890_abc123] Validated input: { ... }
```

### AI Call Logging
```
[CHAT_RESPOND] [req_1234567890_abc123] Calling generateChatResponse...
[CHAT_RESPOND] [req_1234567890_abc123] Provider: Zhipu AI
[CHAT_RESPOND] [req_1234567890_abc123] Message: "Hello..."
[CHAT_RESPOND] [req_1234567890_abc123] Recent messages count: 5
[CHAT_RESPOND] [req_1234567890_abc123] UI Mode: false

[ZHIPU_AI] ========================================
[ZHIPU_AI] Calling Zhipu AI API
[ZHIPU_AI] URL: https://open.bigmodel.cn/api/paas/v4/chat/completions
[ZHIPU_AI] Model: glm-4-flash
[ZHIPU_AI] Messages count: 3
[ZHIPU_AI] API Key: abc123def4...
[ZHIPU_AI] Request body: { ... }
[ZHIPU_AI] Response received (1234ms):
[ZHIPU_AI] Status: 200 OK
[ZHIPU_AI] Headers: { ... }
[ZHIPU_AI] ✅ Response parsed successfully
[ZHIPU_AI] ========================================
```

### Error Logging
```
[CHAT_RESPOND] [req_1234567890_abc123] ❌ ERROR in /respond (1234ms):
[CHAT_RESPOND] [req_1234567890_abc123] Error type: Error
[CHAT_RESPOND] [req_1234567890_abc123] Error message: Zhipu API error: 401
[CHAT_RESPOND] [req_1234567890_abc123] Full error object: { ... }
[CHAT_RESPOND] [req_1234567890_abc123] Error stack trace:
[CHAT_RESPOND] [req_1234567890_abc123]   at callZhipuAI (...)
[CHAT_RESPOND] [req_1234567890_abc123]   at generateChatResponse (...)
[CHAT_RESPOND] [req_1234567890_abc123] ========================================
```

## Error Response Format

### Before (Generic HTML/Text)
```json
{
  "text": "I apologize, but I encountered an error. Please try again.",
  "ui": null
}
```

### After (Structured JSON)
```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "AI service authentication failed",
    "details": "ZHIPU_API_KEY is missing or invalid"
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `AUTH_ERROR` | 401 | AI service authentication failed |
| `RATE_LIMIT` | 429 | AI service rate limit exceeded |
| `SERVICE_UNAVAILABLE` | 503 | AI service temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## What Gets Logged

### Request Information
- ✅ Request method and path
- ✅ Request headers (redacted user IDs)
- ✅ Request body (redacted secrets: apiKey, token, secret)
- ✅ Validated input fields

### Provider Information
- ✅ Provider name (Zhipu AI)
- ✅ API URL
- ✅ Model name
- ✅ API key status (first 10 chars only)

### Upstream Response
- ✅ Response status code
- ✅ Response headers
- ✅ Response body (redacted tokens)
- ✅ Response time

### Error Information
- ✅ Error type (Error class name)
- ✅ Error message
- ✅ Full stack trace
- ✅ Upstream response details (if available)
- ✅ Request duration

## Testing

After restarting the server, check the terminal logs when calling `/api/chat/respond`. You should see:

1. **Request received** - Shows request details
2. **Provider info** - Shows Zhipu AI configuration
3. **API call** - Shows Zhipu API request/response
4. **Error details** - If error occurs, shows full stack trace

## Next Steps

1. **Restart API server**: `npm run dev:api`
2. **Make a test request** to `/api/chat/respond`
3. **Check terminal logs** for `[CHAT_RESPOND]` and `[ZHIPU_AI]` prefixes
4. **Identify the root cause** from the detailed error logs
5. **Share the error logs** to fix the underlying issue

## Example Error Scenarios

### Missing API Key
```
[CHAT_RESPOND] [req_...] ❌ Error calling generateChatResponse:
[CHAT_RESPOND] [req_...] Error message: Zhipu API error: 401
[CHAT_RESPOND] [req_...] 🔑 Authentication error - ZHIPU_API_KEY may be missing or invalid
```
**Response:** 401 with `AUTH_ERROR` code

### Network Error
```
[ZHIPU_AI] ❌ ERROR calling Zhipu AI:
[ZHIPU_AI] Error message: fetch failed
[ZHIPU_AI] 🌐 Network error - cannot reach Zhipu API
```
**Response:** 503 with `SERVICE_UNAVAILABLE` code

### Rate Limit
```
[ZHIPU_AI] Status: 429 Too Many Requests
[CHAT_RESPOND] [req_...] ⚠️  Rate limit error
```
**Response:** 429 with `RATE_LIMIT` code

