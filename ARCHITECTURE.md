# GePanda AI Companion - Agent-Based Architecture

## Overview

The system has been refactored from a room-based/template-driven chat system into an **agent-based AI companion** architecture. Users now experience a single, persistent AI companion that dynamically uses internal tools based on intent detection.

## Core Principles

1. **One AI Companion**: Single persistent AI identity across all conversations
2. **One Chat Experience**: No template/mode selection for users
3. **Intent-Driven**: AI detects user intent and routes to appropriate tools
4. **Tool Invisibility**: Tools are internal-only; users never see tool names or technical details
5. **Dynamic Tool Calling**: AI decides when and which tools to use based on conversation context

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (Next.js)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Single Chat Interface (No Template Selection)      │  │
│  └──────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ HTTP/WebSocket
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Express API Server (apps/api)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                           │  │
│  │  • POST /api/ai/message                               │  │
│  │  • POST /api/stream/webhook                           │  │
│  │  • GET/POST /api/rooms/:roomId/context                │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │                                           │
│  ┌───────────────▼──────────────────────────────────────┐  │
│  │  CompanionAgent Orchestrator                          │  │
│  │  • Intent Detection                                   │  │
│  │  • Tool Routing                                       │  │
│  │  • Response Generation                                │  │
│  └───────────────┬──────────────────────────────────────┘  │
│                  │                                           │
│      ┌───────────┴───────────┐                              │
│      │                       │                              │
│  ┌───▼────┐            ┌───▼────┐                         │
│  │ Intent │            │  Tools  │                         │
│  │Detection│            │ Registry│                         │
│  └────────┘            └────┬───┘                         │
│                             │                              │
│                  ┌──────────┼──────────┐                   │
│                  │          │          │                   │
│            ┌─────▼──┐  ┌───▼───┐  ┌───▼────┐            │
│            │ Travel │  │Connect│  │ Stream │            │
│            │ Tools  │  │ivity  │  │ Tools  │            │
│            └────────┘  └───────┘  └────────┘            │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  LLM Integration (Zhipu AI)                          │ │
│  │  • Natural language generation                       │ │
│  │  • Tool result summarization                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Stream Chat Integration                             │ │
│  │  • Message delivery                                  │ │
│  │  • Webhook handling                                  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
apps/api/src/
├── services/
│   ├── agent/                    # Agent orchestration
│   │   ├── types.ts              # Agent types (Intent, ToolResult, etc.)
│   │   ├── intent.ts              # Intent detection logic
│   │   ├── companionAgent.ts      # Main orchestrator
│   │   └── index.ts               # Exports
│   │
│   ├── ai/                        # LLM integration
│   │   ├── zhipu.ts               # Zhipu AI client
│   │   └── orchestrator.ts        # [DEPRECATED] Old template-based system
│   │
│   ├── stream/                    # Stream Chat integration
│   │   ├── streamClient.ts        # Stream client setup
│   │   └── webhooks.ts            # Webhook handler (uses agent)
│   │
│   ├── tripContext/              # Trip context storage
│   │   └── memoryStorage.ts       # In-memory context storage
│   │
│   └── invites/                   # Invite system
│       └── memoryStorage.ts       # Invite token storage
│
├── tools/                         # Internal tool implementations
│   ├── types.ts                   # Tool interface definitions
│   ├── registry.ts                # Tool registry and routing
│   ├── index.ts                   # Tool exports
│   │
│   ├── travel/                    # Travel-related tools
│   │   ├── planTrip.ts            # Trip planning
│   │   ├── buildItinerary.ts     # Itinerary generation
│   │   ├── destinationGuide.ts   # Destination information
│   │   ├── flightStatus.ts       # Flight tracking
│   │   └── index.ts
│   │
│   ├── connectivity/              # Connectivity tools
│   │   ├── recommendEsim.ts      # eSIM recommendations
│   │   ├── createCheckout.ts     # Rye checkout creation
│   │   └── index.ts
│   │
│   ├── stream/                    # Stream call tools
│   │   ├── suggestCall.ts         # Call suggestions
│   │   ├── createCall.ts         # Call creation
│   │   └── index.ts
│   │
│   └── memory/                    # Memory tools (Phase 2)
│       ├── savePreference.ts      # Save user preferences
│       ├── loadContext.ts         # Load user context
│       └── index.ts
│
├── routes/
│   ├── ai.ts                      # AI message endpoint
│   ├── rooms.ts                   # Room context management
│   ├── invites.ts                 # Invite resolution
│   └── stream.ts                  # Stream token/channel setup
│
├── db/                            # Database layer
│   ├── client.ts                  # Prisma client
│   ├── rooms.ts                   # Room operations
│   └── ...
│
└── index.ts                       # Express app entry point
```

---

## API Flow

### 1. User Sends Message

**Flow:**
```
User → Next.js Frontend → Stream Chat → Webhook → API Server
```

**Webhook Handler** (`/api/stream/webhook`):
1. Receives `message.new` event from Stream
2. Validates message (not from AI, has text)
3. Checks cooldown (prevents spam)
4. Calls `processMessage()` from CompanionAgent

### 2. Agent Processing

**CompanionAgent.processMessage()** flow:

```
┌─────────────────────────────────────────┐
│ 1. Intent Detection                     │
│    detectIntent(messageText)            │
│    → Returns: Intent enum               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│ 2. Tool Mapping                         │
│    intentToTool(intent)                  │
│    → Returns: tool name or null          │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
   Has Tool?      No Tool
       │               │
┌──────▼──────┐  ┌─────▼──────┐
│ 3a. Extract │  │ 3b. Direct │
│    Input    │  │    LLM     │
│             │  │   Call     │
└──────┬──────┘  └─────┬──────┘
       │               │
