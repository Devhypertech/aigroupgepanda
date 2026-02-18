# Frontend Architecture - Nomi.ai/Talkie Style UI

## Overview

The frontend has been refactored to match a Nomi.ai/Talkie-style interface with a single chat screen, persistent AI avatar, and ChatGPT-style input.

---

## Component Structure

```
apps/web/
├── app/
│   ├── page.tsx              # Main chat page (simplified)
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
│
└── components/
    └── chat/
        ├── Avatar.tsx         # AI avatar component
        ├── MessageBubble.tsx  # Individual message display
        ├── MessageList.tsx    # Message list container
        ├── ChatInput.tsx      # ChatGPT-style input
        ├── SuggestionChips.tsx # Quick action suggestions
        └── index.ts           # Component exports
```

---

## State Model

### Core State

```typescript
// Chat State
interface ChatState {
  // Stream Chat
  client: StreamChat | null;
  channel: Channel | null;
  
  // Messages
  messages: Message[];
  isTyping: boolean;
  
  // Connection
  isConnecting: boolean;
  envError: string | null;
  
  // User (persisted in localStorage)
  userId: string;
  username: string;
}

// Message Structure
interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
}
```

### State Flow

```
1. Component Mount
   ↓
2. Check localStorage for userId/username
   ↓
3. Initialize Stream Chat
   ├─→ Get token from API
   ├─→ Connect user
   ├─→ Create/get channel (user-{userId})
   └─→ Load existing messages
   ↓
4. Listen for events
   ├─→ message.new → Add to messages
   ├─→ typing.start → Set isTyping = true
   └─→ typing.stop → Set isTyping = false
   ↓
5. User sends message
   ├─→ Add to messages immediately (optimistic)
   ├─→ Send to Stream channel
   └─→ AI responds via webhook → message.new event
```

### State Persistence

- **userId**: Stored in `localStorage` as `gepanda_userId`
- **username**: Stored in `localStorage` as `gepanda_username`
- **Messages**: Loaded from Stream channel on initialization
- **No room/template state**: Removed entirely

---

## Component Details

### 1. Avatar Component

**Purpose**: Persistent AI avatar that shows typing state

**Props**:
```typescript
interface AvatarProps {
  size?: 'small' | 'medium' | 'large';
  isTyping?: boolean;
}
```

**Features**:
- Gradient background (green theme)
- "GP" initials
- Typing indicator dot
- Responsive sizing

### 2. MessageBubble Component

**Purpose**: Individual message display

**Props**:
```typescript
interface MessageBubbleProps {
  text: string;
  isAI: boolean;
  timestamp?: Date;
}
```

**Features**:
- Different styling for AI vs user messages
- AI: Dark background, left-aligned
- User: Green background, right-aligned
- Timestamp display

### 3. MessageList Component

**Purpose**: Container for all messages

**Props**:
```typescript
interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
}
```

**Features**:
- Auto-scroll to bottom
- Empty state with welcome message
- Typing indicator when AI is typing
- Avatar display for AI messages

### 4. ChatInput Component

**Purpose**: ChatGPT-style input field

**Props**:
```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

**Features**:
- Auto-resizing textarea
- Enter to send, Shift+Enter for new line
- Send button with icon
- Disabled state during typing

### 5. SuggestionChips Component

**Purpose**: Quick action suggestions

**Props**:
```typescript
interface SuggestionChipsProps {
  suggestions: Array<{
    text: string;
    onClick: () => void;
  }>;
  visible?: boolean;
}
```

**Features**:
- Shown when no messages exist
- Clickable chips
- Hover effects
- Auto-hide when conversation starts

---

## Page Structure (page.tsx)

### Layout

```
┌─────────────────────────────────────┐
│ Header (Avatar + Title)             │
├─────────────────────────────────────┤
│                                     │
│  MessageList                        │
│  (Scrollable)                       │
│                                     │
├─────────────────────────────────────┤
│ SuggestionChips (if empty)          │
├─────────────────────────────────────┤
│ ChatInput                           │
└─────────────────────────────────────┘
```

### Key Features

1. **Single Channel**: One persistent channel per user (`user-{userId}`)
2. **No Room Selection**: Removed entirely
3. **No Template Selection**: Removed entirely
4. **Auto-Initialization**: Connects automatically on mount
5. **Optimistic Updates**: User messages appear immediately
6. **Real-time Updates**: AI messages via Stream events

---

## Removed Features

- ❌ Room ID input
- ❌ Room template selection
- ❌ Trip context form
- ❌ Invite link generation
- ❌ Room joining flow
- ❌ Multiple channel support

---

## Added Features

- ✅ Persistent AI avatar in header
- ✅ Single persistent channel per user
- ✅ ChatGPT-style input
- ✅ Suggestion chips for quick actions
- ✅ Typing indicators
- ✅ Auto-scroll to latest message
- ✅ Welcome empty state

---

## State Management

### Local State (useState)

- `client`: Stream Chat client instance
- `channel`: Current channel instance
- `messages`: Array of message objects
- `isTyping`: AI typing indicator
- `isConnecting`: Connection state
- `envError`: Configuration error

### Persistent State (localStorage)

- `gepanda_userId`: User ID (auto-generated if not exists)
- `gepanda_username`: Username (defaults to "Traveler")

### Derived State

- `suggestions`: Generated from message count (empty = show suggestions)
- `envError`: Validated on mount

---

## Event Handling

### Stream Events

```typescript
// New message received
channel.on('message.new', (event) => {
  // Add to messages state
});

// AI starts typing
channel.on('typing.start', (event) => {
  // Set isTyping = true
});

// AI stops typing
channel.on('typing.stop', (event) => {
  // Set isTyping = false
});
```

### User Actions

```typescript
// Send message
handleSendMessage(text) {
  1. Add to messages (optimistic)
  2. Send to Stream channel
  3. AI responds via webhook
}

// Click suggestion chip
suggestion.onClick() {
  // Calls handleSendMessage with chip text
}
```

---

## Styling

### Color Scheme

- **Background**: `#0a0a0a` (dark)
- **Surface**: `rgba(26, 26, 26, 0.8)` (semi-transparent)
- **Primary**: `#2d9d7a` (green)
- **Text**: `#e5e5e5` (light gray)
- **Muted**: `#a0a0a0` (gray)

### Design Principles

- **Minimal**: Clean, uncluttered interface
- **Modern**: ChatGPT-inspired design
- **Responsive**: Works on all screen sizes
- **Accessible**: Good contrast, readable fonts

---

## Example Usage

### Basic Chat Flow

1. User opens app
2. Auto-connects to Stream Chat
3. Sees welcome message with suggestions
4. Clicks suggestion or types message
5. Message appears immediately
6. AI responds via webhook
7. Response appears in chat
8. Conversation continues

### State Transitions

```
Initial → Connecting → Connected → Chatting
   ↓         ↓            ↓           ↓
  Empty   Loading    Welcome    Messages
```

---

## Future Enhancements

1. **Message History**: Load more messages on scroll
2. **Message Editing**: Edit sent messages
3. **Message Reactions**: Add emoji reactions
4. **Voice Input**: Speech-to-text
5. **File Attachments**: Share images/files
6. **Markdown Support**: Rich text formatting
7. **Code Blocks**: Syntax highlighting
8. **Dark/Light Theme**: Theme toggle

