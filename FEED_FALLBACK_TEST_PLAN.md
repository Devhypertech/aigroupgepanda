# Feed Fallback Test Plan

## Overview
This document provides a test plan and sample Postman requests to verify the feed fallback functionality for real users after interests onboarding.

## Changes Made

### 1. GET /api/feed Fallback Logic
- **Location**: `apps/api/src/routes/feed.ts`
- **Behavior**: 
  - If user has no interests OR filtered result is empty, fallback to trending content
  - Trending content is sorted by `score` (descending) when no ranking context is provided
  - Auto-seeds database if empty (dev only)

### 2. Seed Endpoint Updates
- **Location**: `apps/api/src/routes/feedDev.ts`, `apps/api/src/routes/feedSeed.ts`
- **Behavior**: 
  - Ensures category is included as a tag in `tagsJson` for proper filtering
  - Sets appropriate scores (deals: 0.9, others: 0.7)

### 3. Repository Updates
- **Location**: `apps/api/src/feed/repository.ts`
- **Behavior**: 
  - Without ranking context: sorts by `score` (trending) first, then recency
  - With ranking context: sorts by recency first, ranking re-sorts by effectiveScore

## Test Scenarios

### Scenario 1: User with No Interests
**Expected**: Should return trending/seed content

### Scenario 2: User with Interests but No Matching Items
**Expected**: Should fallback to trending content

### Scenario 3: User with Interests and Matching Items
**Expected**: Should return personalized content filtered by interests

### Scenario 4: Empty Database
**Expected**: Should auto-seed (dev only) and return seeded items

## Postman Collection

### Base URL
```
http://localhost:3001
```

### 1. Seed Feed Items (Development)
**Request**: `POST /api/feed/dev/seed`
**Headers**: 
```
Content-Type: application/json
```
**Body**: (empty)

**Expected Response**:
```json
{
  "ok": true,
  "inserted": 25
}
```

**Notes**: 
- Only works in development mode (`NODE_ENV !== 'production'`)
- Seeds items globally (available to all users)
- Tags items with category tags

---

### 2. Seed Feed Items (Alternative)
**Request**: `POST /api/feed/seed`
**Headers**: 
```
Content-Type: application/json
```
**Body**: (empty)

**Expected Response**:
```json
{
  "success": true,
  "message": "Feed seeded successfully",
  "inserted": 17,
  "stats": {
    "created": 17,
    "updated": 0,
    "skipped": 0,
    "total": 17
  },
  "items": [...]
}
```

**Notes**: 
- Works if `NODE_ENV=development` OR `ALLOW_FEED_SEED=true`
- Seeds items globally

---

### 3. Get Feed - User with No Interests
**Request**: `GET /api/feed?category=for-you`
**Headers**: 
```
Cookie: <session-cookie> (if authenticated)
X-User-Id: <user-id> (optional, for dev bypass)
```

**Expected Response**:
```json
{
  "items": [
    {
      "id": "...",
      "type": "deal",
      "category": "deals",
      "title": "...",
      "description": "...",
      "tagsJson": ["deals", "europe", "flights"],
      "score": 0.9,
      ...
    },
    ...
  ],
  "nextCursor": "..."
}
```

**Verification**:
- Should return items even if user has no interests
- Items should be sorted by score (trending)
- Should include items from various categories

---

### 4. Get Feed - User with Interests (No Matches)
**Request**: `GET /api/feed?category=for-you`
**Headers**: 
```
Cookie: <session-cookie>
X-User-Id: <user-id>
```

**Setup**: 
1. Set user interests to something that doesn't match any items (e.g., "nonexistent-interest")
2. Call this endpoint

**Expected Response**:
```json
{
  "items": [
    {
      "id": "...",
      "type": "deal",
      "category": "deals",
      "title": "...",
      ...
    },
    ...
  ],
  "nextCursor": "..."
}
```

**Verification**:
- Should fallback to trending content when no matches found
- Should log: `[Feed] Empty result, falling back to trending/seed content`
- Should return items sorted by score

---

### 5. Get Feed - User with Interests (Has Matches)
**Request**: `GET /api/feed?category=for-you`
**Headers**: 
```
Cookie: <session-cookie>
X-User-Id: <user-id>
```

**Setup**: 
1. Set user interests to match seed items (e.g., "japan", "tokyo", "europe")
2. Call this endpoint

**Expected Response**:
```json
{
  "items": [
    {
      "id": "...",
      "type": "deal",
      "category": "deals",
      "title": "Early Bird: Tokyo Package Deal",
      "tagsJson": ["tokyo", "japan", "package", "asia"],
      ...
    },
    ...
  ],
  "nextCursor": "..."
}
```

**Verification**:
- Should return items matching user interests
- Items should have tags that match interest slugs
- Should be personalized/ranked

