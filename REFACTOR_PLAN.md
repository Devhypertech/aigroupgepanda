# GePanda Refactor Plan - AI-Only Companion with Feed

## Executive Summary

Transform GePanda from a multi-user chat platform to an **AI-only companion** with a **personalized recommendation feed** as the primary surface. Remove all human-to-human communication features and focus on AI-driven travel assistance with commerce integration.

---

## 1. Conflicting Features & Removal Plan

### 1.1 Video/Voice Calling Features

**Files to Disable/Remove:**

1. **`apps/api/src/tools/stream/createCall.ts`**
   - **Action**: Add feature flag `ENABLE_VIDEO_CALLS = false`
   - **Impact**: Tool returns error message when called
   - **Safe Disable**: Return `{ success: false, userMessage: "Video calls are not available" }`

2. **`apps/api/src/tools/stream/suggestCall.ts`**
   - **Action**: Add feature flag `ENABLE_CALLS = false`
   - **Impact**: Tool returns error message when called
   - **Safe Disable**: Return `{ success: false, userMessage: "Calls are not available" }`

3. **`apps/api/src/services/agent/intent.ts`** (Lines 61-74)
   - **Action**: Remove `stream.call` and `stream.video` intent detection
   - **Impact**: AI won't detect call/video requests
   - **Safe Disable**: Comment out regex patterns, return `'general.chat'` instead

4. **`apps/api/src/tools/registry.ts`** (Lines 22-23, 43-44)
   - **Action**: Remove `stream.suggestCall` and `stream.createCall` from toolMap
   - **Impact**: Tools won't be callable even if intent detected
   - **Safe Disable**: Remove entries from `toolMap` and `intentToTool` mapping

5. **`apps/api/src/services/agent/companionAgent.ts`** (Line 45)
   - **Action**: Remove "Stream call/video" from system prompt
   - **Impact**: AI won't mention call capabilities

### 1.2 Group Chat via Link Features

**Files to Disable/Remove:**

1. **`apps/api/src/routes/invites.ts`** (Entire file)
   - **Action**: Add feature flag `ENABLE_INVITES = false` at top
   - **Impact**: All invite endpoints return 403
   - **Safe Disable**: Early return with `{ error: 'Invites are disabled' }` in all handlers

2. **`apps/api/src/services/stream/channelHelpers.ts`**
   - **Action**: Keep `getOrCreateDmAiChannel()` only, disable group functions
   - **Impact**: `createGroupAiChannel()` and `addMember()` return errors
   - **Safe Disable**: Add feature flag checks, throw errors if called

3. **`apps/api/src/routes/channels.ts`**
   - **Action**: Keep `/api/channels/dm` only, remove group endpoints
   - **Impact**: Only DM channels can be created
   - **Safe Disable**: Remove group-related routes

4. **`apps/web/app/invite/[token]/page.tsx`** (Entire file)
   - **Action**: Redirect to `/` with error message
   - **Impact**: Invite links no longer work
   - **Safe Disable**: Show "Invites are disabled" message and redirect

5. **`apps/web/components/chat/InviteModal.tsx`** (Entire file)
   - **Action**: Remove from imports, hide invite button
   - **Impact**: UI no longer shows invite option
   - **Safe Disable**: Don't render component

6. **`apps/web/app/page.tsx`** (Lines 38-40, 228-275, 373-410, 435-446)
   - **Action**: Remove invite button, invite modal, `handleCreateInvite` function
   - **Impact**: No invite UI in chat
   - **Safe Disable**: Remove state and handlers

7. **`prisma/schema.prisma`** - `ChatInvite` model
   - **Action**: Keep model (for data integrity), but disable creation
   - **Impact**: Existing invites remain but new ones can't be created
   - **Safe Disable**: Application-level blocking

### 1.3 Human-to-Human Messaging

**Files to Modify:**

1. **`apps/api/src/services/stream/channelHelpers.ts`**
   - **Action**: Ensure only DM AI channels (user + AI bot) are created
   - **Impact**: No multi-user channels
   - **Safe Disable**: Remove `createGroupAiChannel()` and `addMember()` functions

2. **`apps/web/app/page.tsx`** (Lines 66-77, 104)
   - **Action**: Remove `channelId` URL parameter support
   - **Impact**: Users can only access their own DM channel
   - **Safe Disable**: Always use `user-${userId}` channel ID

