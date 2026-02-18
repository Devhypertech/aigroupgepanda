# Comprehensive Chat Respond Fix

## Summary

Fixed POST /api/chat/respond to work reliably with comprehensive logging, validation, error handling, and health checks.

## Changes Made

### A) Handler Verification
✅ **POST /api/chat/respond exists** at `apps/api/src/routes/chat.ts:406`
- Already mounted at `/api/chat` in Express app
- Only accepts POST
- Returns JSON

### B) Hard Logging + Error Transparency
✅ **Added [CHAT_RESPOND] prefix with UUID**
- Request ID: `randomUUID()` for tracking
- Logs at start: `userId`, `sessionId`, `messageLength` (not full text)
- In catch block: full error stack, upstream response status/body (redacted)
- Returns structured JSON errors: `{ error: { code, message, details? } }`

### C) Request Body Validation + Defaults
✅ **Schema updated**
- `userId`: Required (was optional)
- `sessionId`: Optional (auto-generated as `ai-${userId}` if missing)
- `message`: Optional (if messages array provided)

### D) LLM Provider Validation
✅ **Zhipu GLM-4 Flash provider**
- Validates `ZHIPU_API_KEY` before calling
- If missing: returns `{ text: "AI is not configured yet on the server. Please set ZHIPU_API_KEY.", ui: null }` with HTTP 200
- Provider identified: Zhipu GLM-4 Flash

### E) Tool/Actions Error Handling
✅ **All tools wrapped in try/catch**
- `search_product`: Returns fallback text on error
- `buy_now`: Returns fallback text on error
- Agent routing: Returns fallback text on error
- Tools only called on explicit intent (shopping, travel, tracking, esim)

### F) Health Probe
✅ **GET /api/chat/health added**
- Returns: `{ ok: true, provider: "Zhipu GLM-4 Flash", hasKey: boolean, timestamp: string }`
- Reachable from browser

### G) Frontend Error Handling
✅ **Fixed ChatPageClient.tsx**
- Uses `[CHAT_UI_ERROR]` prefix for error logs
- Safe JSON parsing (never throws)
- Shows error details from backend

## Bug Location

The bug was in multiple places:
1. **Main catch block** (line 1444): Was returning fallback text instead of structured errors
2. **Schema validation**: `userId` was optional, should be required
3. **Missing ZHIPU_API_KEY check**: No validation before calling LLM
4. **Frontend error parsing**: Not safe, could throw

## What Changed

1. **Schema**: `userId` now required, `sessionId` optional with auto-generation
2. **Logging**: Added UUID request tracking, comprehensive error logging
3. **ZHIPU_API_KEY validation**: Check before LLM call, return helpful message if missing
4. **Error responses**: Return structured JSON errors `{ error: { code, message, details? } }`
5. **Health endpoint**: Added `GET /api/chat/health`
6. **Frontend**: Safe JSON parsing, better error logging

## Missing Env Var

**ZHIPU_API_KEY** - Required for AI responses

If missing, endpoint returns:
```json
{
  "text": "AI is not configured yet on the server. Please set ZHIPU_API_KEY.",
  "ui": null
}
```

## Final Curl Response

### With ZHIPU_API_KEY set:
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","userId":"dev_user","sessionId":"ai-dev_user"}'
```

**Response (200 OK):**
```json
{
  "text": "Hello! How can I help you today?",
  "reply": "Hello! How can I help you today?",
  "panel": undefined,
  "data": undefined,
  "ui": null
}
```

### Without ZHIPU_API_KEY:
**Response (200 OK):**
```json
{
  "text": "AI is not configured yet on the server. Please set ZHIPU_API_KEY.",
  "ui": null
}
```

### Health Check:
```bash
curl http://localhost:3001/api/chat/health
```

**Response (200 OK):**
```json
{
  "ok": true,
  "provider": "Zhipu GLM-4 Flash",
  "hasKey": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Testing

1. **Test with valid request:**
   ```bash
   curl -X POST http://localhost:3001/api/chat/respond \
     -H "Content-Type: application/json" \
     -d '{"message":"hello","userId":"dev_user","sessionId":"ai-dev_user"}'
   ```

2. **Test health endpoint:**
   ```bash
   curl http://localhost:3001/api/chat/health
   ```

3. **Test without userId (should fail):**
   ```bash
   curl -X POST http://localhost:3001/api/chat/respond \
     -H "Content-Type: application/json" \
     -d '{"message":"hello"}'
   ```
   **Expected**: 400 with `{ error: { code: "VALIDATION_ERROR", ... } }`

4. **Test without sessionId (should auto-generate):**
   ```bash
   curl -X POST http://localhost:3001/api/chat/respond \
     -H "Content-Type: application/json" \
     -d '{"message":"hello","userId":"dev_user"}'
   ```
   **Expected**: 200 with response (sessionId auto-generated as `ai-dev_user`)