---

### 6. Get Feed - Specific Category (Deals)
**Request**: `GET /api/feed?category=deals`
**Headers**: 
```
Cookie: <session-cookie>
```

**Expected Response**:
```json
{
  "items": [
    {
      "id": "...",
      "type": "deal",
      "category": "deals",
      "tagsJson": ["deals", "europe", "flights"],
      ...
    },
    ...
  ],
  "nextCursor": "..."
}
```

**Verification**:
- Should only return items with `tagsJson` containing "deals"
- All items should have `category: "deals"`

---

### 7. Get Feed - Specific Category (Guides)
**Request**: `GET /api/feed?category=guides`
**Headers**: 
```
Cookie: <session-cookie>
```

**Expected Response**:
```json
{
  "items": [
    {
      "id": "...",
      "type": "article",
      "category": "travel",
      "tagsJson": ["guides", "southeast-asia", "destinations"],
      ...
    },
    ...
  ],
  "nextCursor": "..."
}
```

**Verification**:
- Should only return items with `tagsJson` containing "guides"
- Items should be articles or travel-related

---

### 8. Verify User Interests
**Request**: `GET /api/users/me/interests`
**Headers**: 
```
Cookie: <session-cookie>
X-User-Id: <user-id>
```

**Expected Response**:
```json
{
  "interestIds": ["..."],
  "interests": [
    {
      "id": "...",
      "slug": "japan",
      "label": "Japan",
      "group": "travel"
    },
    ...
  ]
}
```

**Verification**:
- Should return user's selected interests
- Interest slugs should match tags in feed items

---

### 9. Set User Interests
**Request**: `POST /api/users/me/interests`
**Headers**: 
```
Content-Type: application/json
Cookie: <session-cookie>
X-User-Id: <user-id>
```
**Body**:
```json
{
  "interestIds": ["<interest-id-1>", "<interest-id-2>"]
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Interests updated successfully"
}
```

---

## Database Verification

### Check Feed Items
```sql
SELECT id, type, category, title, tagsJson, score 
FROM feed_items 
ORDER BY score DESC 
LIMIT 20;
```

**Verification**:
- Items should exist
- `tagsJson` should include category tag
- Scores should be set (deals: 0.9, others: 0.7)

### Check User Interests
```sql
SELECT ui.userId, i.slug, i.label, i.group
FROM user_interests ui
JOIN interests i ON ui.interestId = i.id
WHERE ui.userId = '<user-id>';
```

**Verification**:
- User interests should exist for authenticated users
- Interest slugs should match tags in feed items

### Check Interest Tags Match
```sql
-- Find feed items that match user interests
SELECT DISTINCT fi.id, fi.title, fi.tagsJson
FROM feed_items fi
CROSS JOIN user_interests ui
JOIN interests i ON ui.interestId = i.id
WHERE ui.userId = '<user-id>'
  AND JSON_CONTAINS(fi.tagsJson, JSON_QUOTE(i.slug));
```

**Verification**:
- Should return items with tags matching user interest slugs
- If empty, fallback should trigger

---

## Test Checklist

- [ ] Seed endpoint works for authenticated users
- [ ] Seed items are tagged with category tags
- [ ] Feed returns items when user has no interests
- [ ] Feed falls back to trending when filtered result is empty
- [ ] Feed returns personalized items when user has matching interests
- [ ] Category filtering works (deals, guides, reels, ai-news)
- [ ] Trending items are sorted by score
- [ ] Database tables exist (feed_items, user_interests, interests)
- [ ] Mapping logic uses correct categories

---

## Troubleshooting

### Empty Feed After Seeding
1. Check if items were created: `SELECT COUNT(*) FROM feed_items;`
2. Verify tags include category: `SELECT tagsJson FROM feed_items LIMIT 1;`
3. Check if user interests exist: `SELECT COUNT(*) FROM user_interests WHERE userId = '<user-id>';`

### Fallback Not Triggering
1. Check server logs for: `[Feed] Empty result, falling back to trending/seed content`
2. Verify fallback query removes interest filter
3. Check if database has items: `SELECT COUNT(*) FROM feed_items;`

### Category Filtering Not Working
1. Verify tags include category: `SELECT tagsJson FROM feed_items WHERE category = 'deals' LIMIT 1;`
2. Check tag filter logic in `feed.ts`: `tagFilter === 'deals'`
3. Verify items have correct tags: `SELECT tagsJson FROM feed_items;`

---

## Sample Postman Environment Variables

```json
{
  "base_url": "http://localhost:3001",
  "user_id": "<your-user-id>",
  "session_cookie": "<your-session-cookie>"
}
```

---

## Notes

- Seed endpoints are development-only by default
- Fallback logic ensures users always see content
- Category tags ensure proper filtering
- Trending content is sorted by score when no ranking context