3. **`apps/api/src/routes/invites.ts`**
   - **Action**: Already disabled above
   - **Impact**: No way to join other users' channels

---

## 2. New Navigation Flow

### Current Flow:
```
/ → Chat (page.tsx)
/login → Login
/signup → Signup
/invite/[token] → Invite redemption
```

### New Flow:
```
/ → Feed (Home - NEW)
/chat → AI Chat (protected)
/login → Login
/signup → Signup
```

### Implementation:

1. **Create `apps/web/app/page.tsx`** → Feed component (NEW)
2. **Create `apps/web/app/chat/page.tsx`** → Move current chat logic here
3. **Update `apps/web/middleware.ts`** → Protect `/chat` route
4. **Update navigation** → Add "Ask AI" button in Feed header

---

## 3. MVP Milestones

### Phase 1: Disable Non-Goals (Week 1)
**Goal**: Safely disable all conflicting features

**Tasks:**
1. Add feature flags to API (`ENABLE_VIDEO_CALLS`, `ENABLE_CALLS`, `ENABLE_INVITES`)
2. Disable video/voice call tools
3. Disable invite system (routes + UI)
4. Remove group channel creation
5. Remove human-to-human messaging paths
6. Update intent detection to ignore call/video requests
7. Test: Verify no calls, invites, or group chats work

**Files Changed:**
- `apps/api/src/tools/stream/createCall.ts`
- `apps/api/src/tools/stream/suggestCall.ts`
- `apps/api/src/services/agent/intent.ts`
- `apps/api/src/tools/registry.ts`
- `apps/api/src/routes/invites.ts`
- `apps/api/src/services/stream/channelHelpers.ts`
- `apps/api/src/routes/channels.ts`
- `apps/web/app/page.tsx`
- `apps/web/app/invite/[token]/page.tsx`
- `apps/web/components/chat/InviteModal.tsx`

### Phase 2: Feed Implementation (Week 2-3)
**Goal**: Build personalized AI recommendation feed as primary surface

**Tasks:**
1. Create Feed component (`apps/web/app/page.tsx`)
2. Design feed card components (recommendations, products, trips)
3. Implement feed data fetching from API
4. Add feed signal extraction from chat history
5. Create feed personalization logic
6. Add "Ask AI" button → navigates to `/chat`
7. Make feed fully responsive

**New Files:**
- `apps/web/app/page.tsx` (Feed component)
- `apps/web/components/feed/FeedCard.tsx`
- `apps/web/components/feed/RecommendationCard.tsx`
- `apps/web/components/feed/ProductCard.tsx`
- `apps/web/components/feed/index.ts`
- `apps/web/app/chat/page.tsx` (moved from page.tsx)
- `apps/api/src/routes/feed.ts` (NEW)
- `apps/api/src/services/feed/feedGenerator.ts` (NEW)
- `apps/api/src/services/feed/signalExtractor.ts` (NEW)

**Files Changed:**
- `apps/web/app/page.tsx` → Feed
- `apps/web/app/chat/page.tsx` → Chat (moved)
- `apps/web/middleware.ts` → Protect `/chat`
- `apps/api/src/services/agent/companionAgent.ts` → Extract signals
- `apps/api/src/index.ts` → Add `/api/feed` route

### Phase 3: Commerce Integration (Week 4)
**Goal**: Add product discovery cards with outbound checkout links

**Tasks:**
1. Design product card component
2. Integrate eSIM product data (from existing `connectivity.createCheckout`)
3. Add travel product recommendations (flights, hotels, activities)
4. Implement outbound link generation (Rye checkout, partner links)
5. Add product tracking/analytics
6. Ensure no auto-buy (links only)

**New Files:**
- `apps/web/components/feed/ProductCard.tsx`
- `apps/web/components/feed/CheckoutLink.tsx`
- `apps/api/src/services/commerce/productService.ts` (NEW)
- `apps/api/src/services/commerce/checkoutService.ts` (NEW)

**Files Changed:**
- `apps/web/components/feed/FeedCard.tsx` → Add product type
- `apps/api/src/routes/feed.ts` → Include products
- `apps/api/src/services/feed/feedGenerator.ts` → Add product recommendations

