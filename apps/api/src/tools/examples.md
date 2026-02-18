# Tool Function Calling Examples

## Overview

This document shows example tool calls and how the AI converts structured tool outputs into natural language responses.

---

## Example 1: Travel Planning

### User Input
```
"I'm planning a trip to Japan from March 15-25, 2024 for 2 people"
```

### Intent Detection
- Intent: `travel.plan`
- Tool: `travel.planTrip`

### Tool Call
```typescript
{
  tool: "travel.planTrip",
  input: {
    destination: "Japan",
    startDate: "2024-03-15",
    endDate: "2024-03-25",
    travelers: 2
  }
}
```

### Tool Result (Structured)
```typescript
{
  success: true,
  data: {
    destination: "Japan",
    dates: {
      start: "2024-03-15",
      end: "2024-03-25"
    },
    travelers: 2,
    duration: 10
  },
  userMessage: "Great! I've noted your trip to Japan from March 15 to March 25 for 2 people."
}
```

### AI Response to User
```
"Great! I've noted your trip to Japan from March 15 to March 25 for 2 people. 
Would you like me to suggest an itinerary or help with accommodations?"
```

**Note:** User never sees `travel.planTrip` or the structured data.

---

## Example 2: Flight Status Check

### User Input
```
"Check status for flight UA123"
```

### Intent Detection
- Intent: `travel.flight`
- Tool: `travel.flightStatus`

### Tool Call
```typescript
{
  tool: "travel.flightStatus",
  input: {
    flightNumber: "UA123"
  }
}
```

### Tool Result (Structured)
```typescript
{
  success: true,
  data: {
    flightNumber: "UA123",
    airline: "United Airlines",
    status: "on-time",
    departure: {
      airport: "JFK",
      time: "2024-03-15T10:30:00Z",
      gate: "A12"
    },
    arrival: {
      airport: "NRT",
      time: "2024-03-16T14:45:00Z",
      gate: "B5"
    }
  }
}
```

### AI Response to User
```
"Flight UA123 (United Airlines) is on time. 
Departing from JFK at 10:30 AM from gate A12, 
arriving at Narita Airport at 2:45 PM at gate B5."
```

**Note:** AI converts structured flight data into natural language.

---

## Example 3: eSIM Purchase

### User Input
```
"I need an eSIM for Japan, 10 days, 5GB"
```

### Intent Detection
- Intent: `connectivity.esim`
- Tool: `connectivity.recommendEsim` → `connectivity.purchaseEsim`

### Tool Call Chain
```typescript
// Step 1: Recommend
{
  tool: "connectivity.recommendEsim",
  input: {
    destination: "Japan",
    duration: 10,
    dataAmount: 5
  }
}

// Step 2: Purchase (if user confirms)
{
  tool: "connectivity.purchaseEsim",
  input: {
    destination: "Japan",
    duration: 10,
    dataAmount: 5,
    planId: "japan-5gb-10d"
  }
}
```

### Tool Result
```typescript
{
  success: true,
  data: {
    checkoutUrl: "https://checkout.rye.com/session/abc123",
    planId: "japan-5gb-10d",
    destination: "Japan",
    duration: 10,
    dataAmount: 5,
    price: "$9.99"
  },
  userMessage: "I found a 10-day, 5GB plan for Japan at $9.99. Want me to open checkout for this plan?"
}
```

### AI Response to User
```
"I found a 10-day, 5GB eSIM plan for Japan at $9.99. 
Want me to open checkout for this plan?"
```

**Note:** User sees natural confirmation, not tool names or checkout URLs directly.

---

## Example 4: Memory Storage

### User Input
```
"Remember I prefer window seats"
```

### Intent Detection
- Intent: `general.chat` → Detected memory save intent
- Tool: `memory.save`

### Tool Call
```typescript
{
  tool: "memory.save",
  input: {
    userId: "user123",
    key: "seat_preference",
    value: "window",
    type: "preference"
  }
}
```

### Tool Result
```typescript
{
  success: true,
  data: {
    saved: true,
    key: "seat_preference"
  },
  userMessage: "Got it! I'll remember you prefer window seats."
}
```

### AI Response to User
```
"Got it! I'll remember you prefer window seats."
```

---

## Example 5: Notification

### User Input
```
"Remind me to check in 24 hours before my flight"
```

### Intent Detection
- Intent: `general.chat` → Detected reminder intent
- Tool: `notification.send`

### Tool Call
```typescript
{
  tool: "notification.send",
  input: {
    userId: "user123",
    type: "reminder",
    title: "Flight Check-in Reminder",
    message: "Check in for your flight 24 hours before departure",
    scheduledAt: "2024-03-14T10:00:00Z" // 24h before flight
  }
}
```

### Tool Result
```typescript
{
  success: true,
  data: {
    notificationId: "notif_1234567890",
    sentAt: "2024-03-13T10:00:00Z"
  },
  userMessage: "I've set a reminder to check in 24 hours before your flight."
}
```

### AI Response to User
```
"I've set a reminder to check in 24 hours before your flight."
```

---

## Example 6: Tool Chaining

### User Input
```
"Plan a trip to Paris for 5 days and get me an eSIM"
```

### Intent Detection
- Multiple intents detected
- Tools: `travel.planTrip` → `connectivity.recommendEsim`

### Tool Call Chain
```typescript
// Step 1: Plan trip
{
  tool: "travel.planTrip",
  input: { destination: "Paris", duration: 5 }
}

// Step 2: Recommend eSIM (using trip data)
{
  tool: "connectivity.recommendEsim",
  input: { 
    destination: "Paris", // From previous result
    duration: 5 // From previous result
  }
}
```

### Combined AI Response
```
"I've planned your 5-day trip to Paris! 
I also found a 5-day eSIM plan for France. Want me to set that up for you?"
```

**Note:** AI chains tools automatically and summarizes results naturally.

---

## Key Principles

1. **Tool Names Never Exposed**: Users never see `travel.planTrip` or `connectivity.purchaseEsim`
2. **Structured Data Hidden**: Tool outputs are converted to natural language
3. **Graceful Errors**: Tool failures result in friendly messages, not technical errors
4. **Context Preservation**: Previous tool results inform subsequent tool calls
5. **Natural Flow**: AI decides when to call tools and how to present results

