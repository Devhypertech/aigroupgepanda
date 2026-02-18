# API Flow Reference

## Primary Flows

### 1. Webhook Flow (Automatic AI Response)

```
Stream Chat Webhook
    ↓
POST /api/stream/webhook
    ↓
setupStreamWebhooks()
    ↓
processMessage({
  userId,
  channelId,
  messageText,
  recentMessages,
  tripContext
})
    ↓
┌─────────────────────────────────┐
│ CompanionAgent                   │
│                                  │
│ 1. detectIntent()               │
│    → Intent enum                 │
│                                  │
│ 2. intentToTool()               │
│    → Tool name or null           │
│                                  │
│ 3. If tool exists:               │
│    - extractToolInput()          │
│    - executeTool()               │
│    - Get ToolResult              │
│                                  │
│ 4. Generate response:             │
│    - If toolResult.userMessage   │
│      → Use directly              │
│    - Else call LLM with context  │
│                                  │
│ 5. Return AgentResponse          │
└─────────────────────────────────┘
    ↓
Post to Stream Channel
    ↓
User sees AI response
```

### 2. Direct API Call Flow

```
Client Application
    ↓
POST /api/ai/message
Body: {
  userId: string,
  channelId: string,
  text: string
}
    ↓
Validation (Zod)
    ↓
Fetch recent messages from Stream
    ↓
Load trip context (if available)
    ↓
processMessage() [Same as above]
    ↓
Post to Stream Channel
    ↓
Return JSON response:
{
  success: true,
  text: string,
  intent: Intent,
  duration: number
}
```

## Tool Execution Flow

```
Intent Detected
    ↓
Tool Name Resolved
    ↓
Extract Parameters from Message
    ↓
Execute Tool Function
    ↓
┌─────────────────────┐
│ Tool Returns:       │
│                     │
│ ToolResult {        │
│   success: boolean  │
│   data?: any        │
│   error?: string    │
│   userMessage?: str │
│ }                   │
└─────────────────────┘
    ↓
    ├─→ If userMessage exists
    │   → Use as final response
    │
    └─→ Else
        → Pass data to LLM
        → Generate natural response
```

## Intent → Tool Mapping

```
travel.plan          → travel.planTrip
travel.itinerary     → travel.buildItinerary
travel.destination   → travel.destinationGuide
travel.flight        → travel.flightStatus
connectivity.esim    → connectivity.recommendEsim
connectivity.checkout → connectivity.createCheckout
stream.call          → stream.suggestCall
stream.video         → stream.suggestCall
general.chat         → null (direct LLM)
unknown              → null (direct LLM)
```

## Error Handling

```
Tool Execution Error
    ↓
Tool returns: { success: false, error: "...", userMessage: "..." }
    ↓
Agent uses userMessage or falls back to LLM
    ↓
Graceful user-facing error message
    ↓
No technical details exposed
```

## Logging Points

1. **Request received**: userId, channelId, textLength
2. **Intent detected**: intent enum
3. **Tool execution**: tool name, duration
4. **Response posted**: duration, success
5. **Errors**: error type, duration (no secrets)