---

## 4. Exact File-by-File Changes

### Phase 1: Disable Features

#### `apps/api/src/tools/stream/createCall.ts`
```typescript
// Add at top
const ENABLE_VIDEO_CALLS = process.env.ENABLE_VIDEO_CALLS === 'true';

export async function createCall(...) {
  if (!ENABLE_VIDEO_CALLS) {
    return {
      success: false,
      error: 'Video calls are disabled',
      userMessage: "Video calls are not currently available.",
    };
  }
  // ... existing code
}
```

#### `apps/api/src/tools/stream/suggestCall.ts`
```typescript
// Add at top
const ENABLE_CALLS = process.env.ENABLE_CALLS === 'true';

export async function suggestCall(...) {
  if (!ENABLE_CALLS) {
    return {
      success: false,
      error: 'Calls are disabled',
      userMessage: "Calls are not currently available.",
    };
  }
  // ... existing code
}
```

#### `apps/api/src/services/agent/intent.ts`
```typescript
// Remove lines 61-74 (call/video detection)
// Replace with:
// Stream call - DISABLED
// if (/\b(call|phone call|voice call|audio call)\b/i.test(lowerText) && ...) {
//   return 'stream.call';
// }
// → Return 'general.chat' instead

// Stream video - DISABLED
// if (/\b(video|video call|video chat|face to face)\b/i.test(lowerText)) {
//   return 'stream.video';
// }
// → Return 'general.chat' instead
```

#### `apps/api/src/tools/registry.ts`
```typescript
// Remove from toolMap:
// 'stream.suggestCall': streamTools.suggestCall,
// 'stream.createCall': streamTools.createCall,

// Remove from intentToTool:
// 'stream.call': null, // DISABLED
// 'stream.video': null, // DISABLED
```

#### `apps/api/src/routes/invites.ts`
```typescript
// Add at top
const ENABLE_INVITES = process.env.ENABLE_INVITES === 'true';

// Add to all route handlers:
if (!ENABLE_INVITES) {
  return res.status(403).json({ error: 'Invites are disabled' });
}
```

#### `apps/api/src/services/stream/channelHelpers.ts`
```typescript
// Add feature flag
const ENABLE_GROUP_CHANNELS = process.env.ENABLE_GROUP_CHANNELS === 'true';

// Modify createGroupAiChannel:
export async function createGroupAiChannel(...) {
  if (!ENABLE_GROUP_CHANNELS) {
    throw new Error('Group channels are disabled');
  }
  // ... existing code
}

// Modify addMember:
export async function addMember(...) {
  if (!ENABLE_GROUP_CHANNELS) {
    throw new Error('Adding members is disabled');
  }
  // ... existing code
}
```

#### `apps/web/app/page.tsx`
```typescript
// Remove:
// - showInviteModal state
// - inviteUrl state
// - inviteLoading state
// - handleCreateInvite function
// - InviteModal import and rendering
// - Invite button in header (lines 373-410)

// Remove channelId URL param logic (lines 66-77)
// Always use: const channelId = `user-${userId}`;
```

#### `apps/web/app/invite/[token]/page.tsx`
```typescript
// Replace entire component with:
export default function InvitePage() {
  return (
    <main>
      <h1>Invites Disabled</h1>
      <p>Group chat invites are not available.</p>
      <Link href="/">Go to Home</Link>
    </main>
  );
}
```

#### `apps/web/components/chat/InviteModal.tsx`
```typescript
// Add at top:
// DEPRECATED: This component is no longer used
// Keep file for reference but remove from exports
```

### Phase 2: Feed Implementation

#### `apps/web/app/page.tsx` (NEW - Feed)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthSession } from '../src/lib/auth';
import { FeedCard } from '../components/feed/FeedCard';
import { RecommendationCard } from '../components/feed/RecommendationCard';
import { ProductCard } from '../components/feed/ProductCard';

