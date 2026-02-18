# Chat JSON Response Fix

## Summary

Fixed `/api/chat/respond` to **always return valid JSON** with proper Content-Type headers, and updated frontend to properly parse and display error messages.

## Problem

- Backend sometimes returned HTML error pages instead of JSON
- Frontend showed generic error message instead of parsing JSON error responses
- Response format inconsistent - sometimes missing `text` field
- Content-Type header not explicitly set

## Files Edited

### 1. `apps/api/src/routes/chat.ts`
- **Added**: Explicit `Content-Type: application/json` header at start of handler
- **Fixed**: All responses now include `text` field (required by frontend)
- **Fixed**: Error responses always return `{ error: { code, message, details? } }` format
- **Fixed**: Response validation fallback ensures `text` field is always present

### 2. `apps/web/app/(app)/chat/ChatPageClient.tsx`
- **Fixed**: Error handling now parses JSON error responses
- **Fixed**: Detects HTML error pages and shows helpful message
- **Fixed**: Displays error details from backend when available
- **Fixed**: Shows specific error messages instead of generic fallback

## Backend Response Format

### Success Response
```json
{
  "text": "AI response text",
  "reply": "AI response text (legacy)",
  "panel": "itinerary" | "hotels" | "flights" | "tripForm" | undefined,
  "data": { ... },
  "ui": { ... } | null
}
```

### Error Response
```json
{
  "error": {
    "code": "AUTH_ERROR" | "RATE_LIMIT" | "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR" | "INTERNAL_ERROR",
    "message": "Human-readable error message",
    "details": "Optional additional details"
  }
}
```

## Frontend Error Handling

### Before
```typescript
if (!chatResponse.ok) {
  const errorText = await chatResponse.text();
  // Always shows generic error message
  showToast('Failed to get AI response. Please try again.', 'error');
}
```

### After
```typescript
if (!chatResponse.ok) {
  // Try to parse JSON error response
  const contentType = chatResponse.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const errorData = await chatResponse.json();
    if (errorData.error) {
      errorMessage = errorData.error.message;
      errorDetails = errorData.error.details;
      // Show specific error message
    }
  } else {
    // Handle HTML error pages
    if (errorText.includes('<!DOCTYPE')) {
      errorMessage = 'The API server returned an HTML error page...';
    }
  }
  showToast(errorMessage, 'error');
}
```

## HTTP Status Codes

- **200 OK**: Success with `{ text, reply, panel, data, ui }`
- **400 Bad Request**: Validation error - `{ error: { code: "VALIDATION_ERROR", ... } }`
- **401 Unauthorized**: Auth error - `{ error: { code: "AUTH_ERROR", ... } }`
- **429 Too Many Requests**: Rate limit - `{ error: { code: "RATE_LIMIT", ... } }`
- **500 Internal Server Error**: Server error - `{ error: { code: "INTERNAL_ERROR", ... } }`
- **503 Service Unavailable**: Service down - `{ error: { code: "SERVICE_UNAVAILABLE", ... } }`

## Content-Type Headers

### Backend
- **Always sets**: `Content-Type: application/json` at start of handler
- **Never returns**: HTML error pages (all errors are JSON)

### Frontend
- **Checks**: `Content-Type` header before parsing
- **Handles**: Both JSON and HTML responses gracefully

## Error Code Classification

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_ERROR` | 401 | ZHIPU_API_KEY missing or invalid |
| `RATE_LIMIT` | 429 | AI service rate limit exceeded |
| `SERVICE_UNAVAILABLE` | 503 | AI service temporarily unavailable |
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Testing

### Test 1: Normal Message (Success)
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi","userId":"test","sessionId":"test-session"}' \
  -v
```

**Expected**: `200 OK` with `{ text: "...", reply: "...", ... }`

### Test 2: Missing API Key (Error)
```bash
# Remove ZHIPU_API_KEY from .env
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi","userId":"test","sessionId":"test-session"}' \
  -v
```

**Expected**: `401 Unauthorized` with `{ error: { code: "AUTH_ERROR", message: "..." } }`

### Test 3: Invalid Request (Error)
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v
```

**Expected**: `400 Bad Request` with `{ error: { code: "VALIDATION_ERROR", message: "..." } }`

## Key Improvements

1. ✅ **Always JSON**: Backend never returns HTML, always JSON
2. ✅ **Explicit Content-Type**: Header set at start of handler
3. ✅ **Consistent Format**: All responses include `text` field
4. ✅ **Structured Errors**: Error responses use `{ error: { code, message, details? } }` format
5. ✅ **Frontend Parsing**: Frontend properly parses and displays error messages
6. ✅ **Helpful Messages**: Error messages include details when available

## Next Steps

1. **Restart API server**: `npm run dev:api`
2. **Test with normal message**: Should return JSON with `text` field
3. **Test with error**: Should return JSON error with proper code
4. **Check frontend**: Should display specific error messages instead of generic ones

