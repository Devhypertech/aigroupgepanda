# Feature Flags Documentation

## PRD_STRICT_MODE

When `PRD_STRICT_MODE=true`, the application enforces AI-only chat experience:

### What Gets Disabled:

1. **Video/Voice Calling**
   - `stream.createCall` tool returns error
   - `stream.suggestCall` tool returns error
   - Intent detection for calls/video returns `general.chat` instead
   - AI system prompt doesn't mention call capabilities

2. **Group Chat Invites**
   - `POST /api/invites` returns 404
   - `POST /api/invites/redeem` returns 404
   - Invite button hidden in chat UI
   - Invite modal not rendered
   - `/invite/[token]` page shows disabled message

3. **Group Channels**
   - `createGroupAiChannel()` throws error
   - `addMember()` throws error
   - Channel ID from URL params ignored
   - Only DM AI channels allowed (`dm_ai_${userId}`)

4. **Human-to-Human Messaging**
   - Channels validated to contain only user + AI bot
   - Invalid members automatically removed
   - Runtime guards ensure AI-only membership

### Environment Variables

**Backend (`apps/api/.env`):**
```env
PRD_STRICT_MODE=true
```

**Frontend (`apps/web/.env`):**
```env
NEXT_PUBLIC_PRD_STRICT_MODE=true
```

### Implementation Details

#### Backend Feature Flags
- Location: `apps/api/src/config/featureFlags.ts`
- Functions: `isFeatureEnabled()`, `getDisabledFeatureMessage()`
- Checks: `PRD_STRICT_MODE` env var

#### Frontend Feature Flags
- Location: `apps/web/lib/featureFlags.ts`
- Functions: `isFeatureEnabled()`
- Checks: `NEXT_PUBLIC_PRD_STRICT_MODE` env var

#### Channel Validation
- Location: `apps/api/src/services/stream/channelValidator.ts`
- Functions: `validateAiOnlyChannel()`, `cleanupChannelMembers()`
- Runs on: AI message processing, webhook events

### Testing

To test PRD strict mode:

1. Set environment variables:
   ```bash
   # Backend
   export PRD_STRICT_MODE=true
   
   # Frontend
   export NEXT_PUBLIC_PRD_STRICT_MODE=true
   ```

2. Verify:
   - [ ] Invite button not visible in chat
   - [ ] `/api/invites` returns 404
   - [ ] Call requests return error messages
   - [ ] Only DM channels work
   - [ ] Channel membership validated

3. Check logs:
   - Look for `[ChannelValidator]` messages
   - Verify invalid members are removed

### Re-enabling Features

To re-enable features, simply set:
```env
PRD_STRICT_MODE=false
# or remove the variable
```

All code remains intact, just wrapped in feature flag checks.

