# Button Click Handler Fix

## Summary

Fixed button clicks in assistant messages. All action buttons (e.g., "Set City", "Set Dates", "Set Budget", "Purchase Link") now work correctly.

## Changes Made

### 1. Enhanced Button Click Handler
**File**: `apps/web/components/chat/AssistantRenderer.tsx`

- **Unified Action Dispatcher**: Implemented a single `handleClick` function that handles all action types:
  - `open_url`: Opens URL in new tab
  - `send_message`: Sends message to chat via `onEvent` callback
  - `open_modal`: Opens modal (placeholder for future implementation)
  - `call_api`: Calls API endpoint, optionally sends message after
  - Legacy `handleAction`: Fallback for other action types

- **Event Handling**:
  - Added `e.preventDefault()` and `e.stopPropagation()` to prevent event bubbling
  - Added `type="button"` to prevent form submission
  - Added `pointer-events: auto` and `z-index: 10` to ensure buttons are clickable
  - Added comprehensive debug logging with `[UI_ACTION_CLICK]` prefix

### 2. Fixed send_message Handling
**File**: `apps/web/app/(app)/chat/ChatPageClient.tsx`

- **Ref-Based Approach**: 
  - Created `handleSendMessageRef` to store `handleSendMessage` function
  - Updated `handleSendMessage` to store itself in the ref
  - Updated `handleUIEventCallback` to use the ref instead of DOM manipulation

- **Improved Logging**:
  - Added `[UI_ACTION_CLICK]` logging for all button clicks
  - Added `[UI_ACTION_SEND_MESSAGE]` logging when messages are sent
  - Removed unreliable DOM manipulation fallback

### 3. Button Rendering
**File**: `apps/web/components/chat/AssistantRenderer.tsx`

- **Real React Buttons**: All buttons are rendered as real `<button>` elements (not HTML strings)
- **Proper Event Handlers**: Each button has an `onClick` handler that calls the unified dispatcher
- **CSS Fixes**: Added `cursor-pointer`, `relative z-10`, and `pointer-events: auto` to ensure buttons are clickable

## Action Types Supported

### 1. `send_message`
Sends a message to the chat.

**Example:**
```json
{
  "type": "send_message",
  "payload": {
    "message": "Set city to Tokyo"
  }
}
```

**Flow:**
1. Button click → `handleClick`
2. Calls `onEvent('send_message', { message: 'Set city to Tokyo' })`
3. `handleUIEventCallback` receives event
4. Calls `handleSendMessageRef.current('Set city to Tokyo')`
5. Message is sent to chat API

### 2. `open_url`
Opens a URL in a new tab.

**Example:**
```json
{
  "type": "open_url",
  "payload": {
    "url": "https://example.com/checkout"
  }
}
```

### 3. `open_modal`
Opens a modal (placeholder for future implementation).

**Example:**
```json
{
  "type": "open_modal",
  "payload": {
    "modalType": "city",
    "payload": {}
  }
}
```

### 4. `call_api`
Calls an API endpoint, optionally sends a message after.

**Example:**
```json
{
  "type": "call_api",
  "payload": {
    "path": "/api/checkout/intent",
    "method": "POST",
    "body": { "productId": "123" },
    "then": "send_message",
    "messageTemplate": "Checkout created: {result}"
  }
}
```

## Debug Logging

All button clicks are logged with the following prefixes:

- `[UI_ACTION_CLICK]`: Logs button label, action type, and payload
- `[UI_ACTION_SEND_MESSAGE]`: Logs message being sent
- `[UI_ACTION]`: Logs other action types (open_url, call_api, etc.)

**Example Console Output:**
```
[UI_ACTION_CLICK] { buttonLabel: "Set City", actionType: "send_message", actionPayload: { message: "Set city to Tokyo" } }
[UI_ACTION_SEND_MESSAGE] Set city to Tokyo
```

## Testing

### Test 1: "Set City" Button
1. Ask AI: "Plan a trip to Tokyo"
2. AI responds with "Set City" button
3. Click "Set City"
4. **Expected**: Message "Set city to Tokyo" is sent to chat
5. **Console**: Shows `[UI_ACTION_CLICK]` and `[UI_ACTION_SEND_MESSAGE]` logs

### Test 2: "Purchase Link" Button
1. Ask AI: "I want to buy a laptop"
2. AI responds with "Purchase Link" button
3. Click "Purchase Link"
4. **Expected**: Checkout URL opens in new tab
5. **Console**: Shows `[UI_ACTION] Opening URL: ...` log

### Test 3: Multiple Buttons
1. Ask AI: "Plan a trip"
2. AI responds with "Set City", "Set Dates", "Set Budget" buttons
3. Click each button
4. **Expected**: Each button sends the appropriate message
5. **Console**: Shows logs for each click

## Files Modified

1. **apps/web/components/chat/AssistantRenderer.tsx**
   - Enhanced `handleClick` function with unified action dispatcher
   - Added event prevention and proper button attributes
   - Added comprehensive logging

2. **apps/web/app/(app)/chat/ChatPageClient.tsx**
   - Added `handleSendMessageRef` to store `handleSendMessage` function
   - Updated `handleSendMessage` to store itself in ref
   - Updated `handleUIEventCallback` to use ref instead of DOM manipulation
   - Added debug logging

## Known Issues / Future Improvements

1. **Modal Support**: `open_modal` action type is a placeholder. Actual modal implementation needed for city/date/budget selection.

2. **API Call Error Handling**: Currently, API call errors are logged but not shown to user. Consider adding toast notifications.

3. **Button Loading States**: Buttons don't show loading states during API calls. Consider adding disabled state and spinner.

## Verification Checklist

- [x] All buttons are real React `<button>` elements (not HTML strings)
- [x] Buttons have proper `onClick` handlers
- [x] `send_message` actions send messages to chat
- [x] `open_url` actions open URLs in new tabs
- [x] Event bubbling is prevented
- [x] Buttons are clickable (no CSS blocking)
- [x] Debug logging works
- [x] No linter errors

