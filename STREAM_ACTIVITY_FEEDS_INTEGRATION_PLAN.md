# Stream Activity Feeds + Personalization Integration Plan

## Executive Summary

**Recommendation: Hybrid Approach (Keep Prisma + Add Stream for Real-time & Advanced Features)**

- **Keep existing Prisma feed** as source of truth for content storage and basic ranking
- **Add Stream Activity Feeds** for:
  - Real-time feed updates (WebSocket/SSE)
  - Advanced personalization (if on paid plan)
  - Built-in follow graph and social features
  - Activity analytics and engagement tracking
- **Dual-write pattern**: Write to both Prisma (primary) and Stream (for real-time/features)

---

## 1. Decision: Adopt Stream Activity Feeds or Keep Custom Prisma Feed?

### Current Custom Implementation
✅ **Strengths:**
- Full control over data model and ranking algorithm
- No vendor lock-in
- Already implemented and working
- Cost-effective (no per-user fees)
- Direct database queries for complex filtering

❌ **Limitations:**
- No real-time updates (requires polling)
- Manual follow graph implementation needed
- No built-in analytics dashboard
- Scaling ranking logic requires custom development

### Stream Activity Feeds
✅ **Strengths:**
- Real-time feed updates (WebSocket/SSE)
- Built-in follow graph and social features
- Advanced personalization (requires paid plan)
- Activity analytics and engagement metrics
- Battle-tested at scale
- Collections for products/content management

❌ **Limitations:**
- **Cost**: Personalization features require paid plan (Standard/Enterprise)
- Less control over ranking algorithm
- Vendor dependency
- Additional API calls and latency
- Learning curve for team

### **Recommendation: Hybrid Approach**

**Phase 1 (MVP):** Keep Prisma feed, add Stream for real-time updates only
- Write activities to Stream for real-time distribution
- Read from Prisma for ranking/personalization (current logic)
- Use Stream WebSocket for live feed updates

**Phase 2 (Advanced):** Migrate to Stream for personalization (if budget allows)
- Use Stream's built-in ranking and personalization
- Keep Prisma as backup/analytics source
- Leverage Stream Collections for products/content

---

## 2. Minimal Integration Steps

### Step 1: Analytics Events Tracking

**Purpose:** Track user interactions for personalization

**Implementation:**
- Extend existing `FeedInteraction` model (already exists)
- Add Stream Analytics events via `streamClient.trackEngagement()`
- Dual-write: Prisma (primary) + Stream Analytics (for personalization)

**Files to Create/Modify:**
```
apps/api/src/services/stream/analytics.ts (new)
apps/api/src/routes/feedInteract.ts (modify - add Stream tracking)
```

**Stream SDK Method:**
```typescript
// Track engagement event
streamClient.trackEngagement({
  content: { foreign_id: `feed_item:${feedItemId}` },
  engagement: action, // 'view', 'click', 'save', 'like'
  user_id: userId,
});
```

---

### Step 2: Collections for Products/Content

**Purpose:** Store structured content metadata in Stream for better ranking

**Implementation:**
- Create Stream Collections for:
  - `product` collection (travel products, deals)
  - `destination` collection (locations, places)
  - `article` collection (travel articles, guides)

**Files to Create:**
```
apps/api/src/services/stream/collections.ts (new)
apps/api/src/feed/streamSync.ts (new - sync Prisma → Stream)
```

**Collection Schema Example:**
```typescript
// Product collection
{
  id: `product:${productId}`,
  data: {
    title: string,
    category: string,
    tags: string[],
    affiliateUrl: string,
    price?: number,
    imageUrl?: string,
  }
}
```

**Sync Strategy:**
- On feed item creation/update: upsert to Stream Collection
- Background job: sync existing Prisma items to Stream
- Keep Prisma as source of truth, Stream as cache/feature layer

---

### Step 3: Feed Groups + Follow Graph (Optional)

**Purpose:** Enable social features (following users, topics, destinations)

**Feed Groups to Create:**
- `user:<userId>` - User's own activities
- `timeline:<userId>` - Following feed (activities from followed users/topics)
- `forYou:<userId>` - Personalized discovery feed
- `topic:<category>` - Category-based feeds (e.g., `topic:travel`, `topic:deals`)

