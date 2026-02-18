# Webhook and AI Response Fixes

## Issues Fixed

### 1. Duplicate Response Prevention
**Problem**: The old logic checked if the most recent message was from AI, which incorrectly blocked responses when users sent multiple messages quickly.

**Fix**: 
- Now tracks which specific message IDs we've already responded to
- Uses `respondedMessages` Set to track processed messages
- Only skips if we've already responded to THIS specific message

### 2. Cooldown Logic
**Problem**: 10-second cooldown was too aggressive and blocked legitimate responses to new messages.

**Fix**:
- Reduced cooldown to 5 seconds
- Cooldown is now informational (logs warning) but doesn't block new messages
- Each unique message gets a response, even if sent quickly

### 3. Error Handling
**Problem**: If `processMessage` failed, the webhook would fail silently and user wouldn't get a response.

**Fix**:
- Added try-catch around `processMessage`
- Provides fallback response if processing fails
- Always ensures a response is sent, even on errors
- Removes message from `respondedMessages` on error so it can be retried

### 4. Response Validation
**Problem**: If agent returned empty response, it would fail silently.

**Fix**:
- Added validation to ensure response text is never empty
- Provides default fallback response if empty
- Always sends something to the user

## Changes Made

### `apps/api/src/services/stream/webhooks.ts`

1. **Message Tracking**:
   ```typescript
   const respondedMessages = new Set<string>();
   // Tracks which message IDs we've already processed
   ```

2. **Improved Duplicate Check**:
   ```typescript
   if (respondedMessages.has(message.id)) {
     return res.json({ received: true });
   }
   ```

3. **Better Error Handling**:
   ```typescript
   try {
     agentResponse = await processMessage(...);
   } catch (error) {
     // Fallback response instead of throwing
     agentResponse = { text: "I'm here to help!..." };
   }
   ```

4. **Response Validation**:
   ```typescript
   if (!agentResponse || !agentResponse.text || agentResponse.text.trim() === '') {
     agentResponse = { text: "I'm here to help!..." };
   }
   ```

### `apps/api/src/services/agent/companionAgent.ts`

1. **Better Fallback Responses**:
   ```typescript
   if (!finalResponseText || finalResponseText.trim() === '') {
     finalResponseText = "I'm here to help! Could you tell me more?";
   }
   ```

2. **Improved Error Messages**:
   - More helpful fallback messages
   - Never returns empty responses

## Testing Scenarios

### Scenario 1: User sends 3 messages quickly
**Before**: Only first message gets response
**After**: All 3 messages get responses (each unique message ID)

### Scenario 2: AI processing fails
**Before**: No response sent, user sees nothing
**After**: Fallback response sent: "I'm here to help! I'm having a bit of trouble..."

### Scenario 3: Empty response from agent
**Before**: Could fail silently
**After**: Default response sent: "I'm here to help! Could you tell me more?"

### Scenario 4: Stream API fails
**Before**: Error thrown, webhook fails
**After**: Error logged, message removed from tracking for retry

## Logging Improvements

Added detailed logging:
- Message ID being processed
- Response length and intent
- Cooldown status
- Error details (without secrets)

## Next Steps for Debugging

If AI still not working, check:

1. **ZHIPU_API_KEY**: Is it set? Check logs for "ZHIPU_API_KEY not set"
2. **Webhook URL**: Is Stream configured to send webhooks to `/api/stream/webhook`?
3. **Channel ID**: Check logs for "Could not extract channel ID"
4. **Message Format**: Check logs for "Stream webhook event" to see if events are received
5. **Agent Errors**: Check logs for "[Agent] LLM error" or "[Webhook] Error processing"

## Common Issues

### Issue: "AI already responded" when it hasn't
**Cause**: Message ID tracking issue
**Fix**: Check `respondedMessages` Set, clear if needed

### Issue: No response after 3 messages
**Cause**: Cooldown or duplicate check blocking
**Fix**: Reduced cooldown, improved duplicate check

### Issue: Empty responses
**Cause**: Agent returning empty string
**Fix**: Added validation and fallback

