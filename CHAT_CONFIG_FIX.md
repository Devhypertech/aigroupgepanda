# Chat Configuration Fix - LLM Only Mode

## Summary

Fixed chat to work with just `ZHIPU_API_KEY` (LLM only), making shopping APIs optional. Product search now only triggers on explicit shopping queries, not general messages like "Hi".

## Files Edited

### 1. `apps/api/src/index.ts`
- **Added**: Comprehensive startup validation for all API keys
- **Added**: Clear warnings for missing keys
- **Added**: Separate sections for LLM (required) vs Shopping (optional)

### 2. `apps/api/src/routes/chat.ts`
- **Changed**: Product search only triggers on explicit shopping intent
- **Changed**: Shopping APIs checked before calling product search
- **Changed**: General messages like "Hi" no longer trigger product search

## Startup Validation

### LLM Configuration (Required for AI Chat)
```
🤖 Chat & AI Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ ZHIPU_API_KEY: Configured (abc123def4...)
   OR
   ⚠️  ZHIPU_API_KEY: Missing
      Chat will return fallback messages without AI responses
      Set ZHIPU_API_KEY in apps/api/.env to enable AI chat
```

### Shopping Features (Optional)
```
🛒 Shopping Features (Optional):
   ✅ SERPAPI_API_KEY: Configured (xyz789ghi0...)
   ✅ DOBA keys: Configured
   ✅ CROSSMINT_API_KEY: Configured (mno456pqr7...)
   OR
   ⚠️  SERPAPI_API_KEY: Missing (Google Shopping search disabled)
   ⚠️  DOBA keys: Missing (Doba product recommendations disabled)
   ⚠️  CROSSMINT_API_KEY: Missing (Checkout link creation disabled)

💡 Note: Chat works with just ZHIPU_API_KEY. Shopping features are optional.
```

## Product Search Behavior

### Before (Problem)
- Product search triggered on keywords like "want", "need", "find"
- "Hi" could trigger product search if it contained "i" (false positive)
- Shopping APIs called even when keys were missing
- Chat failed if shopping APIs errored

### After (Fixed)
- Product search only triggers on **explicit shopping intent**:
  - "buy", "purchase", "shop", "shopping"
  - "find product", "search product"
  - "show me products", "recommend product"
  - "where to buy", "best price", "compare prices"
  - "product" + ("find" | "search" | "buy")
- Shopping APIs checked before calling
- General messages like "Hi" go straight to LLM
- Shopping errors don't break chat

## Explicit Shopping Keywords

```typescript
const explicitShoppingKeywords = [
  'buy', 'purchase', 'shop', 'shopping',
  'find product', 'search product',
  'show me products', 'recommend product',
  'product search', 'where to buy',
  'best price', 'compare prices',
  'product review', 'buy now', 'add to cart'
];
```

## Example Behavior

### "Hi" (General Message)
- ✅ Goes directly to LLM
- ✅ No product search called
- ✅ Works with just `ZHIPU_API_KEY`

### "I want to buy a laptop" (Shopping Intent)
- ✅ Checks if shopping APIs available
- ✅ If available: calls product search
- ✅ If not available: lets LLM handle it normally
- ✅ Chat still works either way

### "Find product: iPhone 15" (Explicit Shopping)
- ✅ Always triggers product search (if APIs available)
- ✅ Returns product cards

## Configuration Requirements

### Minimum (Chat Works)
- ✅ `ZHIPU_API_KEY` - Required for AI responses
- ✅ `STREAM_API_KEY` - Required for chat channels
- ✅ `STREAM_API_SECRET` - Required for chat channels

### Optional (Shopping Features)
- ⚠️ `SERPAPI_API_KEY` - Google Shopping search
- ⚠️ `DOBA_PUBLIC_KEY` + `DOBA_PRIVATE_KEY` - Doba recommendations
- ⚠️ `CROSSMINT_API_KEY` - Checkout link creation

## Error Handling

### Missing ZHIPU_API_KEY
- Chat returns: "I'm here to help! However, AI features are not currently available..."
- Server still starts
- Chat endpoint still works (returns fallback message)

### Missing Shopping APIs
- Product search returns empty array
- Chat continues normally
- LLM handles shopping requests as text

### Shopping API Errors
- Errors logged but don't break chat
- Falls through to normal AI response
- User gets helpful AI response instead of error

## Testing

### Test 1: General Message (No Shopping)
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi","userId":"test","sessionId":"test-session"}' \
  -v
```

**Expected**: AI response, no product search called

### Test 2: Shopping Intent (With APIs)
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"I want to buy a laptop","userId":"test","sessionId":"test-session"}' \
  -v
```

**Expected**: Product search called (if SERPAPI_API_KEY set), or AI response (if not)

### Test 3: Shopping Intent (Without APIs)
```bash
# Remove SERPAPI_API_KEY from .env
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message":"I want to buy a laptop","userId":"test","sessionId":"test-session"}' \
  -v
```

**Expected**: AI response (no product search), chat still works

## Startup Logs

When server starts, you'll see:

```
🤖 Chat & AI Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ ZHIPU_API_KEY: Configured (abc123def4...)

🛒 Shopping Features (Optional):
   ⚠️  SERPAPI_API_KEY: Missing (Google Shopping search disabled)
   ⚠️  DOBA keys: Missing (Doba product recommendations disabled)
   ⚠️  CROSSMINT_API_KEY: Missing (Checkout link creation disabled)

💡 Note: Chat works with just ZHIPU_API_KEY. Shopping features are optional.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Health Check Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Server: ✅ OK
   Zhipu AI: ✅ Configured
   Shopping APIs: ⚠️  SerpAPI disabled | ⚠️  Crossmint disabled
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Key Improvements

1. ✅ **Chat works with just LLM** - No shopping keys required
2. ✅ **Product search is selective** - Only on explicit shopping queries
3. ✅ **Startup validation** - Clear warnings for missing keys
4. ✅ **Graceful degradation** - Shopping errors don't break chat
5. ✅ **Better keyword detection** - Avoids false positives on "Hi"

## Next Steps

1. **Restart API server**: `npm run dev:api`
2. **Check startup logs** - Verify ZHIPU_API_KEY is configured
3. **Test with "Hi"** - Should work without calling shopping APIs
4. **Test with shopping query** - Should work even if shopping APIs missing