**Files to Create:**
```
apps/api/src/services/stream/feeds.ts (new)
apps/api/src/routes/follow.ts (new)
```

**Follow Graph Implementation:**
```typescript
// User follows a topic/destination
await streamClient.feed('timeline', userId).follow('topic', 'travel');

// User follows another user (if social features enabled)
await streamClient.feed('timeline', userId).follow('user', targetUserId);
```

**Prisma Schema Addition (if needed):**
```prisma
model UserFollow {
  id        String   @id @default(cuid())
  userId    String
  targetType String  // 'user' | 'topic' | 'destination'
  targetId  String
  createdAt DateTime @default(now())
  
  @@unique([userId, targetType, targetId])
  @@index([userId])
  @@map("user_follows")
}
```

---

### Step 4: Ranking/Personalization Flow

**Option A: Keep Custom Ranking (Recommended for MVP)**
- Continue using existing `apps/api/src/feed/ranking.ts`
- Stream provides real-time delivery only
- Full control over algorithm

**Option B: Stream Personalization (Requires Paid Plan)**
- Use Stream's built-in ranking expressions
- Configure via Stream Dashboard or API
- Less control but battle-tested

**Hybrid Approach (Best of Both):**
```typescript
// 1. Get activities from Stream (real-time, filtered)
const streamActivities = await streamClient.feed('forYou', userId).get();

// 2. Enrich with Prisma data (scores, metadata)
const enriched = await enrichWithPrismaData(streamActivities);

// 3. Apply custom ranking (your algorithm)
const ranked = await rankFeedItems(enriched, rankingContext);

// 4. Return to frontend
return ranked;
```

**Files to Modify:**
```
apps/api/src/feed/ranking.ts (enhance with Stream data)
apps/api/src/routes/feed.ts (add Stream integration)
apps/api/src/services/stream/personalization.ts (new)
```

---

## 3. Required Stream SDKs/Packages

### Backend (`apps/api`)

**Package to Install:**
```bash
npm install getstream --workspace=@gepanda/api
```

**Note:** Stream Activity Feeds uses a different SDK than Stream Chat:
- Stream Chat: `stream-chat` (already installed)
- Stream Activity Feeds: `getstream` (needs to be installed)

**Package Location:**
```
apps/api/package.json
```

**Import Pattern:**
```typescript
import StreamClient from 'getstream';
// or
import { StreamClient } from 'getstream';
```

### Frontend (`apps/web`) - Optional

If you want client-side feed fetching (recommended for real-time):

**Package to Install:**
```bash
npm install getstream --workspace=@gepanda/web
```

**Usage:**
```typescript
import { StreamFeed } from 'getstream';
const client = StreamFeed.getInstance(apiKey, token);
```

---

## 4. File Structure & Placement

### Backend (`apps/api/src`)

```
apps/api/src/
├── services/
│   └── stream/
│       ├── streamClient.ts          (existing - Chat client)
│       ├── feedsClient.ts            (new - Activity Feeds client)
│       ├── analytics.ts               (new - Analytics tracking)
│       ├── collections.ts            (new - Collection management)
│       ├── feeds.ts                  (new - Feed group operations)
│       └── personalization.ts        (new - Personalization logic)
├── feed/
│   ├── repository.ts                (existing - Prisma operations)
│   ├── ranking.ts                   (existing - Custom ranking)
│   ├── streamSync.ts                 (new - Prisma → Stream sync)
│   └── ...
├── routes/
│   ├── feed.ts                      (modify - Add Stream integration)
│   ├── feedInteract.ts              (modify - Add Stream analytics)
│   ├── follow.ts                    (new - Follow/unfollow endpoints)
│   └── ...
└── index.ts                         (modify - Initialize Stream Feeds client)
```

### Environment Variables

Add to `apps/api/.env`:
```env
# Stream Chat (existing)
STREAM_API_KEY=your_chat_key
STREAM_API_SECRET=your_chat_secret

# Stream Activity Feeds (new)
STREAM_FEEDS_API_KEY=your_feeds_key
STREAM_FEEDS_API_SECRET=your_feeds_secret
```

**Note:** Stream Chat and Activity Feeds can use the same API key if configured in the same Stream app, or separate keys if using different apps.

