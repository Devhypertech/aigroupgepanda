# AI Memory and Personality Design

## Overview

The memory and personality system enables GePanda to be a persistent, personalized AI companion that remembers user preferences, learns from interactions, and behaves proactively but non-intrusively.

---

## Memory Schema

### Long-Term Memory

Persistent storage of user preferences, trip history, and patterns.

```typescript
interface LongTermMemory {
  userId: string;
  
  // User preferences (extensible)
  preferences: {
    seatPreference?: 'window' | 'aisle' | 'no-preference';
    travelStyle?: 'budget' | 'comfort' | 'luxury' | 'adventure';
    dietaryRestrictions?: string[];
    accessibilityNeeds?: string[];
    language?: string;
    currency?: string;
    timezone?: string;
    [key: string]: any;
  };
  
  // Trip history
  trips: Array<{
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    status: 'planned' | 'upcoming' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
  }>;
  
  // Conversation patterns
  patterns: {
    frequentlyAskedDestinations?: string[];
    commonInterests?: string[];
    preferredBookingMethods?: string[];
  };
  
  // Metadata
  metadata: {
    firstInteraction?: string;
    lastInteraction?: string;
    totalConversations?: number;
    averageTripDuration?: number;
  };
}
```

### Short-Term Memory

Current conversation context and active state.

```typescript
interface ShortTermMemory {
  conversationId: string;
  userId: string;
  
  // Current conversation state
  currentTopic?: string;
  activeTrip?: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    travelers?: number;
    budget?: string;
    interests?: string[];
  };
  
  // Recent messages (last 20)
  recentMessages: Array<{
    role: 'user' | 'ai';
    text: string;
    timestamp: string;
  }>;
  
  // Pending actions
  pendingActions?: Array<{
    type: string;
    data: any;
    timestamp: string;
  }>;
  
  // Conversation metadata
  startedAt: string;
  lastActivity: string;
  messageCount: number;
}
```

---

## Update Rules

### When to Update Long-Term Memory

#### 1. Explicit Preferences
**Trigger**: User explicitly states a preference
- "I prefer window seats" → `preferences.seatPreference = 'window'`
- "I'm vegetarian" → `preferences.dietaryRestrictions.push('vegetarian')`
- "I like budget travel" → `preferences.travelStyle = 'budget'`

**Rule**: Save immediately when explicitly stated

#### 2. Trip Confirmation
**Trigger**: User confirms trip details
- "Yes, book that trip" → Create trip in `trips` array
- "Trip completed" → Update trip status to `'completed'`

**Rule**: Save when user confirms, not when just mentioned

#### 3. Pattern Recognition
**Trigger**: User mentions same thing 3+ times
- Asks about "Japan" 3 times → Add to `patterns.frequentlyAskedDestinations`

**Rule**: Track frequency, save after threshold

#### 4. Metadata Updates
**Trigger**: Every interaction
- `metadata.lastInteraction` → Updated on every message
- `metadata.totalConversations` → Incremented on every conversation
- `metadata.firstInteraction` → Set on first interaction only

**Rule**: Update automatically, no user action needed

### When to Update Short-Term Memory

#### 1. Every Message
**Trigger**: User or AI sends message
- Add to `recentMessages` array
- Keep only last 20 messages
- Update `lastActivity` timestamp

**Rule**: Always update, no exceptions

#### 2. Trip Planning
**Trigger**: User provides trip details
- "Going to Japan" → `activeTrip.destination = 'Japan'`
- "March 15-25" → `activeTrip.startDate/endDate` updated
- "2 people" → `activeTrip.travelers = 2`

**Rule**: Update as user provides information

#### 3. Topic Changes
**Trigger**: Conversation shifts topics
- "Let's talk about flights" → `currentTopic = 'flights'`
- "What about restaurants?" → `currentTopic = 'restaurants'`

**Rule**: Update when clear topic shift detected

### When NOT to Update

#### 1. Casual Mentions
- "I like pizza" → Not a travel preference, don't save
- "It's sunny today" → Temporary info, don't save

**Rule**: Only save travel-relevant, persistent information

#### 2. Hypotheticals
- "What if I went to Japan?" → Not a real trip, don't save
- "Maybe I'll go to Paris" → Uncertain, don't save

**Rule**: Only save confirmed, definite information

#### 3. Questions
- "Do you remember X?" → Query, not update
- "What are my preferences?" → Read operation, not write

