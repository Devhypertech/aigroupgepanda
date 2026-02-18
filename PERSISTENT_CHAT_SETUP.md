# Persistent Chat History Implementation

## Overview

This implementation provides persistent chat history using raw SQL/PostgreSQL (not Prisma). All AI conversations are stored and retrievable per user.

## Database Tables

### 1. Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Conversations Table
```sql
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Messages Table
```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

### 1. Run SQL Migration

Execute the SQL migration file to create the tables:

```bash
# Connect to your PostgreSQL database
psql -U postgres -d gepanda_dev

# Run the migration
\i prisma/migrations/create_chat_tables.sql
```

Or manually run the SQL from `prisma/migrations/create_chat_tables.sql`.

### 2. Install Dependencies

The `pg` and `@types/pg` packages have been installed. If you need to reinstall:

```bash
cd apps/api
npm install pg @types/pg
```

### 3. Environment Variables

Ensure `DATABASE_URL` is set in `apps/api/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/gepanda_dev
```

## API Endpoints

### POST /api/chat/start
Create a new conversation.

**Request:**
```json
{
  "userId": "user_123",
  "title": "Optional conversation title"
}
```

**Response:**
```json
{
  "id": "conv_abc123",
  "userId": "user_123",
  "title": "Optional conversation title",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### POST /api/chat/message
Save user message, call AI, save assistant reply.

**Request:**
```json
{
  "conversationId": "conv_abc123",
  "userId": "user_123",
  "message": "Hello, how can you help me?"
}
```

**Response:**
```json
{
  "userMessage": {
    "id": "msg_123",
    "role": "user",
    "content": "Hello, how can you help me?",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "assistantMessage": {
    "id": "msg_456",
    "role": "assistant",
    "content": "I can help you with...",
    "metadata": { "ui": {...} },
    "createdAt": "2024-01-01T00:00:01Z"
  },
  "ui": {...}
}
```

### GET /api/chat/history/:userId
List all conversations for a user.

**Query Parameters:**
- `limit` (optional, default: 50): Maximum number of conversations to return

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv_abc123",
      "userId": "user_123",
      "title": "Conversation title",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/chat/conversation/:id
Fetch all messages for a conversation.

**Response:**
```json
{
  "conversation": {
    "id": "conv_abc123",
    "userId": "user_123",
    "title": "Conversation title",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "messages": [
    {
      "id": "msg_123",
      "role": "user",
      "content": "Hello",
      "metadata": {},
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "msg_456",
      "role": "assistant",
      "content": "Hi there!",
      "metadata": { "ui": {...} },
      "createdAt": "2024-01-01T00:00:01Z"
    }
  ],
  "count": 2
}
```

## Frontend Integration

The frontend should:

1. **On chat load:**
   - Fetch last conversation: `GET /api/chat/history/:userId?limit=1`
   - If conversation exists, load messages: `GET /api/chat/conversation/:id`
   - If no conversation, create one: `POST /api/chat/start`

2. **On send message:**
   - Save message first: `POST /api/chat/message` (this saves user message, calls AI, and saves assistant reply)
   - Display the response from the API

3. **On refresh:**
   - Messages are automatically loaded from the database
   - No messages should be lost

## Files Created

1. **`prisma/migrations/create_chat_tables.sql`** - SQL migration file
2. **`apps/api/src/db/chatDb.ts`** - Database service with raw SQL queries
3. **`apps/api/src/routes/chatHistory.ts`** - API routes for chat history
4. **`apps/api/src/index.ts`** - Updated to register new routes

## Notes

- The implementation uses raw SQL/PostgreSQL (not Prisma)
- All messages are persisted before AI calls
- Conversation history is loaded on chat open
- Messages are never lost on refresh
- The system supports UI metadata in messages (for AI widgets)

