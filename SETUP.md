# Database Setup Instructions

## Quick Start

### 1. Start PostgreSQL

```bash
cd infra
docker-compose up -d
```

### 2. Set Environment Variable

Create `.env` file in `apps/api/`:

```bash
cd apps/api
echo 'DATABASE_URL="postgresql://gepanda:gepanda@localhost:5432/gepanda_dev?schema=public"' > .env
```

Or copy from example:
```bash
cp .env.example .env
```

### 3. Install Dependencies

From project root:
```bash
npm install
```

### 4. Generate Prisma Client and Run Migrations

```bash
cd apps/api
npm run db:generate
npm run db:migrate
```

This will:
- Generate the Prisma client
- Create the database schema
- Run the initial migration

### 5. Start the API Server

```bash
npm run dev:api
```

## Database Schema

The schema includes:
- **Room**: Stores room information and template
- **RoomMember**: Tracks users in rooms
- **Message**: Stores all messages (USER and AI)

## Useful Commands

```bash
# View database in Prisma Studio
cd apps/api
npm run db:studio

# Reset database (drops all data)
npm run db:reset

# Create new migration
npm run db:migrate

# Generate Prisma client after schema changes
npm run db:generate
```

## Troubleshooting

**Error: Cannot find module '@prisma/client'**
- Run `npm run db:generate` in `apps/api/`

**Error: DATABASE_URL not set**
- Create `.env` file in `apps/api/` with the DATABASE_URL

**Error: Connection refused**
- Make sure PostgreSQL is running: `docker-compose ps` in `infra/` directory
- Check if port 5432 is available

