# Tool Error Handling Fix

## Summary

Fixed tool/action error handling so that when tools fail, the agent falls back to text responses instead of returning error messages. Also ensured default chat messages do NOT invoke tools unless user intent clearly matches.

## Problem

- Every message returned "I encountered an error processing your request"
- Tools (search_product, buy_now, agent routing) were failing and returning error responses
- No fallback to text responses when tools failed
- General messages like "Hi" were triggering tools unnecessarily

## Files Edited

### 1. `apps/api/src/routes/chat.ts`
- **Fixed**: `search_product` action now returns fallback text response instead of error
- **Fixed**: `buy_now` action now returns fallback text response instead of error
- **Fixed**: Agent routing now has proper error handling with fallback
- **Fixed**: Only routes to agents for EXPLICIT intents (shopping, travel, tracking, esim) with confidence > 0.5
- **Added**: Comprehensive error logging for all tool failures

### 2. `apps/api/src/services/agents/shoppingAgent.ts`
- **Fixed**: Product search errors now log details and fall through to general response
- **Fixed**: Checkout errors now log details and fall through to general response
- **Added**: Comprehensive error logging

### 3. `apps/api/src/services/agents/travelAgent.ts`
- **Fixed**: Flight search errors now log details and fall through to general response
- **Fixed**: Hotel search errors now log details and fall through to general response
- **Added**: Comprehensive error logging

## Error Handling Strategy

### Before
```typescript
catch (error) {
  return res.status(500).json({
    error: 'Failed to search products',
    message: error.message,
  });
}
```

### After
```typescript
catch (error) {
  console.error(`${logPrefix} ❌ Error handling search_product action:`, error);
  console.error(`${logPrefix} Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
  console.error(`${logPrefix} Error message: ${error instanceof Error ? error.message : String(error)}`);
  console.error(`${logPrefix} Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
  
  // Fallback: Return text response instead of error
  const fallbackText = 'I can help you search for products, but the product search tool is temporarily unavailable. Please try again in a moment, or ask me something else.';
  return res.json({
    text: fallbackText,
    reply: fallbackText,
    panel: undefined,
    data: undefined,
    ui: null,
  });
}
```

## Agent Routing Changes

### Before
```typescript
if (intentResult.intent !== 'general' && intentResult.confidence > 0.4) {
  // Route to agent
}
```

### After
```typescript
// Only route to agents for EXPLICIT intents (shopping, travel, tracking, esim)
// General messages should NOT trigger agents
const explicitIntents = ['shopping', 'travel', 'tracking', 'esim'];
const hasExplicitIntent = explicitIntents.includes(intentResult.intent) && intentResult.confidence > 0.5;

if (hasExplicitIntent) {
  try {
    // Route to agent
  } catch (error) {
    // Return fallback text response
    const fallbackText = 'I can help, but that tool is temporarily unavailable. Try a different request or ask me something else.';
    return res.json({
      text: fallbackText,
      reply: fallbackText,
      panel: undefined,
      data: undefined,
      ui: null,
    });
  }
}
```

## Tool Error Logging

All tool errors now log:
- Error type (constructor name)
- Error message
- Full stack trace
- Context (which tool failed, what parameters were used)

Example log output:
```
[CHAT_RESPOND] [req_1234567890] ❌ Error handling search_product action: Error: SERPAPI_API_KEY not configured
[CHAT_RESPOND] [req_1234567890] Error type: Error
[CHAT_RESPOND] [req_1234567890] Error message: SERPAPI_API_KEY not configured
[CHAT_RESPOND] [req_1234567890] Error stack: Error: SERPAPI_API_KEY not configured
    at searchShopping (serpApiShopping.ts:25)
    ...
```

## Fallback Response Format

All tool failures now return:
```json
{
  "text": "I can help, but that tool is temporarily unavailable. Try a different request or ask me something else.",
  "reply": "I can help, but that tool is temporarily unavailable. Try a different request or ask me something else.",
  "panel": undefined,
  "data": undefined,
  "ui": null
}
```

## Intent Detection Thresholds

### Agent Routing
- **Before**: `confidence > 0.4` for any non-general intent
- **After**: `confidence > 0.5` AND intent must be in `['shopping', 'travel', 'tracking', 'esim']`

### Product Search
- **Before**: Triggered on keywords like "want", "need", "find"
- **After**: Only triggers on explicit shopping keywords:
  - "buy", "purchase", "shop", "shopping"
  - "find product", "search product"
  - "where to buy", "best price"
  - "product" + ("find" | "search" | "buy")

## Testing

### Test 1: General Message (Should NOT trigger tools)
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi","userId":"test","sessionId":"test-session"}' \
  -v
```

**Expected**: AI text response, no tool calls, no errors

### Test 2: Shopping Intent (Tool should work or fallback gracefully)
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"I want to buy a laptop","userId":"test","sessionId":"test-session"}' \
  -v
```

**Expected**: 
- If SERPAPI_API_KEY set: Product search results
- If SERPAPI_API_KEY missing: Fallback text response (not error)

### Test 3: Action Handler (Tool should work or fallback gracefully)
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"action":{"type":"search_product","payload":{"query":"laptop"}},"userId":"test","sessionId":"test-session"}' \
  -v
```

**Expected**:
- If SERPAPI_API_KEY set: Product results
- If SERPAPI_API_KEY missing: Fallback text response (not error)

## Key Improvements

1. ✅ **No more error responses**: Tools return fallback text instead of errors
2. ✅ **Better logging**: All tool errors log type, message, and stack trace
3. ✅ **Stricter intent detection**: Only explicit intents trigger agents
4. ✅ **Graceful degradation**: Chat works even when tools fail
5. ✅ **User-friendly messages**: Fallback messages explain the issue clearly

## Next Steps

1. **Restart API server**: `npm run dev:api`
2. **Test with "Hi"**: Should return AI response, no tool calls
3. **Test with shopping query**: Should work or return fallback (not error)
4. **Check logs**: Should see detailed error logs if tools fail

