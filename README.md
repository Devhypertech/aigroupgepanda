# Gepanda AI Group Chat

AI-powered group chat for travelers built with Next.js, Express, Socket.IO, and PostgreSQL.

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

## Local Development Setup

### 1. Start PostgreSQL Database

```bash
cd infra
docker-compose up -d
```

This starts a PostgreSQL container on port 5432 with:
- Database: `gepanda_dev`
- User: `gepanda`
- Password: `gepanda`

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Or manually create `.env` with:

```
DATABASE_URL="postgresql://gepanda:gepanda@localhost:5432/gepanda_dev?schema=public"
```

### 4. Run Prisma Migrations

```bash
cd apps/api
npx prisma migrate dev --name init
```

This creates the database schema and generates the Prisma client.

### 5. Start the Development Servers

In separate terminals:

**Terminal 1 - API Server:**
```bash
npm run dev:api
```

**Terminal 2 - Web App:**
```bash
npm run dev:web
```

### 6. Access the Application

- Web App: http://localhost:3000
- API Server: http://localhost:3001

## Database Management

### View Database with Prisma Studio

```bash
cd apps/api
npx prisma studio
```

### Reset Database

```bash
cd apps/api
npx prisma migrate reset
```

### Generate Prisma Client

```bash
cd apps/api
npx prisma generate
```

## Project Structure

```
├── apps/
│   ├── api/          # Express + Socket.IO backend
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Shared TypeScript types
├── prisma/           # Prisma schema and migrations
└── infra/            # Docker Compose for PostgreSQL
```

## Features

- Real-time chat with Socket.IO
- AI-powered replies when mentioning @AI
- Room templates (Travel Planning, Live Trip, etc.)
- Message persistence with PostgreSQL
- Room membership tracking

