# Testing Guide

Comprehensive testing guide for GePanda AI Group Chat backend APIs and features.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Auth APIs](#auth-apis)
3. [Feed APIs](#feed-apis)
4. [AI APIs](#ai-apis)
5. [Stream APIs](#stream-apis)
6. [Vision & Voice APIs](#vision--voice-apis)
7. [Database Health](#database-health)
8. [Widget Rendering](#widget-rendering)
9. [Admin APIs](#admin-apis)
10. [Automated Test Checklist](#automated-test-checklist)

---

## Prerequisites

### Environment Setup

1. **Start the API server:**
   ```bash
   cd apps/api
   npm run dev
   ```
   Server should start on `http://localhost:3001`

2. **Verify environment variables:**
   ```bash
   # Check API root endpoint
   curl http://localhost:3001/
   ```
   Should return API info with endpoint list.

3. **Required environment variables:**
   - `STREAM_API_KEY` & `STREAM_API_SECRET` - For Stream Chat
   - `ZHIPU_API_KEY` - For AI features
   - `DATABASE_URL` - For database operations
   - `ADMIN_EMAILS` - For admin endpoints (comma-separated)

---

## Auth APIs

### 1. Health Check

```bash
# GET /api/healthz
curl http://localhost:3001/api/healthz
```

**Expected Response:**
```json
{
  "ok": true,
  "time": "2024-01-20T10:00:00.000Z",
  "checks": {
    "server": "ok",
    "db": "ok",
    "streamKeys": "ok",
    "zhipuKey": "ok"
  }
}
```

**Verify:**
- ✅ `ok: true`
- ✅ All checks show "ok"
- ✅ `time` is current ISO timestamp

---

### 2. User Signup

```bash
# POST /api/auth/signup
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }' \
  -c cookies.txt
```

**Expected Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

**Verify:**
- ✅ Status code: 200
- ✅ User object returned with id, email, name
- ✅ Cookie `gp_session` is set (check cookies.txt)
- ✅ User can be queried from database

---

### 3. User Login

```bash
# POST /api/auth/login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

**Expected Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

**Verify:**
- ✅ Status code: 200
- ✅ User object returned
- ✅ Cookie `gp_session` is set
- ✅ Invalid credentials return 401

---

### 4. Get Current User

```bash
# GET /api/auth/me
curl http://localhost:3001/api/auth/me \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "test@example.com",
    "name": "Test User",
    "imageUrl": null
  }
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns current authenticated user
- ✅ Without cookie, returns 401

---

## Feed APIs

### 1. Get Feed Items

```bash
# GET /api/feed
curl http://localhost:3001/api/feed?category=for-you&limit=10 \
  -H "X-User-Id: user_123" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "items": [
    {
      "id": "feed_123",
      "type": "article",
      "category": "guides",
      "title": "Best Hotels in Tokyo",
      "description": "...",
      "imageUrl": "https://...",
      "tagsJson": ["japan", "tokyo", "hotels"],
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "nextCursor": "1234567890"
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns array of feed items
- ✅ Items have required fields (id, title, description, etc.)
- ✅ Pagination works with `cursor` parameter
- ✅ Category filtering works (`category=deals`, `category=guides`, etc.)

---

### 2. Save Feed Item

```bash
# POST /api/feed/:id/save
curl -X POST http://localhost:3001/api/feed/feed_123/save \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user_123" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "isSaved": true,
  "message": "Item saved"
}
```

**Verify:**
- ✅ Status code: 200
- ✅ `isSaved: true` on first save
- ✅ `isSaved: false` on unsave (second call)
- ✅ Item appears in saved feed

---

### 3. Get Saved Items

```bash
# GET /api/feed/saved
curl http://localhost:3001/api/feed/saved \
  -H "X-User-Id: user_123" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "items": [
    {
      "id": "feed_123",
      "title": "Best Hotels in Tokyo",
      "savedAt": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns only saved items for current user
- ✅ Items include `savedAt` timestamp

---

### 4. Why This Matters

```bash
# POST /api/feed/:id/why
curl -X POST http://localhost:3001/api/feed/feed_123/why \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "summary": "This article discusses...",
  "why": "This matters because...",
  "impact": "The impact is...",
  "actions": {
    "now": "Action to take now",
    "soon": "Action to take soon",
    "later": "Action to take later"
  },
  "cached": false
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns structured insights (summary, why, impact, actions)
- ✅ Second call returns `cached: true`
- ✅ All action fields (now, soon, later) are populated

---

### 5. Seed Feed (Dev Only)

```bash
# POST /api/feed/dev/seed
curl -X POST http://localhost:3001/api/feed/dev/seed \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "ok": true,
  "inserted": 25
}
```

**Verify:**
- ✅ Status code: 200 (only in development)
- ✅ Returns count of inserted items
- ✅ Feed items appear in `/api/feed` endpoint
- ✅ Production returns 403

---

## AI APIs

### 1. Chat Respond (with UI widgets)

```bash
# POST /api/chat/respond
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Plan a trip to Japan",
    "sessionId": "ai-user_123",
    "userId": "user_123"
  }' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "text": "I'll help you plan your trip to Japan!",
  "ui": {
    "id": "ui_123",
    "type": "trip_planner",
    "title": "Plan Your Japan Trip",
    "widgets": [
      {
        "kind": "input",
        "id": "destination",
        "label": "Destination",
        "value": "Japan"
      },
      {
        "kind": "datepicker",
        "id": "startDate",
        "label": "Start Date",
        "mode": "single"
      },
      {
        "kind": "slider",
        "id": "budget",
        "label": "Budget (USD)",
        "min": 500,
        "max": 10000,
        "value": 3000
      },
      {
        "kind": "button",
        "id": "generate",
        "label": "Generate Itinerary",
        "action": {
          "type": "event",
          "name": "generate_itinerary"
        }
      }
    ]
  }
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns `text` field with AI response
- ✅ Returns `ui` field with structured widgets
- ✅ Widgets have correct `kind`, `id`, `label`
- ✅ Button widgets have `action` with `type: "event"`

---

### 2. UI Event Handler

```bash
# POST /api/chat/ui/event
curl -X POST http://localhost:3001/api/chat/ui/event \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "ai-user_123",
    "uiId": "ui_123",
    "eventId": "generate_itinerary",
    "payload": {
      "destination": "Japan",
      "startDate": "2024-03-15",
      "endDate": "2024-03-25",
      "budget": 3000
    }
  }' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "text": "Here's your 10-day itinerary for Japan!",
  "ui": {
    "id": "ui_456",
    "type": "cards",
    "widgets": [
      {
        "kind": "card",
        "id": "day_1",
        "title": "Day 1 in Japan",
        "description": "Explore Tokyo..."
      }
    ]
  }
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns updated UI based on event
- ✅ For `generate_itinerary`, returns itinerary cards
- ✅ For `search_flights`, returns flight cards
- ✅ For `get_packing_list`, returns checklist widget

---

### 3. Vision: Image Analysis

```bash
# POST /api/vision/analyze
curl -X POST http://localhost:3001/api/vision/analyze \
  -F "image=@passport.jpg" \
  -F "prompt=Extract passport details" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "ocrText": "PASSPORT\nName: John Doe\n...",
    "analysis": "This is a passport document...",
    "insights": [
      "Passport expires in 2 years",
      "Valid for travel to most countries"
    ],
    "extractedData": {
      "name": "John Doe",
      "passportNumber": "AB123456",
      "expiryDate": "2026-01-15"
    }
  },
  "userId": "user_123"
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns OCR text extracted from image
- ✅ Returns AI analysis
- ✅ Returns structured extracted data
- ✅ Works with image files, imageUrl, or imageBase64

---

### 4. Vision: OCR Only

```bash
# POST /api/vision/ocr
curl -X POST http://localhost:3001/api/vision/ocr \
  -F "image=@document.jpg" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "text": "Extracted text from document...",
  "userId": "user_123"
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns only extracted text
- ✅ No AI analysis included

---

### 5. Voice: Speech-to-Text

```bash
# POST /api/voice/transcribe
curl -X POST http://localhost:3001/api/voice/transcribe \
  -F "audio=@recording.webm" \
  -F "language=en-US" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "transcription": {
    "text": "I want to plan a trip to Japan",
    "language": "en-US",
    "confidence": 0.95
  },
  "userId": "user_123"
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns transcribed text
- ✅ Includes language detection
- ✅ Includes confidence score (if available)
- ✅ Works with audio files, audioUrl, or audioBase64

---

### 6. Voice: Translate Text

```bash
# POST /api/voice/translate
curl -X POST http://localhost:3001/api/voice/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, I want to book a hotel",
    "targetLanguage": "zh",
    "sourceLanguage": "en"
  }' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "translation": {
    "translatedText": "你好，我想预订一家酒店",
    "sourceLanguage": "en",
    "targetLanguage": "zh"
  }
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns translated text
- ✅ Includes source and target language
- ✅ Supports common languages (en, zh, es, fr, etc.)

---

## Stream APIs

These endpoints are **POST only**. Opening the URL in a browser (GET) will not work; use the dev page at `/dev` or curl with `-X POST` and a JSON body.

### 1. Generate Stream Token

```bash
# POST /api/stream/token (POST only; GET not supported)
curl -X POST http://localhost:3001/api/stream/token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "username": "Test User"
  }' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user_123"
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns valid JWT token
- ✅ Token can be used with Stream Chat client
- ✅ Token expires after configured time

---

### 2. Create/Get Companion Channel

```bash
# POST /api/companion/channel (POST only; GET not supported)
curl -X POST http://localhost:3001/api/companion/channel \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123"
  }' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "channelId": "ai-user_123"
}
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns channel ID in format `ai-{userId}`
- ✅ Channel exists in Stream Chat
- ✅ User and AI companion are members

---

## Database Health

### 1. Database Health Check

```bash
# GET /db/health
curl http://localhost:3001/db/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "database": {
    "connected": true,
    "type": "postgresql",
    "tables": {
      "User": 10,
      "FeedItem": 25,
      "Interest": 15
    }
  }
}
```

**Verify:**
- ✅ Status code: 200
- ✅ `connected: true`
- ✅ Table counts are accurate
- ✅ Database type matches configuration

---

### 2. Verify Tables Exist

```bash
# Check via Prisma Studio or direct SQL
# In pgAdmin or psql:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Expected Tables:**
- ✅ `users`
- ✅ `feed_items`
- ✅ `interests`
- ✅ `user_interests`
- ✅ `feed_interactions`
- ✅ `guest_users`

---

## Widget Rendering

### 1. Test Trip Planner Widget

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message": "Plan a trip to Japan", "sessionId": "test", "userId": "user_123"}'
```

**Verify UI Widgets:**
- ✅ `type: "trip_planner"`
- ✅ Contains `input` widget for destination
- ✅ Contains `datepicker` widgets for dates
- ✅ Contains `slider` widget for budget
- ✅ Contains `chips` widget for travel style
- ✅ Contains `button` widget with `action.type: "event"`

---

### 2. Test Packing Checklist Widget

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/ui/event \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test",
    "uiId": "ui_123",
    "eventId": "get_packing_list",
    "payload": {"destination": "Thailand", "tripType": "beach"}
  }'
```

**Verify:**
- ✅ Returns `type: "checklist"`
- ✅ Contains `checklist` widget with items
- ✅ Items have `id`, `label`, `checked` fields
- ✅ Items are relevant to destination/trip type

---

### 3. Test Budget Planner Widget

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/ui/event \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test",
    "uiId": "ui_123",
    "eventId": "calculate_budget",
    "payload": {"destination": "Japan", "duration": 7, "totalBudget": 5000}
  }'
```

**Verify:**
- ✅ Returns budget breakdown cards
- ✅ Each card shows category, amount, percentage
- ✅ Total matches input budget
- ✅ Categories include: Flights, Hotels, Food, Activities, etc.

---

### 4. Test Form Widget

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a registration form", "sessionId": "test", "userId": "user_123"}'
```

**Verify:**
- ✅ Returns `form` widget
- ✅ Contains `fields` array
- ✅ Each field has `id`, `type`, `label`, `required`
- ✅ Form has `submitAction` with event name

---

### 5. Test Checkout Widget

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/ui/event \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test",
    "uiId": "ui_123",
    "eventId": "get_product_recommendations",
    "payload": {"destination": "Japan"}
  }'
```

**Verify:**
- ✅ Returns product cards
- ✅ Each card has `title`, `description`, `price`, `imageUrl`
- ✅ Cards have `actions` with `type: "event"`

---

### 6. Test Layout Widgets

**Request:**
```bash
curl -X POST http://localhost:3001/api/chat/respond \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a multi-section form with name and email fields", "sessionId": "test", "userId": "user_123"}'
```

**Verify:**
- ✅ Returns widgets with `kind: "section"`
- ✅ Sections can contain nested widgets
- ✅ `row` and `column` widgets work for layouts
- ✅ `grid` widgets create responsive grids

---

## Admin APIs

### 1. Get All Users (Admin Only)

```bash
# GET /api/admin/users
curl http://localhost:3001/api/admin/users?includeHistory=true \
  -H "X-User-Id: admin_user_id" \
  -b admin_cookies.txt
```

**Expected Response:**
```json
{
  "users": [
    {
      "id": "user_123",
      "name": "Test User",
      "email": "test@example.com",
      "createdAt": "2024-01-20T10:00:00.000Z",
      "interests": [
        {"id": "int_1", "name": "Japan", "slug": "japan"}
      ],
      "interestsCount": 1,
      "savedItems": [
        {
          "id": "feed_123",
          "title": "Best Hotels in Tokyo",
          "savedAt": "2024-01-20T15:00:00.000Z"
        }
      ],
      "savedCount": 1,
      "conversationHistory": [
        {
          "id": "msg_1",
          "text": "Plan a trip to Japan",
          "isAI": false,
          "timestamp": "2024-01-20T10:00:00.000Z"
        }
      ],
      "conversationCount": 1
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0,
  "includeHistory": true
}
```

**Verify:**
- ✅ Status code: 200 (only for admin users)
- ✅ Returns full user list
- ✅ Includes interests (full objects, not just count)
- ✅ Includes saved items (full list)
- ✅ Includes conversation history if `includeHistory=true`
- ✅ Non-admin users get 403
- ✅ Search works with `?search=email`

---

### 2. Get Specific User (Admin Only)

```bash
# GET /api/admin/users/:userId
curl http://localhost:3001/api/admin/users/user_123 \
  -H "X-User-Id: admin_user_id" \
  -b admin_cookies.txt
```

**Verify:**
- ✅ Status code: 200
- ✅ Returns detailed user information
- ✅ Includes full conversation history (last 100 messages)
- ✅ Includes UI specs in conversation history
- ✅ 404 if user not found

---

## Automated Test Checklist

### Quick Health Check Script

```bash
#!/bin/bash
# quick-health-check.sh

API_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Running Quick Health Check..."

# 1. Health Check
echo -n "Health Check: "
HEALTH=$(curl -s "$API_URL/api/healthz")
if echo "$HEALTH" | grep -q '"ok":true'; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "$HEALTH"
fi

# 2. Database Health
echo -n "Database Health: "
DB_HEALTH=$(curl -s "$API_URL/db/health")
if echo "$DB_HEALTH" | grep -q '"connected":true'; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "$DB_HEALTH"
fi

# 3. Feed Endpoint
echo -n "Feed API: "
FEED=$(curl -s "$API_URL/api/feed?limit=1")
if echo "$FEED" | grep -q '"items"'; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "$FEED"
fi

# 4. AI Chat (requires ZHIPU_API_KEY)
echo -n "AI Chat API: "
CHAT=$(curl -s -X POST "$API_URL/api/chat/respond" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","sessionId":"test","userId":"test"}')
if echo "$CHAT" | grep -q '"text"'; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "$CHAT"
fi

echo "✅ Health check complete!"
```

---

### Comprehensive Test Suite

#### Test Categories

1. **Authentication Tests**
   - [ ] Signup with valid email/password
   - [ ] Signup with invalid email (should fail)
   - [ ] Signup with weak password (should fail)
   - [ ] Login with valid credentials
   - [ ] Login with invalid credentials (should fail)
   - [ ] Get current user with valid session
   - [ ] Get current user without session (should fail)

2. **Feed Tests**
   - [ ] Get feed items (default category)
   - [ ] Get feed items by category (deals, guides, reels, ai-news)
   - [ ] Pagination works (cursor-based)
   - [ ] Save feed item
   - [ ] Unsave feed item
   - [ ] Get saved items
   - [ ] Why this matters generates insights
   - [ ] Why this matters returns cached result on second call
   - [ ] Feed ranking respects user interests
   - [ ] Feed ranking includes explore items

3. **AI Chat Tests**
   - [ ] Chat respond returns text
   - [ ] Chat respond returns UI widgets for trip planning
   - [ ] Chat respond returns UI widgets for flight search
   - [ ] Chat respond returns UI widgets for packing list
   - [ ] UI event handler processes generate_itinerary
   - [ ] UI event handler processes search_flights
   - [ ] UI event handler processes get_packing_list
   - [ ] UI event handler processes calculate_budget
   - [ ] UI widgets are valid JSON schema
   - [ ] Nested layout widgets render correctly

4. **Vision Tests**
   - [ ] Image analysis with file upload
   - [ ] Image analysis with imageUrl
   - [ ] Image analysis with imageBase64
   - [ ] OCR extraction works
   - [ ] OCR returns structured data
   - [ ] Invalid image format rejected
   - [ ] Large image rejected (>10MB)

5. **Voice Tests**
   - [ ] Speech-to-text with file upload
   - [ ] Speech-to-text with audioUrl
   - [ ] Speech-to-text with audioBase64
   - [ ] Translation works (en → zh)
   - [ ] Translation works (zh → en)
   - [ ] Invalid audio format rejected
   - [ ] Large audio rejected (>25MB)

6. **Stream Chat Tests**
   - [ ] Generate token for user
   - [ ] Token is valid JWT
   - [ ] Create companion channel
   - [ ] Channel has correct members (user + AI)
   - [ ] Channel ID format is correct (ai-{userId})

7. **Database Tests**
   - [ ] Database connection works
   - [ ] All required tables exist
   - [ ] User creation works
   - [ ] Feed item creation works
   - [ ] Interest assignment works
   - [ ] Feed interaction tracking works

8. **Admin Tests**
   - [ ] Admin endpoint requires authentication
   - [ ] Admin endpoint requires admin email
   - [ ] Non-admin users get 403
   - [ ] Admin can view all users
   - [ ] Admin can view user details
   - [ ] Admin can view conversation history
   - [ ] Search functionality works

9. **Widget Rendering Tests**
   - [ ] Trip planner widget renders
   - [ ] Form widget renders with fields
   - [ ] Checklist widget renders with items
   - [ ] Card widget renders with image
   - [ ] Layout widgets (section, row, column, grid) render
   - [ ] Checkout widget renders with items
   - [ ] Planning widget renders timeline

---

### Manual Testing Workflow

1. **Start Services:**
   ```bash
   # Terminal 1: API Server
   cd apps/api && npm run dev
   
   # Terminal 2: Database (if using Docker)
   docker-compose up -d
   
   # Terminal 3: Web App (for frontend testing)
   cd apps/web && npm run dev
   ```

2. **Test Authentication Flow:**
   - Sign up new user
   - Log in
   - Verify session cookie
   - Access protected endpoints

3. **Test Feed Flow:**
   - Seed feed items (dev only)
   - View feed
   - Save item
   - View saved items
   - Get "Why this matters" insights

4. **Test AI Chat Flow:**
   - Send message: "Plan a trip to Japan"
   - Verify UI widgets appear
   - Fill out trip planner form
   - Click "Generate Itinerary"
   - Verify itinerary cards appear

5. **Test Vision Flow:**
   - Upload passport image
   - Verify OCR extraction
   - Verify AI analysis
   - Check extracted data structure

6. **Test Voice Flow:**
   - Upload audio recording
   - Verify transcription
   - Translate transcribed text
   - Verify translation accuracy

---

### Expected Response Times

- Health check: < 100ms
- Feed API: < 500ms
- AI Chat: < 3s (depends on Zhipu API)
- Vision Analysis: < 5s (depends on image size and Zhipu API)
- Voice Transcription: < 10s (depends on audio length and service)
- Database queries: < 200ms

---

### Common Issues & Solutions

1. **401 Unauthorized:**
   - Check if session cookie is set
   - Verify user is logged in
   - Check `X-User-Id` header for guest users

2. **403 Forbidden (Admin):**
   - Verify email is in `ADMIN_EMAILS` env var
   - Check user is not a guest
   - Verify admin middleware is applied

3. **500 Internal Server Error:**
   - Check API server logs
   - Verify environment variables are set
   - Check database connection
   - Verify external API keys (Zhipu, Stream, etc.)

4. **Empty Feed:**
   - Run seed endpoint: `POST /api/feed/dev/seed`
   - Check database has feed items
   - Verify feed repository query logic

5. **AI Not Responding:**
   - Check `ZHIPU_API_KEY` is set
   - Verify Zhipu API is accessible
   - Check API rate limits
   - Review AI service logs

---

### Performance Benchmarks

- **Concurrent Requests:** System should handle 100+ concurrent requests
- **Database Queries:** Should use indexes (check query plans)
- **AI Response Time:** Should be < 3s for text, < 5s for vision
- **File Uploads:** Should handle up to 10MB images, 25MB audio

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:api
      - run: npm run test:health
```

---

## Test Data Setup

### Seed Test Users

```bash
# Create test users via signup endpoint
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123","name":"Admin User"}'

curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"user123","name":"Test User"}'
```

### Seed Feed Items

```bash
# Seed feed (dev only)
curl -X POST http://localhost:3001/api/feed/dev/seed
```

### Seed Interests

```bash
# Seed interests
curl -X POST http://localhost:3001/api/interests/seed
```

---

## Monitoring & Logging

### Key Metrics to Monitor

1. **API Response Times:**
   - Average response time per endpoint
   - P95/P99 response times
   - Error rates

2. **Database Performance:**
   - Query execution times
   - Connection pool usage
   - Query slow logs

3. **AI Service Health:**
   - Zhipu API response times
   - API error rates
   - Token usage

4. **Stream Chat Health:**
   - Connection success rate
   - Message delivery rate
   - Channel creation success

---

## Next Steps

1. Set up automated test suite (Jest/Mocha)
2. Add integration tests for critical flows
3. Set up monitoring dashboard
4. Configure alerting for failures
5. Add performance regression tests

---

## Support

For issues or questions:
- Check API logs: `apps/api/logs/`
- Review environment variables: `apps/api/.env`
- Check database: `npx prisma studio`
- Review Stream Chat dashboard

