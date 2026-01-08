# Invite Link Testing Guide

## Setup

1. **Run database migration** to create the `invite_links` table:
   ```bash
   cd apps/api
   npm run db:migrate
   ```

2. **Start the servers**:
   ```bash
   # Terminal 1: API Server
   npm run dev:api
   
   # Terminal 2: Web App
   npm run dev:web
   ```

## Testing Steps

### 1. Create a Room and Generate Invite Link

**Step 1.1**: Join a room manually first (to create it in DB)
- Go to http://localhost:3000
- Enter:
  - Room ID: `test-room-123`
  - User ID: `user1`
  - Username: `Alice`
  - Template: Any
- Click "Join Room"

**Step 1.2**: Generate an invite link via API
```bash
curl -X POST http://localhost:3001/api/rooms/test-room-123/invite \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "inviteUrl": "http://localhost:3000?invite=abc123...",
  "token": "abc123..."
}
```

**Step 1.3**: Generate invite link with expiration (optional)
```bash
curl -X POST http://localhost:3001/api/rooms/test-room-123/invite \
  -H "Content-Type: application/json" \
  -d '{"expiresAt": "2024-12-31T23:59:59Z"}'
```

### 2. Resolve Invite Token

**Step 2.1**: Resolve token to get roomId
```bash
curl http://localhost:3001/api/invites/abc123...
```

**Expected Response**:
```json
{
  "roomId": "test-room-123"
}
```

**Step 2.2**: Test invalid token
```bash
curl http://localhost:3001/api/invites/invalid-token
```

**Expected Response**: 404 with error message

### 3. Join Room via Invite Link (Web UI)

**Method A: Using Invite URL**
1. Copy the `inviteUrl` from step 1.2
2. Open it in a new browser tab/window
3. The Room ID should auto-fill
4. Enter User ID and Username
5. Click "Join Room"

**Method B: Using Invite Token**
1. Go to http://localhost:3000
2. In the "Or join with invite link" section, paste either:
   - The full invite URL: `http://localhost:3000?invite=abc123...`
   - Or just the token: `abc123...`
3. Click "Use Invite"
4. Room ID should auto-fill
5. Enter User ID and Username
6. Click "Join Room"

### 4. Test Expired Invite (if expiration was set)

1. Create an invite with expiration in the past:
   ```bash
   curl -X POST http://localhost:3001/api/rooms/test-room-123/invite \
     -H "Content-Type: application/json" \
     -d '{"expiresAt": "2020-01-01T00:00:00Z"}'
   ```

2. Try to resolve it:
   ```bash
   curl http://localhost:3001/api/invites/<token-from-response>
   ```

3. **Expected**: 404 error (expired invite)

## Verification

After joining via invite link:
- ✅ User should see the room chat
- ✅ User should see previous messages (if any)
- ✅ User should be able to send messages
- ✅ User should appear in `room_members` table
- ✅ Socket events work normally (no changes to event names/payloads)

## Database Verification

Check the database:
```bash
cd apps/api
npm run db:studio
```

Verify:
- `invite_links` table has the created invite
- `room_members` table has the new member
- `messages` table shows messages

## Edge Cases to Test

1. **Invalid token**: Should show error, not crash
2. **Expired token**: Should return 404
3. **Non-existent room**: Should return 404 when creating invite
4. **Paste full URL vs token**: Both should work
5. **Multiple users joining same invite**: All should succeed

