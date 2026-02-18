# Purchase Link / Checkout Action Flow

## Summary

Implemented purchase/checkout flow in chat that detects purchase intent, creates checkout intents, and returns "Purchase Link" buttons.

## Changes Made

### 1. Updated Checkout Intent Endpoint
**File**: `apps/api/src/routes/checkout.ts`

- **Enhanced POST /api/checkout/intent**:
  - **Simplified Format Support**: Accepts `{ userId, productUrl OR productId, quantity, currencyPreference, shippingCountry }`
  - **Crossmint Integration**: Uses Crossmint if configured and `productUrl` provided
  - **Mock URL Fallback**: Returns mock checkout URL if provider not connected
  - **Response**: `{ checkoutUrl, expiresAt }`

### 2. Updated Purchase Intent Handling
**File**: `apps/api/src/routes/chat.ts`

- **Enhanced Purchase Intent Detection**:
  - Detects phrases: "buy it", "proceed with purchase", "checkout", "complete purchase", etc.
  - Extracts product information from conversation messages
  - Tries to find product from saved product context if not in messages

- **Checkout Flow**:
  1. Extracts product URL/ID, quantity, currency, shipping country
  2. Calls `POST /api/checkout/intent` with extracted info
  3. Returns `cta_buttons` UI with "Purchase Link" button
  4. If no product found, asks AI to confirm item details

- **Enhanced Product Extraction**:
  - Added `productId` extraction
  - Added `shippingCountry` extraction
  - Improved URL and quantity detection

### 3. Frontend Support
**File**: `apps/web/components/chat/AssistantRenderer.tsx` (Already implemented)

- **cta_buttons UI Type**: Already supports rendering buttons with actions
- **Action Handling**: Supports `open_url`, `send_message`, `call_api` actions
- **Purchase Link Button**: Opens checkout URL in new tab

## Request/Response Format

### POST /api/checkout/intent

**Request:**
```json
{
  "userId": "user123",
  "productUrl": "https://example.com/product",
  "quantity": 1,
  "currencyPreference": "USD",
  "shippingCountry": "United States"
}
```

**OR:**
```json
{
  "userId": "user123",
  "productId": "product-123",
  "quantity": 2,
  "currencyPreference": "EUR"
}
```

**Response (Crossmint configured):**
```json
{
  "checkoutUrl": "https://checkout.crossmint.com/session/abc123",
  "expiresAt": "2024-06-01T12:00:00Z"
}
```

**Response (Mock - provider not connected):**
```json
{
  "checkoutUrl": "https://example.com/product?checkout=true&quantity=1&currency=USD&shipping=United%20States",
  "expiresAt": "2024-06-01T12:00:00Z"
}
```

### Chat Response with Purchase Link

**Response:**
```json
{
  "text": "Ready. Click Purchase Link to complete checkout.",
  "reply": "Ready. Click Purchase Link to complete checkout.",
  "ui": {
    "type": "cta_buttons",
    "buttons": [
      {
        "label": "Purchase Link",
        "action": {
          "type": "open_url",
          "payload": {
            "url": "https://checkout.crossmint.com/session/abc123"
          }
        }
      }
    ]
  },
  "sessionId": "ai-user123"
}
```

## Purchase Intent Detection

The system detects purchase intent from phrases like:
- "buy it"
- "proceed with purchase"
- "checkout"
- "complete purchase"
- "order it"
- "place an order"

## Product Information Extraction

The system extracts:
- **Product URL**: From conversation messages (last URL found)
- **Product ID**: From patterns like "product-id: abc123" or "id: abc123"
- **Quantity**: From patterns like "buy 2", "quantity: 3", "2x"
- **Currency**: Defaults to USD, can be extracted from price patterns
- **Shipping Country**: From patterns like "ship to [country]", "deliver to [country]"

## Flow Diagram

```
User: "buy it" / "proceed with purchase"
  ↓
Detect purchase intent
  ↓
Extract product info from messages/context
  ↓
Has product URL/ID?
  ├─ Yes → Call POST /api/checkout/intent
  │         ↓
  │       Crossmint configured?
  │         ├─ Yes → Create Crossmint checkout
  │         └─ No → Return mock URL
  │         ↓
  │       Return cta_buttons with "Purchase Link"
  │
  └─ No → Ask AI to confirm item details
```

## Testing

### Test 1: Purchase Intent with Product URL
Send message: "I want to buy it" (after showing products)

**Expected**:
- Purchase intent detected
- Product URL extracted from conversation
- Checkout intent created
- Returns "Purchase Link" button

### Test 2: Purchase Intent without Product
Send message: "buy it" (no products in conversation)

**Expected**:
- Purchase intent detected
- No product found
- AI asks to confirm item, quantity, shipping country

### Test 3: Mock Checkout URL
If Crossmint not configured:

**Expected**:
- Returns mock checkout URL: `{productUrl}?checkout=true&quantity=1&currency=USD`
- Button still works (opens product URL with checkout params)

## Files Created/Modified

### Modified
- `apps/api/src/routes/checkout.ts` - Enhanced `/api/checkout/intent` endpoint
- `apps/api/src/routes/chat.ts` - Updated purchase intent handling

### Frontend (Already Implemented)
- `apps/web/components/chat/AssistantRenderer.tsx` - Already supports `cta_buttons` UI type

## Next Steps

1. **Test with Real Crossmint**: Verify Crossmint checkout creation works
2. **Add Confirmation Step**: Ask user to confirm item, quantity, shipping before creating checkout
3. **Add Order Tracking**: Store checkout intents in database for tracking
4. **Add Payment Methods**: Support multiple payment preferences (card, PayPal, crypto)
5. **Add Shipping Address**: Collect and validate shipping addresses