┌──────▼───────────────▼──────┐
│ 4. Execute Tool             │
│    executeTool(tool, input) │
│    → Returns: ToolResult    │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│ 5. Generate Response        │
│    • If tool has userMessage │
│      → Use it directly       │
│    • Else call LLM with      │
│      tool results as context │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│ 6. Post to Stream Channel   │
│    as 'gepanda-ai' user      │
└──────────────────────────────┘
```

### 3. Direct API Call (Alternative Flow)

**Endpoint:** `POST /api/ai/message`

**Request:**
```json
{
  "userId": "user123",
  "channelId": "room-abc123",
  "text": "I'm planning a trip to Japan"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI reply posted to channel",
  "text": "That sounds amazing! When are you planning to visit?",
  "intent": "travel.plan",
  "duration": 1250
}
```

---

## Intent Detection

### Supported Intents

| Intent | Description | Tool Mapped |
|--------|-------------|------------|
| `travel.plan` | Trip planning requests | `travel.planTrip` |
| `travel.itinerary` | Itinerary building | `travel.buildItinerary` |
| `travel.destination` | Destination information | `travel.destinationGuide` |
| `travel.flight` | Flight status/tracking | `travel.flightStatus` |
| `connectivity.esim` | eSIM recommendations | `connectivity.recommendEsim` |
| `connectivity.checkout` | Purchase checkout | `connectivity.createCheckout` |
| `stream.call` | Audio call request | `stream.suggestCall` |
| `stream.video` | Video call request | `stream.suggestCall` |
| `general.chat` | General conversation | None (direct LLM) |
| `unknown` | Unclear intent | None (direct LLM) |

### Detection Method

Currently uses **rule-based pattern matching**:
- Regex patterns for keywords
- Context-aware detection
- Can be enhanced with LLM classification later

---

## Tool System

### Tool Interface

```typescript
interface ToolResult {
  success: boolean;
  data?: any;              // Structured data for LLM
  error?: string;          // Error message (internal)
  userMessage?: string;     // Natural language for user
}
```

### Tool Execution Flow

1. **Input Extraction**: Agent extracts parameters from user message
2. **Tool Execution**: Tool function called with extracted input
3. **Result Processing**: 
   - If `userMessage` exists → Use directly
   - Else → Pass `data` to LLM for natural language generation
4. **Error Handling**: Graceful fallback with user-friendly messages

### Tool Categories

#### Travel Tools
- **planTrip**: Creates trip plans with destination, dates, preferences
- **buildItinerary**: Generates day-by-day itineraries
- **destinationGuide**: Provides destination information
- **flightStatus**: Checks flight status (API integration needed)

#### Connectivity Tools
- **recommendEsim**: Recommends eSIM plans based on destination/usage
- **createCheckout**: Creates Rye checkout sessions (API integration needed)

#### Stream Tools
- **suggestCall**: Suggests starting calls
- **createCall**: Creates Stream call sessions (API integration needed)

#### Memory Tools (Phase 2)
- **savePreference**: Saves user preferences
- **loadContext**: Loads user context

---

## Environment Variables

### Required
- `STREAM_API_KEY` - Stream Chat API key
- `STREAM_API_SECRET` - Stream Chat API secret

### Optional (Graceful Degradation)
- `ZHIPU_API_KEY` - AI features (warns if missing)
- `DATABASE_URL` - Database features (warns if missing)
- `RYE_API_KEY` - Checkout features (warns if missing)

---

## Logging

### What's Logged
- Intent detected
- Tool used (if any)
- Duration (ms)
- User ID, Channel ID
- Message length (not full content)

### What's NOT Logged
- Full message content
- API keys or secrets
- Sensitive user data

---

## Migration Notes

### Removed
- ❌ Template selection UI (still exists in frontend, needs removal)
- ❌ RoomTemplate routing in agent flows
- ❌ Template-specific prompts

### Kept (For Backward Compatibility)
- ✅ Room database schema (templates stored but not used)
- ✅ Old orchestrator.ts (deprecated, not used)
- ✅ Trip context system (still used)

### To Do
- [ ] Remove RoomTemplate selection from frontend UI
- [ ] Update database schema to remove template requirement
- [ ] Clean up old orchestrator.ts file
- [ ] Integrate actual APIs for flight status, eSIM, Rye checkout

---

## Example Conversation Flow

**User:** "I'm going to Japan next month"

**Agent Processing:**
1. Intent detected: `travel.plan`
2. Tool called: `travel.planTrip`
3. Tool extracts: destination="Japan", dates=null
4. Tool returns: `{ success: false, userMessage: "I'd love to help! Could you share your travel dates?" }`
5. Response posted: "I'd love to help! Could you share your travel dates?"

**User:** "March 15-25, 2024"

**Agent Processing:**
1. Intent detected: `travel.plan`
2. Tool called: `travel.planTrip` with dates
3. Tool returns: `{ success: true, data: {...}, userMessage: "Great! I've noted your trip..." }`
4. Response posted: "Great! I've noted your trip to Japan from March 15 to March 25. Would you like me to suggest an itinerary?"

---

## Benefits of New Architecture

1. **Simplified UX**: No template selection, one continuous conversation
2. **Flexible**: AI decides tool usage dynamically
3. **Extensible**: Easy to add new tools without UI changes
4. **Maintainable**: Clear separation of concerns
5. **Production-Safe**: Graceful degradation for missing services

---

## Next Steps

1. **Phase 1** (Current): ✅ Core agent system, intent detection, basic tools
2. **Phase 2**: Memory system, preference storage, context persistence
3. **Phase 3**: API integrations (flight status, eSIM providers, Rye)
4. **Phase 4**: Enhanced intent detection with LLM classification
5. **Phase 5**: Multi-turn tool chaining, complex workflows

