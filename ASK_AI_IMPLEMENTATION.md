# Ask AI Implementation Summary

## Overview
Implemented "Ask AI" as a single AI companion chat per authenticated user using Stream Chat and Zhipu GLM-4.6 Flash.

## Changes Made

### Backend (apps/api)

#### 1. New Endpoint: POST /api/companion/channel
- **File**: `apps/api/src/routes/companion.ts` (NEW)
- **Purpose**: Creates or retrieves a Stream channel with ID `ai-{userId}`
- **POST only**; GET / opening in browser is not supported.
- **Request**: `{ userId: string }`
- **Response**: `{ channelId: string }`
- **Behavior**:
  - Creates channel if it doesn't exist
  - Adds user and AI user (`gepanda_ai`) as members
  - Returns channel ID in format `ai-{userId}`

#### 2. New Endpoint: POST /api/ai/reply
- **File**: `apps/api/src/routes/ai.ts` (UPDATED)
- **Purpose**: Direct Zhipu GLM-4.6 Flash call and post reply to Stream channel
- **Request**: `{ channelId: string, text: string, userId: string }`
- **Response**: `{ success: boolean, message: string, text: string, duration: number }`
- **Behavior**:
  - Validates channel format (`ai-{userId}`)
  - Fetches recent messages (last 10) for context
  - Calls Zhipu GLM-4.6 Flash with conversation history
  - Posts AI reply to Stream channel as `gepanda_ai` user
  - Returns success response

#### 3. Updated AI Companion User ID
- **File**: `apps/api/src/services/stream/streamClient.ts` (UPDATED)
- **Change**: `AI_COMPANION_USER_ID` changed from `'gepanda-ai'` to `'gepanda_ai'` (underscore)

#### 4. Route Registration
- **File**: `apps/api/src/index.ts` (UPDATED)
- **Change**: Added `/api/companion` route registration

### Frontend (apps/web)

#### 5. Updated Chat Page
- **File**: `apps/web/app/(app)/chat/page.tsx` (UPDATED)
- **Changes**:
  - Uses `/api/companion/channel` instead of `/api/channels/ai`
  - Uses `/api/ai/reply` instead of `/api/ai/message`
  - Updated AI user ID check from `'ai_companion'` to `'gepanda_ai'`
  - Added `isSending` state for loading indicator
  - Disables input while sending message
  - Updated channel ID format comment from `ai_user_<userId>` to `ai-{userId}`

## Test Plan

### 1. Authentication Test
- [ ] Navigate to `/chat` without authentication
- [ ] Verify redirect to `/login?next=/chat`
- [ ] Login and verify redirect back to `/chat`

### 2. Channel Creation Test
- [ ] Login as user A
- [ ] Navigate to `/chat`
- [ ] Verify API call to `POST /api/companion/channel` with `{ userId: "userA" }`
- [ ] Verify response contains `{ channelId: "ai-userA" }`
- [ ] Verify Stream channel is created with correct ID
- [ ] Verify channel has two members: user A and `gepanda_ai`

### 3. Message Sending Test
- [ ] Send a message "Hello" in chat
- [ ] Verify message appears in UI immediately
- [ ] Verify input is disabled while sending (`isSending` state)
- [ ] Verify API call to `POST /api/ai/reply` with:
  ```json
  {
    "userId": "userA",
    "channelId": "ai-userA",
    "text": "Hello"
  }
  ```
- [ ] Verify AI response appears in chat within reasonable time (< 30s)
- [ ] Verify response is from `gepanda_ai` user
- [ ] Verify input is re-enabled after response

### 4. Conversation Context Test
- [ ] Send message 1: "I want to visit Japan"
- [ ] Wait for AI response
- [ ] Send message 2: "What's the best time to go?"
- [ ] Verify AI response references Japan context
- [ ] Verify recent messages (last 10) are included in API call

### 5. Multiple Users Test
- [ ] Login as user A, send messages, verify channel `ai-userA`
- [ ] Login as user B, send messages, verify channel `ai-userB`
- [ ] Verify users have separate conversation histories
- [ ] Verify no cross-contamination between users

### 6. Error Handling Test
- [ ] Test with invalid `userId` (should return 400)
- [ ] Test with invalid `channelId` format (should return 403)
- [ ] Test with missing ZHIPU_API_KEY (should return fallback message)
- [ ] Test network error (should show error, not crash)
- [ ] Test timeout (30s limit, should handle gracefully)

### 7. Loading States Test
- [ ] Verify "Connecting to chat..." shown during initialization
- [ ] Verify input disabled during `isConnecting`
- [ ] Verify input disabled during `isSending`
- [ ] Verify typing indicator works correctly

### 8. Message Persistence Test
- [ ] Send messages in chat
- [ ] Refresh page
- [ ] Verify messages are still present (loaded from Stream)
- [ ] Verify message order is correct

### 9. Real-time Updates Test
- [ ] Open chat in two browser windows (same user)
- [ ] Send message in window 1
- [ ] Verify message appears in both windows
- [ ] Verify AI response appears in both windows

### 10. Zhipu Integration Test
- [ ] Verify Zhipu API is called with correct model (`glm-4-flash`)
- [ ] Verify system prompt is included
- [ ] Verify conversation history is included
- [ ] Verify response is posted to Stream channel

## Files Changed

### Backend
1. `apps/api/src/routes/companion.ts` (NEW)
2. `apps/api/src/routes/ai.ts` (UPDATED - added `/reply` endpoint)
3. `apps/api/src/services/stream/streamClient.ts` (UPDATED - AI_COMPANION_USER_ID)
4. `apps/api/src/index.ts` (UPDATED - route registration)
5. `apps/api/src/services/ai/zhipu.ts` (UPDATED - comment)

### Frontend
6. `apps/web/app/(app)/chat/page.tsx` (UPDATED - new endpoints, loading state)

## API Endpoints

### POST /api/companion/channel
- **POST only**; GET / opening in browser is not supported.
- **Auth**: Accepts `userId` in request body
- **Returns**: `{ channelId: string }`
- **Channel Format**: `ai-{userId}`

### POST /api/ai/reply
- **Auth**: Accepts `{ channelId, text, userId }` in request body
- **Returns**: `{ success: boolean, message: string, text: string, duration: number }`
- **AI Model**: Zhipu GLM-4.6 Flash (`glm-4-flash`)
- **Posts**: AI reply to Stream channel as `gepanda_ai` user

## Notes

- Channel ID format changed from `ai_user_{userId}` to `ai-{userId}` for the new companion endpoint
- AI user ID changed from `gepanda-ai` to `gepanda_ai` (underscore)
- The `/api/ai/message` endpoint still exists for backward compatibility but uses agent orchestration
- The new `/api/ai/reply` endpoint directly calls Zhipu without agent orchestration
- Frontend now shows loading state during message sending

