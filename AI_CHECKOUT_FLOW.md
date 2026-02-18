# AI-Driven Checkout Flow Implementation

## Overview

Complete AI-driven checkout flow with multiple payment providers (Crossmint, Rye) and payment rails (Apple Pay, Card, Crypto).

## Database Table

### Orders Table

Run the SQL migration:
```bash
psql -U postgres -d gepanda_dev -f prisma/migrations/create_orders_table.sql
```

**Schema:**
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  checkout_provider TEXT,
  tracking_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Flow

### 1. Product Selected
User selects a product from search results.

### 2. AI Confirmation
AI confirms:
- **Item**: Product title and details
- **Price**: Product price and currency
- **Shipping Address**: User's shipping address
- **Payment Preference**: card, apple_pay, or crypto

### 3. Create Checkout Intent

**Endpoint:** `POST /api/checkout/create`

**Request:**
```json
{
  "product": {
    "id": "prod_123",
    "title": "MacBook Pro",
    "image": "https://...",
    "price": 999.99,
    "currency": "USD",
    "url": "https://..."
  },
  "quantity": 1,
  "shippingAddress": {
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "region": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "paymentPreference": "card",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.rye.com/session/abc123",
  "sessionId": "session_abc123",
  "provider": "rye",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

### 4. Payment Processing

The system automatically selects the checkout provider based on payment preference:
- **Crypto** → Crossmint
- **Apple Pay / Card** → Rye Checkout

**Payment Rails Supported:**
- Apple Pay (via Rye)
- Card (via Rye)
- Crypto (via Crossmint)

### 5. Payment Success Callback

**Endpoint:** `POST /api/checkout/success`

**Request:**
```json
{
  "sessionId": "session_abc123",
  "orderId": "order_xyz789",
  "status": "completed"
}
```

**Response:**
```json
{
  "ok": true,
  "orderId": "order_xyz789",
  "status": "completed"
}
```

### 6. Order Storage

Orders are automatically stored in the database when checkout is created (status: `pending`). After payment success, the order status is updated to `completed` or `paid`.

## API Endpoints

### POST /api/checkout/create
Create checkout intent after AI confirmation.

**Authentication:** Required (userId in header or session)

**Body:**
- `product`: Product object (id, title, price, currency, url)
- `quantity`: Number (default: 1)
- `shippingAddress`: Optional shipping address
- `paymentPreference`: 'card' | 'apple_pay' | 'crypto'
- `email`: Optional email

**Returns:** Checkout URL, session ID, provider, expiry

### POST /api/checkout/success
Update order status after payment success.

**Authentication:** Required

**Body:**
- `sessionId`: Checkout session ID
- `orderId`: Optional order ID
- `status`: 'completed' | 'paid' | 'success'

**Returns:** Updated order status

### GET /api/orders
List all orders for current user.

**Returns:** Array of orders with status, amount, currency, etc.

### GET /api/orders/:orderId
Get order details by ID.

**Returns:** Full order information

### GET /api/orders/status/:orderId
Get order status by ID.

**Returns:** Order status and tracking information

## Services

### 1. Unified Checkout Service (`apps/api/src/services/checkout/unifiedCheckout.ts`)
- Routes to appropriate provider (Crossmint or Rye)
- Selects provider based on payment preference
- Handles all payment rails

### 2. Rye Checkout Service (`apps/api/src/services/checkout/ryeCheckout.ts`)
- Creates Rye checkout sessions
- Supports Apple Pay, Card, Crypto
- Gets checkout session status

### 3. Checkout Agent (`apps/api/src/services/checkoutAgent.ts`)
- Validates checkout confirmation
- Creates checkout intent
- Handles AI confirmation flow

### 4. Order Database Service (`apps/api/src/db/orderDb.ts`)
- Creates orders in PostgreSQL
- Updates order status
- Retrieves orders by user

## Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `CROSSMINT_API_KEY`: For crypto payments
- `RYE_API_KEY`: For Apple Pay and Card payments

Optional:
- `CROSSMINT_PROJECT_ID`: Crossmint project ID
- `CROSSMINT_ENV`: 'sandbox' or 'production'
- `RYE_API_URL`: Rye API URL (default: https://api.rye.com)

## Order Status Flow

1. **pending**: Order created, awaiting payment
2. **paid**: Payment received, order processing
3. **completed**: Order fulfilled
4. **cancelled**: Order cancelled

## Integration Points

### Frontend Integration

1. **Product Selection**: User clicks "Buy" on product card
2. **AI Confirmation**: AI asks for confirmation (item, price, address, payment)
3. **Checkout Creation**: Frontend calls `POST /api/checkout/create`
4. **Payment Redirect**: User redirected to `checkoutUrl`
5. **Success Callback**: Payment provider redirects to success page
6. **Order Update**: Frontend calls `POST /api/checkout/success`

## Files Created/Updated

1. **`prisma/migrations/create_orders_table.sql`** - Database migration
2. **`apps/api/src/services/checkout/ryeCheckout.ts`** - Rye checkout integration
3. **`apps/api/src/services/checkout/unifiedCheckout.ts`** - Unified checkout service
4. **`apps/api/src/db/orderDb.ts`** - Order database service
5. **`apps/api/src/services/checkoutAgent.ts`** - Updated for unified checkout
6. **`apps/api/src/routes/checkout.ts`** - Added `/create` and `/success` endpoints
7. **`apps/api/src/routes/orders.ts`** - Updated to use database

## Next Steps

1. Run the SQL migration to create the orders table
2. Set up environment variables for Rye and Crossmint
3. Test the checkout flow end-to-end
4. Implement frontend UI for AI confirmation
5. Set up payment success redirect URLs

