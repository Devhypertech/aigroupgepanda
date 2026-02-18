# Agentic Purchase & Preset Suggestions

## Preset Suggestions (Chat Home)

When the user opens the chat, they see quick-action presets:

- **Shop with AI** – "I want to shop with AI. Help me find and buy something."
- **Buy eSIM** – "I need an eSIM for my trip. Recommend a plan and help me buy it."
- **Plan a Trip** – "I want to plan a trip. Help me with destination, dates, and bookings."
- **Track My Order** – "I want to check my order status or track my shipment."

Clicking a preset sends that message and starts the corresponding AI flow (product discovery, eSIM, trip planning, or order status).

---

## Agentic Purchase & Checkout Flow

### 1. Product Discovery

- **APIs**: Product search uses `GET /api/products/search?q=...&limit=20` (current catalog; can be wired to Amazon, Doba, Google Shopping later).
- **Chat**: User says "Shop with AI" or "I want to buy X". AI can call product search and return **checkout** or **confirmation** widgets with items and `productId` on each item.

### 2. Agent Confirmation

- **UI**: Use the **confirmation** widget: item details, total, optional `shippingAddress`, `paymentPreference`, and **Confirm** / **Proceed** buttons.
- **Behavior**: "Confirm" can emit an event for the AI. "Proceed" calls `POST /api/checkout/intent` and opens the returned `checkoutUrl` in a new tab.

### 3. Checkout Intent Creation

- **API**: `POST /api/checkout/intent`
  - Body: `{ productId?, productType?, items?, shippingAddress?, paymentPreference? }`
  - `productType`: `product` | `esim` | `flight` | `hotel` | `package`
  - Returns: `{ checkoutUrl, sessionId?, expiresAt?, message? }`
- **Backend**: For catalog products, uses product checkout/affiliate link. For eSIM/flight/hotel/package, uses Rye API (or mock when `RYE_API_KEY` is not set).

### 4. User Payment

- User is sent to `checkoutUrl` (Rye checkout page or product/affiliate page). Payment options (card, PayPal, crypto, wallet) are handled on that page.

### 5. Order Placement

- Handled by the checkout provider (Rye or product merchant). Our API can later receive webhooks to persist orders.

### 6. Shipping & Tracking

- **API**: `GET /api/orders/:orderId/tracking` returns tracking info (stub; plug in real carrier/Rye later).
- Chat can say "Track my order" and the AI can call this (or a tool that calls it) and show status.

### 7. Check Order Status

- **APIs**:
  - `GET /api/orders` – list user's orders (stub).
  - `GET /api/orders/:orderId` – order status (stub; unknown ID returns "pending").
- Preset **Track My Order** leads the AI to ask for order ID or use stored orders and return status/tracking.

---

## Chat UI Widgets

- **checkout**: Shows items, total, "Proceed to Payment". On click, calls `POST /api/checkout/intent` (using first item’s `productId` or `items`) and opens `checkoutUrl`.
- **confirmation**: Shows order summary, shipping (if any), payment preference, **Confirm** and **Proceed**. Proceed same as checkout (intent → open URL). Include `productId` on items and `productType` for correct routing (product vs eSIM/travel).

---

## Next.js Rewrites

These are proxied to the API server so the web app can call them same-origin:

- `/api/checkout/:path*`
- `/api/orders/:path*`
- `/api/products/:path*`

Use `credentials: 'include'` and optional `X-User-Id` for guest/users.
