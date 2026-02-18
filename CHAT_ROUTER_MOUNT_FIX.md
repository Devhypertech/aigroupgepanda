# Chat Router Mount Fix

## Summary

Fixed POST /api/chat/respond by moving chat router to pre-imported routes and implementing a simple echo response that works immediately without LLM dependencies.

## Changes Made

### 1. Moved Chat Router to Pre-Imported Routes
**File**: `apps/api/src/index.ts`

- **Added import**: `import chatRouter from './routes/chat.js';`
- **Moved to pre-imported routers**: Added `{ name: 'chat', router: chatRouter, path: '/api/chat' }` to `preImportedRouters` array
- **Removed from dynamic loaders**: Removed chat from `routeLoaders` array (line 392)
- **Added to debug routes**: Added `/api/chat` to `criticalRoutes` in `/api/debug/routes` endpoint

### 2. Implemented Simple Echo Response
**File**: `apps/api/src/routes/chat.ts`

- **Early return for echo**: Added simple echo response right after validation
- **No LLM dependency**: Returns `{ text: "Echo: ${userMessage}", reply: "Echo: ${userMessage}", sessionId }` immediately
- **LLM code commented**: All LLM integration code is commented out for now

### 3. Request Validation
- **userId**: Required (validated by schema)
- **message**: Required (or messages array with content)
- **sessionId**: Optional, auto-generated as `ai-${userId}` if missing

### 4. Response Format
Returns:
```json
{
  "text": "Echo: hello",
  "reply": "Echo: hello",
  "sessionId": "ai-dev_user"
}
```

### 5. Health Endpoint
**GET /api/chat/health** already exists and returns:
```json
{
  "ok": true,
  "provider": "Zhipu GLM-4 Flash",
  "hasKey": false,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Bug Location

The bug was that the chat router was being loaded **dynamically** (async import), which could fail silently. By moving it to **pre-imported routes**, it's now loaded synchronously and guaranteed to be available.

## What Changed

1. **Router mounting**: Moved from dynamic loader to pre-imported routes
2. **Echo response**: Added simple echo that works immediately
3. **Validation**: Ensured userId and message are required
4. **SessionId generation**: Auto-generates if missing
5. **Debug routes**: Added /api/chat to critical routes list

## Frontend Verification

The frontend already:
- ✅ Calls `POST ${API_URL}/api/chat/respond` (not GET)
- ✅ Sends `Content-Type: application/json`
- ✅ Includes `message`, `userId`, `sessionId` in body
- ✅ Expects `{ text, reply, ... }` in response

## Testing

### Test 1: POST /api/chat/respond
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","userId":"dev_user","sessionId":"ai-dev_user"}'
```

**Expected Response (200 OK):**
```json
{
  "text": "Echo: hello",
  "reply": "Echo: hello",
  "sessionId": "ai-dev_user"
}
```

### Test 2: POST without sessionId (auto-generated)
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","userId":"dev_user"}'
```

**Expected Response (200 OK):**
```json
{
  "text": "Echo: hello",
  "reply": "Echo: hello",
  "sessionId": "ai-dev_user"
}
```

### Test 3: GET /api/chat/health
```bash
curl http://localhost:3001/api/chat/health
```

**Expected Response (200 OK):**
```json
{
  "ok": true,
  "provider": "Zhipu GLM-4 Flash",
  "hasKey": false,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test 4: GET /api/debug/routes
```bash
curl http://localhost:3001/api/debug/routes
```

**Expected**: `/api/chat` appears in `registeredRoutes` and `criticalRoutes`

## Next Steps

1. **Restart API server**: `npm run dev:api`
2. **Test endpoint**: Should return echo response immediately
3. **Check frontend**: Chat should display "Echo: [message]" instead of error
4. **Uncomment LLM code**: When ZHIPU_API_KEY is configured, uncomment the LLM integration code