---

## 5. Integration Phases

### Phase 1: Real-time Updates (MVP) - 1-2 weeks
1. Install `getstream` package
2. Create `feedsClient.ts` service
3. Sync existing feed items to Stream Collections
4. Modify feed creation to write to Stream
5. Add WebSocket endpoint for real-time updates
6. Frontend: Connect to Stream WebSocket for live feed

**Deliverables:**
- Real-time feed updates
- Collections populated
- Basic activity tracking

### Phase 2: Analytics & Engagement - 1 week
1. Create `analytics.ts` service
2. Modify `feedInteract.ts` to track to Stream
3. Set up engagement event tracking
4. Dashboard: View analytics in Stream Dashboard

**Deliverables:**
- Engagement tracking in Stream
- Analytics dashboard access

### Phase 3: Follow Graph (Optional) - 1-2 weeks
1. Create `follow.ts` routes
2. Implement follow/unfollow logic
3. Create timeline feeds (following feed)
4. Frontend: Add follow buttons/UI

**Deliverables:**
- Users can follow topics/destinations
- Timeline feed shows followed content

### Phase 4: Personalization (If Budget Allows) - 2-3 weeks
1. Enable Stream Personalization (requires paid plan)
2. Configure ranking expressions
3. Create `personalization.ts` service
4. Implement hybrid ranking (Stream + custom)
5. A/B test personalization effectiveness

**Deliverables:**
- Personalized "For You" feed
- Improved engagement metrics

---

## 6. Cost Considerations

### Stream Activity Feeds Pricing (as of 2024)

**Free Tier:**
- 3,000 monthly active users
- Basic feeds (no personalization)
- Limited analytics

**Paid Tiers:**
- **Standard**: ~$99/month + usage
- **Enterprise**: Custom pricing
- **Personalization**: Requires Standard+ plan

### Cost-Benefit Analysis

**Keep Custom (Current):**
- Cost: $0/month
- Development time: Ongoing maintenance
- Features: Basic ranking, no real-time

**Add Stream (Real-time Only):**
- Cost: Free tier (if < 3K MAU) or ~$99/month
- Development time: 2-3 weeks integration
- Features: Real-time updates, basic feeds

**Full Stream (With Personalization):**
- Cost: $99-500+/month depending on usage
- Development time: 4-6 weeks integration
- Features: Real-time, personalization, analytics, follow graph

---

## 7. Migration Strategy

### Dual-Write Pattern (Recommended)

```typescript
// When creating feed item
async function createFeedItem(data: FeedItemData) {
  // 1. Write to Prisma (source of truth)
  const item = await prisma.feedItem.create({ data });
  
  // 2. Write to Stream (for real-time/features)
  await streamClient.collections.upsert('feed_item', {
    id: `feed_item:${item.id}`,
    data: {
      title: item.title,
      category: item.category,
      tags: item.tagsJson,
      // ... other fields
    }
  });
  
  // 3. Add activity to feed
  await streamClient.feed('user', userId).addActivity({
    actor: `user:${userId}`,
    verb: 'post',
    object: `feed_item:${item.id}`,
    time: new Date().toISOString(),
  });
  
  return item;
}
```

### Rollback Plan

- Keep Prisma as primary source
- Stream is additive (can be disabled via feature flag)
- If Stream fails, fallback to Prisma-only feed

---

## 8. Next Steps

1. **Decision:** Choose integration approach (Hybrid recommended)
2. **Setup:** Create Stream app (or use existing if Chat + Feeds in same app)
3. **Install:** Add `getstream` package to `apps/api`
4. **Phase 1:** Implement real-time updates (MVP)
5. **Evaluate:** Measure engagement improvement
6. **Phase 2+:** Add analytics, follow graph, personalization as needed

---

## 9. References

- [Stream Activity Feeds Docs](https://getstream.io/activity-feeds/docs/)
- [Stream Personalization](https://getstream.io/blog/stream-personalization/)
- [Stream Collections](https://getstream.io/activity-feeds/docs/node/collections_introduction/)
- [Stream Analytics](https://getstream.io/activity-feeds/docs/node/analytics/)

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Proposal (Not Implemented)

