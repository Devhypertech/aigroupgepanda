# Feed Ranking Logic v1 Implementation

## Summary
Implemented personalized ranking logic for FeedItem.score with the formula:
**Score = Recency(35%) + InterestMatch(30%) + Engagement(20%) + AffiliateValue(15%)**

## Database Changes

### 1. FeedItem Model Updates (`prisma/schema.prisma`)
- Added `affiliateValue` field (Float, default 0.0) for manual affiliate value assignment
- Added relation to `FeedInteraction` model

### 2. FeedInteraction Model (`prisma/schema.prisma`)
New model to track user interactions:
```prisma
model FeedInteraction {
  id         String   @id @default(cuid())
  userId     String
  feedItemId String
  action     String   // 'click', 'save', 'view', 'buy'
  createdAt  DateTime @default(now())

  feedItem FeedItem @relation(fields: [feedItemId], references: [id], onDelete: Cascade)

  @@unique([userId, feedItemId, action])
  @@index([userId])
  @@index([feedItemId])
  @@index([userId, action])
  @@index([createdAt])
  @@map("feed_interactions")
}
```

## Ranking Logic (`apps/api/src/feed/ranking.ts`)

### Component Scores

1. **Recency Score (35% weight)**
   - Based on `createdAt` timestamp
   - Newer items get higher scores:
     - < 1 day: 1.0
     - < 7 days: 0.8
     - < 30 days: 0.6
     - < 90 days: 0.4
     - >= 90 days: 0.2

2. **Interest Match Score (30% weight)**
   - Based on tags overlap with user signals
   - Matches:
     - User interests (50% of match score)
     - User destinations (30% of match score)
     - Last intent (20% of match score)
   - Returns 0.5 (neutral) if no signals available

3. **Engagement Score (20% weight)**
   - Based on stored interactions from `FeedInteraction` table
   - Action weights:
     - `buy`: 1.0
     - `save`: 0.8
     - `click`: 0.6
     - `view`: 0.3
   - Normalized to max 1.0 (multiple buys = 1.0)
   - Returns 0.3 if no interactions, 0.5 on error

4. **Affiliate Value Score (15% weight)**
   - Uses `affiliateValue` field if set (0-1 range)
   - Category-based defaults:
     - deals: 0.9
     - product: 0.8
     - travel: 0.6
     - entertainment: 0.4
     - news: 0.3
     - etc.
   - Type-based fallback if category not set
   - Default: 0.5 (neutral)

### Effective Score Calculation
```typescript
effectiveScore = 
  recencyScore * 0.35 +
  interestMatchScore * 0.30 +
  engagementScore * 0.20 +
  affiliateValueScore * 0.15
```

## API Changes

### 1. GET /api/feed
- Now accepts optional `userId` query param or `X-User-Id` header
- Loads user signals if `userId` provided
- Applies ranking logic before returning items
- Returns items sorted by `effectiveScore` (descending)

### 2. POST /api/feed/interactions
New endpoint to record user interactions:
```json
POST /api/feed/interactions
{
  "userId": "user_123",
  "feedItemId": "feed_456",
  "action": "click" | "save" | "view" | "buy"
}
```

### 3. GET /api/feed/interactions
Get user's interactions (optional filters):
```
GET /api/feed/interactions?userId=user_123&feedItemId=feed_456&action=click
```

## Response Format

Feed items now include ranking scores:
```json
{
  "items": [
    {
      "id": "clx...",
      "type": "deal",
      "title": "...",
      "effectiveScore": 0.87,
      "recencyScore": 1.0,
      "interestMatchScore": 0.75,
      "engagementScore": 0.6,
      "affiliateValueScore": 0.9,
      ...
    }
  ],
  "nextCursor": "..."
}
```

## Migration Steps

1. **Generate Prisma Client:**
   ```bash
   cd apps/api
   npm run db:generate
   ```

2. **Create Migration:**
   ```bash
   cd apps/api
   npm run db:migrate -- --name add_feed_interactions_and_affiliate_value
   ```

## Usage Example

### Record Interaction
```typescript
// When user clicks on a feed item
await fetch('/api/feed/interactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    feedItemId: 'feed_456',
    action: 'click',
  }),
});
```

### Get Personalized Feed
```typescript
// Feed will be ranked based on user's signals and interactions
const response = await fetch('/api/feed?userId=user_123&limit=20');
const { items } = await response.json();
// Items are sorted by effectiveScore (highest first)
```

## Frontend Integration

Update feed page to record interactions:
- On card click: `POST /api/feed/interactions` with `action: 'click'`
- On save button: `POST /api/feed/interactions` with `action: 'save'`
- On view (scroll into viewport): `POST /api/feed/interactions` with `action: 'view'`
- On buy/checkout: `POST /api/feed/interactions` with `action: 'buy'`

## Files Changed

1. `prisma/schema.prisma` - Added FeedInteraction model, affiliateValue field
2. `apps/api/src/feed/ranking.ts` - New ranking logic implementation
3. `apps/api/src/feed/repository.ts` - Integrated ranking into getFeedItems
4. `apps/api/src/routes/feed.ts` - Added userId param and ranking context
5. `apps/api/src/routes/feedInteractions.ts` - New interaction tracking endpoints
6. `apps/api/src/feed/seed.ts` - Added affiliateValue to seed data
7. `apps/api/src/index.ts` - Registered feedInteractions route
8. `packages/shared/src/feed.ts` - Added ranking score fields to FeedItem interface

## Next Steps

1. Run migration to create `feed_interactions` table
2. Update frontend to record interactions on user actions
3. Monitor ranking performance and adjust weights if needed
4. Consider caching ranking results for performance
5. Add A/B testing for different weight combinations