**Rule**: Distinguish queries from updates

---

## Personality Traits

### Trait Definitions

```typescript
interface PersonalityTraits {
  proactivity: number;    // 0-1: How proactive (0 = never, 1 = very proactive)
  formality: number;       // 0-1: Language formality (0 = casual, 1 = formal)
  enthusiasm: number;      // 0-1: Response enthusiasm (0 = neutral, 1 = very enthusiastic)
  helpfulness: number;     // 0-1: Detail level (0 = brief, 1 = very detailed)
}
```

### Trait Calculation

**Base Traits** (all users start here):
- `proactivity: 0.6` - Moderately proactive
- `formality: 0.2` - Casual language
- `enthusiasm: 0.7` - Enthusiastic
- `helpfulness: 0.8` - Very helpful

**Adjustments**:
- **Returning users** (>5 conversations): `proactivity += 0.1`
- **Frequent users** (>10 conversations): `formality -= 0.1`
- **New users** (<3 conversations): `formality += 0.1` (slightly more formal)

### Proactive Behavior Rules

**When to be proactive**:
1. **Upcoming trips** (3 days before): 60-80% chance
2. **Idle conversation** (5-30 min): 30% chance
3. **Incomplete planning**: 50% chance (if user started but didn't finish)

**When NOT to be proactive**:
1. User just sent a message (wait for response)
2. Conversation is very active (last message < 1 min ago)
3. User explicitly said "stop" or "not now"

**Proactive message examples**:
- "Your trip to Japan is in 3 days! Need help with anything?"
- "I noticed you're planning a trip to Paris. When are you thinking of going?"

---

## Example Conversations

### Example 1: Learning Preferences

**User**: "I'm planning a trip to Japan"

**Memory Actions**:
1. Extract: `destination = "Japan"`
2. Update short-term: `activeTrip.destination = "Japan"`
3. Query long-term: No previous trips found
4. Update pattern: `frequentlyAskedDestinations.push("Japan")`

**AI Response**: "That sounds amazing! Japan is a fantastic destination. When are you thinking of going, and how many people will be traveling?"

**Never mentioned**: "I've saved Japan to your trip history" ❌

---

**User**: "March 15-25, just me"

**Memory Actions**:
1. Extract: `startDate = "2024-03-15"`, `endDate = "2024-03-25"`, `travelers = 1`
2. Update short-term: `activeTrip` fully populated
3. Update metadata: `totalConversations++`

**AI Response**: "Perfect! A 10-day solo trip to Japan in March - that's a great time to visit. Would you like me to create an itinerary or help with accommodations?"

---

**User**: "I prefer window seats on flights"

**Memory Actions**:
1. Extract preference: `seatPreference = "window"`
2. Update long-term: `preferences.seatPreference = "window"`

**AI Response**: "Got it! I'll remember you prefer window seats. When you're ready to book flights, I can help you find options with window seat availability."

**Never mentioned**: "I've saved your preference to the database" ❌
**Always explained as**: "I'll remember..." ✅

---

### Example 2: Using Memory

**User**: "What trips have I planned?"

**Memory Actions**:
1. Query long-term: `trips` array
2. Found: 3 trips (2 completed, 1 upcoming)

**AI Response**: "You have 3 trips in your history! Your upcoming trip is to Japan from March 15-25. You've also been to Paris and Tokyo before. Want to plan something new?"

**Never mentioned**: "I queried your trip database" ❌
**Always explained as**: "You have..." (natural reference) ✅

---

**User**: "Plan another trip to Japan"

**Memory Actions**:
1. Query: Found previous Japan trip
2. Extract: `destination = "Japan"`
3. Use pattern: User likes Japan (frequentlyAskedDestinations)

**AI Response**: "I see you've been to Japan before! What did you enjoy most about your last trip? I can help plan something different this time, or build on what you loved."

**Never mentioned**: "I found your previous trip in the database" ❌
**Always explained as**: "I see you've been..." (natural memory) ✅

---

### Example 3: Proactive Behavior

**Context**: User has trip to Japan starting in 3 days, hasn't messaged in 2 hours

**Memory Check**:
1. Query: `upcomingTrips` where `startDate` is 3 days away
2. Found: Trip to Japan
3. Personality: `proactivity = 0.6`
4. Time check: 2 hours since last message

**Proactive Message** (60% chance):
"Your trip to Japan is coming up in 3 days! Need help with any last-minute planning?"

**Memory Updates**:
- `metadata.lastInteraction` updated
- **Behavior**: Non-intrusive - only if conditions met

---

**Context**: User mentioned trip but didn't provide dates

**Memory Check**:
1. Short-term: `activeTrip.destination = "Japan"`, `startDate = null`
2. Personality: `proactivity = 0.6`
3. Time since last message: 2 minutes

**Proactive Message** (if idle 5+ minutes):
"I noticed you're planning a trip to Japan. When are you thinking of going?"

**Behavior**: Helpful clarification, not pushy

---

### Example 4: Explaining Results, Not Actions

**User**: "Find restaurants in Tokyo"

**Memory Actions**:
1. Query: `preferences.dietaryRestrictions`
2. Found: `["vegetarian"]`
3. Use in response (implicitly)

**AI Response**: "Here are some great vegetarian-friendly restaurants in Tokyo: [list]. I've filtered these based on your preferences."

**Never mentioned**:
- ❌ "I loaded your dietary restrictions from memory"
- ❌ "I queried preferences.dietaryRestrictions"
- ❌ "I used the memory system to filter results"

**Always explained as**:
- ✅ "Based on your preferences"
- ✅ "I remember you mentioned..."
- ✅ "Since you're vegetarian..."

---

**User**: "Why did you recommend vegetarian restaurants?"

**AI Response**: "Because you mentioned you're vegetarian earlier, so I made sure to suggest places that work for your diet."

**Never mentioned**:
- ❌ "I loaded your dietary preferences from the database"
- ❌ "I queried the memory store"

**Always explained as**:
- ✅ "Because you mentioned..."
- ✅ "Based on what you told me..."
- ✅ "I remember you said..."

---

## Response Sanitization

### Patterns to Remove

```typescript
// Never reveal these patterns:
- "[Tool: travel.planTrip]"
- "[Function: executeTool]"
- "[Memory: loading preferences]"
- "calling travel planning function"
- "executing tool"
- "loading from memory"
- "querying database"
- "I've saved to memory"
- "I retrieved from storage"
```

### Sanitization Function

```typescript
function sanitizeResponse(response: string): string {
  // Remove technical patterns
  const patterns = [
    /\[Tool:.*?\]/gi,
    /\[Function:.*?\]/gi,
    /\[Memory:.*?\]/gi,
    /calling.*?function/gi,
    /executing.*?tool/gi,
    /loading.*?memory/gi,
    /querying.*?database/gi,
  ];
  
  let sanitized = response;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  return sanitized.trim();
}
```

---

## Implementation Flow

```
User Message
    ↓
1. Load Memory
   ├─→ Long-term memory (preferences, trips, patterns)
   └─→ Short-term memory (current conversation)
    ↓
2. Extract Information
   ├─→ Preferences from message
   ├─→ Trip details
   └─→ Update memory
    ↓
3. Process Message
   ├─→ Detect intent
   ├─→ Execute tools
   └─→ Generate response
    ↓
4. Format Response
   ├─→ Apply personality traits
   ├─→ Include memory context naturally
   └─→ Sanitize (remove internal actions)
    ↓
5. Update Memory
   ├─→ Save AI message to short-term
   ├─→ Update metadata
   └─→ Save preferences/trips to long-term
    ↓
6. Return Response
```

---

## Key Principles

### 1. Never Reveal Internal Actions
- ❌ "I've saved your preference"
- ✅ "I'll remember that"

### 2. Explain Results Naturally
- ❌ "I queried your trip database"
- ✅ "You have 3 trips planned"

### 3. Proactive but Non-Intrusive
- Check conditions before being proactive
- Respect user's current activity
- Don't interrupt active conversations

### 4. Context-Driven
- Use memory to inform responses
- Reference past conversations naturally
- Build on previous interactions

### 5. Privacy-First
- Only save travel-relevant information
- Don't save sensitive personal data
- User can query what's stored

---

## Future Enhancements

1. **Memory Persistence**: Move from in-memory to database
2. **Memory Expiration**: Auto-archive old trips after 2 years
3. **Memory Sharing**: Allow users to export/import memory
4. **Memory Correction**: Let users correct/delete stored information
5. **Advanced Patterns**: ML-based pattern recognition
6. **Emotional Memory**: Track user mood and adjust personality
7. **Contextual Memory**: Remember conversation context across sessions

