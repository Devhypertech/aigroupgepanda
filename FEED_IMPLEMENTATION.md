# Feed Foundation Implementation

## Summary
Implemented a complete Feed foundation with Prisma model, backend API, and frontend components with filtering and infinite scroll.

## Backend Implementation

### 1. Prisma Model (`prisma/schema.prisma`)
```prisma
model FeedItem {
  id          String   @id @default(cuid())
  type        String   // 'deal', 'article', 'video', 'destination', 'product', 'weather', 'insight'
  category    String?  // 'travel', 'deals', 'news', 'entertainment', 'lifestyle', 'tech', 'food', 'adventure'
  title       String
  description String   @db.Text
  mediaUrl    String?  // Image or video URL
  source      String?  // Source name/URL
  affiliateUrl String? // Affiliate link for deals/products
  tagsJson    Json?    // JSON array of tags
  score       Float    @default(0.0) // Relevance/ranking score
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([type])
  @@index([category])
  @@index([score])
  @@index([createdAt])
  @@index([type, category])
  @@map("feed_items")
}
```

### 2. Zod Schemas (`apps/api/src/feed/schemas.ts`)
- `FeedItemTypeSchema`: Enum for item types
- `FeedItemCategorySchema`: Enum for categories
- `FeedItemSchema`: Full validation schema
- `FeedResponseSchema`: Response DTO
- `FeedQuerySchema`: Query params validation

### 3. Seed Data (`apps/api/src/feed/seed.ts`)
- Static JSON array with 10+ sample items
- Includes deals, articles, videos, destinations, products
- Ready for replacement with real ingestion

### 4. Repository (`apps/api/src/feed/repository.ts`)
- `seedFeedItems()`: Seeds database on startup
- `getFeedItems()`: Fetches with filters and pagination
- Fallback to seed data if database unavailable
- Cursor-based pagination

### 5. API Route (`apps/api/src/routes/feed.ts`)
- `GET /api/feed`
- Query params: `category?`, `type?`, `cursor?`, `limit?` (default: 20, max: 50)
- Returns: `{ items: FeedItem[], nextCursor: string | null }`

## Frontend Implementation

### 1. Shared Types (`packages/shared/src/feed.ts`)
Updated to match new schema:
- `FeedItemType`: 'deal' | 'article' | 'video' | 'destination' | 'product' | 'weather' | 'insight'
- `FeedItemCategory`: 'travel' | 'deals' | 'news' | 'entertainment' | 'lifestyle' | 'tech' | 'food' | 'adventure'
- `FeedItem`: Full interface with `mediaUrl`, `affiliateUrl`, `source`, `category`, `tagsJson`
- `FeedResponse`: `{ items: FeedItem[], nextCursor: string | null }`

### 2. Feed Card Component (`apps/web/components/feed/FeedCard.tsx`)
- Handles different card types:
  - **Deal Card**: Shows discount badge, "View Deal" CTA button
  - **Article Card**: Shows article badge, category, source
  - **Video Card**: YouTube embed (16:9 aspect ratio), video badge
  - **Default Card**: For destinations, products, etc.
- Mobile responsive
- Hover effects and transitions

### 3. Filter Pills Component (`apps/web/components/feed/FilterPills.tsx`)
- Horizontal scrollable filter pills
- Categories: All, travel, deals, news, entertainment, lifestyle, tech, food, adventure
- Active state styling
- Mobile responsive

### 4. Feed Page (`apps/web/app/(app)/feed/page.tsx`)
- **Filter pills** at top
- **Infinite scroll** using Intersection Observer
- **Cursor-based pagination**
- **Skeleton loader** while loading
- **Empty state** with CTA
- Mobile responsive with bottom nav

## Migration Steps

1. **Generate Prisma Client:**
   ```bash
   cd apps/api
   npm run db:generate
   ```

2. **Create Migration:**
   ```bash
   cd apps/api
   npm run db:migrate -- --name add_feed_item_model
   ```

3. **Seed Data:**
   Feed items are automatically seeded on server startup if database is empty.

## API Usage

### Get Feed Items
```bash
GET /api/feed?category=travel&type=article&limit=20&cursor=1234567890
```

### Response
```json
{
  "items": [
    {
      "id": "clx...",
      "type": "article",
      "category": "travel",
      "title": "10 Hidden Gems in Southeast Asia",
      "description": "...",
      "mediaUrl": "https://...",
      "source": "TravelMagazine.com",
      "affiliateUrl": null,
      "tagsJson": ["southeast-asia", "destinations"],
      "score": 0.75,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "1234567890"
}
```

## File Structure

```
apps/api/
  src/
    feed/
      schemas.ts          # Zod validation schemas
      seed.ts             # Static seed data
      repository.ts       # Database operations
    routes/
      feed.ts            # GET /api/feed endpoint

apps/web/
  components/
    feed/
      FeedCard.tsx       # Card component for each item type
      FilterPills.tsx    # Category filter pills
      index.ts           # Exports
  app/(app)/
    feed/
      page.tsx           # Main feed page with infinite scroll

packages/shared/
  src/
    feed.ts              # Shared TypeScript types

prisma/
  schema.prisma          # FeedItem model
```

## Features

✅ Prisma model with all required fields
✅ Zod validation schemas
✅ Seed data loader (static JSON)
✅ GET /feed endpoint with filters
✅ Cursor-based pagination
✅ Filter pills UI
✅ Infinite scroll
✅ Deal, Article, Video card components
✅ YouTube embed support
✅ Mobile responsive
✅ Video-first ready

## Next Steps

1. Run migration to create `feed_items` table
2. Replace seed data with real content ingestion
3. Add user personalization (already structured for it)
4. Add analytics tracking
5. Add save/bookmark functionality

