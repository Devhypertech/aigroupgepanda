# Rich UI Rendering in Chat

## Summary

Implemented rich UI rendering in the chat interface, supporting structured UI payloads for products, hotels, links, and CTA buttons.

## Changes Made

### 1. Created Product Card Component
**File**: `apps/web/components/chat/ProductCard.tsx` (NEW)

- **Features**:
  - Displays product image, title, subtitle, price, provider/merchant
  - Two action buttons: "View" (opens URL) and "Buy" (opens purchase URL or sends message)
  - Mobile responsive with flex layout
  - Error handling for missing images

### 2. Created Hotel Card Component
**File**: `apps/web/components/chat/HotelCard.tsx` (NEW)

- **Features**:
  - Displays hotel image, name, location (neighborhood/area), price per night, rating
  - "View" button to open hotel URL
  - Star rating display (★/☆)
  - Mobile responsive

### 3. Extended AssistantRenderer
**File**: `apps/web/components/chat/AssistantRenderer.tsx`

- **New UI Types Supported**:
  - `product_list`: Renders 3-6 product cards in a responsive grid
  - `hotel_list`: Renders up to 5 hotel cards in a responsive grid
  - `links`: Renders a list of clickable links
  - `cta_buttons`: Renders call-to-action buttons with actions

- **Action Handling**:
  - `open_url`: Opens URL in new tab
  - `send_message`: Sends message to chat (via handleUIEventCallback)
  - `call_api`: Triggers API call event

### 4. Updated ChatPageClient
**File**: `apps/web/app/(app)/chat/ChatPageClient.tsx`

- **Enhanced handleUIEventCallback**:
  - Handles `send_message` events by calling `handleSendMessage`
  - Uses ref to avoid circular dependency

- **Response Format Support**:
  - Accepts `{ text, ui }` format from backend
  - Stores UI as JSON string in message content
  - Falls back to plain text if no UI

## UI Format Specification

### Product List
```json
{
  "text": "Here are some products I found:",
  "ui": {
    "type": "product_list",
    "items": [
      {
        "id": "product-1",
        "title": "Product Name",
        "subtitle": "Product description",
        "imageUrl": "https://example.com/image.jpg",
        "price": 99.99,
        "currency": "USD",
        "provider": "Amazon",
        "merchant": "Seller Name",
        "url": "https://example.com/product",
        "action": {
          "type": "open_url",
          "payload": {
            "url": "https://example.com/purchase"
          }
        }
      }
    ]
  }
}
```

### Hotel List
```json
{
  "text": "Here are some hotels I found:",
  "ui": {
    "type": "hotel_list",
    "items": [
      {
        "id": "hotel-1",
        "title": "Hotel Name",
        "name": "Hotel Name",
        "neighborhood": "Downtown",
        "area": "City Center",
        "pricePerNight": 150,
        "price": 150,
        "currency": "USD",
        "rating": 4.5,
        "imageUrl": "https://example.com/hotel.jpg",
        "url": "https://example.com/hotel"
      }
    ]
  }
}
```

### Links
```json
{
  "text": "Here are some helpful links:",
  "ui": {
    "type": "links",
    "items": [
      {
        "title": "Link Title",
        "subtitle": "Link description",
        "url": "https://example.com",
        "action": {
          "type": "open_url",
          "payload": {
            "url": "https://example.com"
          }
        }
      }
    ]
  }
}
```

### CTA Buttons
```json
{
  "text": "What would you like to do?",
  "ui": {
    "type": "cta_buttons",
    "buttons": [
      {
        "label": "View Details",
        "action": {
          "type": "open_url",
          "payload": {
            "url": "https://example.com/details"
          }
        }
      },
      {
        "label": "Ask Follow-up",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "Tell me more about this"
          }
        }
      }
    ]
  }
}
```

## Testing

### Test 1: Product List
Send a message to the chat that triggers a product search. The backend should return:
```json
{
  "text": "I found these products for you:",
  "ui": {
    "type": "product_list",
    "items": [
      {
        "title": "Wireless Headphones",
        "subtitle": "Noise-cancelling Bluetooth headphones",
        "imageUrl": "https://via.placeholder.com/300",
        "price": 199.99,
        "currency": "USD",
        "provider": "Amazon",
        "url": "https://amazon.com/product"
      },
      {
        "title": "Smart Watch",
        "subtitle": "Fitness tracker with heart rate monitor",
        "imageUrl": "https://via.placeholder.com/300",
        "price": 299.99,
        "currency": "USD",
        "provider": "Best Buy",
        "url": "https://bestbuy.com/product"
      }
    ]
  }
}
```

**Expected**: 2 product cards displayed in a responsive grid with "View" and "Buy" buttons.

### Test 2: Hotel List
Send a message requesting hotel recommendations. The backend should return:
```json
{
  "text": "Here are some great hotels in Tokyo:",
  "ui": {
    "type": "hotel_list",
    "items": [
      {
        "title": "Tokyo Grand Hotel",
        "neighborhood": "Shibuya",
        "pricePerNight": 250,
        "currency": "USD",
        "rating": 4.5,
        "imageUrl": "https://via.placeholder.com/300",
        "url": "https://booking.com/hotel"
      }
    ]
  }
}
```

**Expected**: Hotel cards displayed with name, location, price, rating, and "View" button.

### Test 3: Links
Send a message requesting links. The backend should return:
```json
{
  "text": "Here are some helpful resources:",
  "ui": {
    "type": "links",
    "items": [
      {
        "title": "Travel Guide",
        "subtitle": "Complete guide to Tokyo",
        "url": "https://example.com/guide"
      }
    ]
  }
}
```

**Expected**: Clickable links displayed in a list.

### Test 4: CTA Buttons
Send a message that triggers CTA buttons. The backend should return:
```json
{
  "text": "What would you like to do next?",
  "ui": {
    "type": "cta_buttons",
    "buttons": [
      {
        "label": "Ask Follow-up",
        "action": {
          "type": "send_message",
          "payload": {
            "message": "Tell me more"
          }
        }
      }
    ]
  }
}
```

**Expected**: Buttons displayed that trigger the specified actions.

## Mobile Responsiveness

- **Product/Hotel Cards**: 
  - Mobile: 1 column (`grid-cols-1`)
  - Tablet: 2 columns (`sm:grid-cols-2`)
  - Desktop: 3 columns (`lg:grid-cols-3`)

- **Links**: Stacked vertically on all screen sizes

- **CTA Buttons**: Wrap to multiple rows on small screens (`flex-wrap`)

## Fallback Behavior

- If `ui` is missing, renders plain text (existing behavior)
- If `ui.type` is not recognized, falls back to plain text
- If `items` array is empty, only text is displayed
- Missing images are hidden gracefully (onError handler)

## Files Created/Modified

### Created
- `apps/web/components/chat/ProductCard.tsx` - Product card component
- `apps/web/components/chat/HotelCard.tsx` - Hotel card component

### Modified
- `apps/web/components/chat/AssistantRenderer.tsx` - Added new UI type rendering
- `apps/web/app/(app)/chat/ChatPageClient.tsx` - Enhanced event handling

## Next Steps

1. **Backend Integration**: Update backend to return UI payloads in the specified format
2. **Testing**: Test with real API responses
3. **Styling**: Fine-tune card styling to match design system
4. **Accessibility**: Add ARIA labels and keyboard navigation

