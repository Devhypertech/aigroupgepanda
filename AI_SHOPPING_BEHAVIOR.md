# AI Shopping Behavior - Real Products & Rich UI

## Summary

Updated AI shopping behavior to return real products from SerpAPI (Google Shopping) and Doba APIs, with rich UI cards for product display.

## Changes Made

### 1. Created Shop Product Search Service
**File**: `apps/api/src/services/shop/searchProducts.ts` (NEW)

- **Function**: `searchProducts(options: SearchProductsOptions): Promise<ShopProduct[]>`
- **Features**:
  - Tries SerpAPI Google Shopping first
  - Falls back to Doba API if SerpAPI returns no results
  - Normalizes products to consistent format: `{ id, title, price, currency, imageUrl, provider, merchant, url, source }`
  - Handles rate limits gracefully
  - Comprehensive logging with `[SHOP_SEARCH]` prefix

### 2. Updated Chat Responder
**File**: `apps/api/src/routes/chat.ts`

- **Shopping Intent Detection**:
  - Detects shopping keywords: `buy`, `purchase`, `find`, `price`, `best`, `cover`, `shoes`, `shirt`, `laptop`, `phone`, `headphones`, `watch`, `bag`, `jacket`, `dress`, `product`, `shop`, `shopping`, `store`, `amazon`, `ebay`, `walmart`, `target`, `cost`, `affordable`, `cheap`, `expensive`, `deal`, `discount`, `sale`, `compare`, `recommend`, `suggest`, `looking for`, `need`, `want to buy`
  - Triggers product search when intent detected

- **Product Search Integration**:
  - Calls `shopSearchProducts()` with user message as query
  - Limits results to 5 products
  - Returns structured UI with `product_list` type

- **Empty Results Handling**:
  - If no products found, asks 2 clarifying questions:
    1. What's your budget range?
    2. Do you have a preferred store or country?
  - Returns `cta_buttons` UI with quick action buttons

### 3. Response Format

**With Products Found:**
```json
{
  "text": "Here are 5 options I found. Want to know more about any of these? What's your budget?",
  "reply": "Here are 5 options I found. Want to know more about any of these? What's your budget?",
  "ui": {
    "type": "product_list",
    "items": [
      {
        "id": "product-1",
        "title": "Product Name",
        "subtitle": "Product description",
        "imageUrl": "https://example.com/image.jpg",
        "price": "99.99",
        "currency": "USD",
        "provider": "Amazon",
        "merchant": "Seller Name",
        "url": "https://example.com/product",
        "source": "serpapi_google_shopping",
        "action": {
          "type": "open_url",
          "payload": {
            "url": "https://example.com/product",
            "label": "View"
          }
        }
      }
    ],
    "buttons": [
      {
        "label": "Ask Follow-up",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "Tell me more about these products"
          }
        }
      }
    ]
  },
  "sessionId": "ai-user123"
}
```

**No Products Found:**
```json
{
  "text": "I couldn't find specific products for \"laptop\". To help you better, could you tell me:\n\n1. What's your budget range?\n2. Do you have a preferred store or country?",
  "reply": "I couldn't find specific products for \"laptop\". To help you better, could you tell me:\n\n1. What's your budget range?\n2. Do you have a preferred store or country?",
  "ui": {
    "type": "cta_buttons",
    "buttons": [
      {
        "label": "Set Budget",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "My budget is $100-200"
          }
        }
      },
      {
        "label": "Preferred Store",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "I prefer Amazon"
          }
        }
      }
    ]
  },
  "sessionId": "ai-user123"
}
```

## Product Actions

Each product in the `product_list` includes:
- **View**: Opens product URL in new tab (`open_url` action)
- **Buy**: Can be triggered via "Buy" button in ProductCard component (sends message: "Proceed with purchase of: <title> from <provider>")

## Logging

All product searches are logged with `[SHOP_SEARCH]` prefix:
```
[SHOP_SEARCH] Searching products: { query: "laptop", userId: "user123...", limit: 5 }
[SHOP_SEARCH] Trying SerpAPI Google Shopping...
[SHOP_SEARCH] ✅ SerpAPI found 5 products
```

Or if SerpAPI fails:
```
[SHOP_SEARCH] SerpAPI returned no results, trying Doba...
[SHOP_SEARCH] ✅ Doba found 3 products
```

## Rate Limit Handling

The service gracefully handles rate limits:
- Detects rate limit errors (429, "rate limit", "too many requests")
- Returns empty array instead of throwing error
- Logs warning: `[SHOP_SEARCH] Rate limit detected, returning empty results gracefully`

## Testing

### Test 1: Shopping Intent Detection
Send message: "I want to buy a laptop"

**Expected**:
- Shopping intent detected
- Product search triggered
- Returns products with `product_list` UI

### Test 2: No Products Found
Send message: "I want to buy a very specific obscure product that doesn't exist"

**Expected**:
- Product search returns empty array
- Returns clarifying questions with `cta_buttons` UI
- No fake links

### Test 3: Rate Limit Handling
If API rate limit is hit:

**Expected**:
- Service returns empty array
- Logs rate limit warning
- Returns clarifying questions (same as no products found)

## Files Created/Modified

### Created
- `apps/api/src/services/shop/searchProducts.ts` - Shop product search service

### Modified
- `apps/api/src/routes/chat.ts` - Added shopping intent detection and product search integration

## Next Steps

1. **Test with Real APIs**: Verify SerpAPI and Doba API calls work correctly
2. **Improve Intent Detection**: Consider using ML-based intent detection for better accuracy
3. **Add Product Filtering**: Filter by budget, category, etc. based on user preferences
4. **Cache Results**: Cache product search results to reduce API calls
5. **Add Product Details**: Include ratings, reviews, shipping info in product cards