export default function FeedPage() {
  const router = useRouter();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch feed from API
    // TODO: Implement
  }, []);

  return (
    <main>
      <header>
        <h1>GePanda</h1>
        <button onClick={() => router.push('/chat')}>Ask AI</button>
      </header>
      <div className="feed">
        {feedItems.map(item => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}
```

#### `apps/web/app/chat/page.tsx` (NEW - Move from page.tsx)
```typescript
// Move entire current apps/web/app/page.tsx content here
// Update imports to use relative paths
// Remove invite-related code
```

#### `apps/api/src/routes/feed.ts` (NEW)
```typescript
import { Router } from 'express';
import { getFeedForUser } from '../services/feed/feedGenerator.js';

const router = Router();

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const feed = await getFeedForUser(userId);
  res.json({ feed });
});

export default router;
```

#### `apps/api/src/services/feed/feedGenerator.ts` (NEW)
```typescript
import { extractSignalsFromChat } from './signalExtractor.js';
import { getLongTermMemory } from '../memory/memoryStore.js';

export async function getFeedForUser(userId: string) {
  // 1. Extract signals from chat history
  const signals = await extractSignalsFromChat(userId);
  
  // 2. Get user preferences from memory
  const memory = await getLongTermMemory(userId);
  
  // 3. Generate personalized recommendations
  // TODO: Implement recommendation logic
  
  return {
    recommendations: [],
    products: [],
    trips: [],
  };
}
```

#### `apps/api/src/services/feed/signalExtractor.ts` (NEW)
```typescript
import { streamServerClient } from '../stream/streamClient.js';

export async function extractSignalsFromChat(userId: string) {
  // Query Stream Chat for user's messages
  // Extract: destinations, dates, interests, preferences
  // Return structured signals
  return {
    destinations: [],
    dates: [],
    interests: [],
    preferences: {},
  };
}
```

### Phase 3: Commerce Integration

#### `apps/web/components/feed/ProductCard.tsx` (NEW)
```typescript
interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: string;
    imageUrl: string;
    checkoutUrl: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="product-card">
      <img src={product.imageUrl} alt={product.title} />
      <h3>{product.title}</h3>
      <p>{product.description}</p>
      <div className="price">{product.price}</div>
      <a href={product.checkoutUrl} target="_blank" rel="noopener noreferrer">
        View Details
      </a>
    </div>
  );
}
```

#### `apps/api/src/services/commerce/productService.ts` (NEW)
```typescript
import { createCheckout } from '../../tools/connectivity/createCheckout.js';

export async function getRecommendedProducts(userId: string, signals: any) {
  // Generate product recommendations based on signals
  // Return products with checkout URLs (no auto-buy)
  return [];
}
```

---

## 5. Environment Variables

Add to `.env`:
```env
# Feature Flags
ENABLE_VIDEO_CALLS=false
ENABLE_CALLS=false
ENABLE_INVITES=false
ENABLE_GROUP_CHANNELS=false
```

---

## 6. Testing Checklist

### Phase 1:
- [ ] Video call requests return error
- [ ] Voice call requests return error
- [ ] Invite creation returns 403
- [ ] Invite redemption page shows disabled message
- [ ] No invite button in chat UI
- [ ] Group channel creation fails
- [ ] Only DM AI channels work

### Phase 2:
- [ ] Feed loads on `/`
- [ ] Feed shows personalized recommendations
- [ ] "Ask AI" button navigates to `/chat`
- [ ] Chat works at `/chat`
- [ ] Feed updates based on chat signals
- [ ] Feed is fully responsive

### Phase 3:
- [ ] Product cards appear in feed
- [ ] Product cards link to checkout (external)
- [ ] No auto-purchase occurs
- [ ] Product recommendations are personalized

---

## 7. Migration Notes

- **Existing Data**: Keep `ChatInvite` table for data integrity, but block new creation
- **Existing Channels**: Group channels will become inaccessible (by design)
- **User Experience**: Users will see "Feature disabled" messages for removed features
- **Backward Compatibility**: Old invite links will show disabled message

---

## 8. Next Steps

1. **Review this plan** with team
2. **Create feature branch**: `refactor/ai-only-feed`
3. **Implement Phase 1** (disable features)
4. **Test Phase 1** thoroughly
5. **Implement Phase 2** (feed)
6. **Implement Phase 3** (commerce)
7. **Deploy to staging** for testing
8. **Deploy to production**

---

## Summary

This refactor transforms GePanda into a focused AI companion app with a personalized feed. All human-to-human communication is removed, and the app becomes a single-user AI experience with commerce integration. The phased approach ensures safe removal of features while building new capabilities incrementally.

