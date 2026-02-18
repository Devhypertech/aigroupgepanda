# Database Setup Guide for Development

This guide will help you set up PostgreSQL database for local development.

## Prerequisites

- PostgreSQL installed and running locally
- Node.js and npm installed
- Access to terminal/command line

## Step 1: Create Database

### Option A: Using PostgreSQL CLI (psql)

```bash
# Connect to PostgreSQL (default user is usually 'postgres')
psql -U postgres

# Create database
CREATE DATABASE gepanda;

# Exit psql
\q
```

### Option B: Using pgAdmin or GUI Tool

1. Open pgAdmin (or your preferred PostgreSQL GUI)
2. Connect to your local PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name it `gepanda`
5. Click "Save"

### Option C: Using Docker

```bash
# Run PostgreSQL in Docker
docker run --name gepanda-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gepanda \
  -p 5432:5432 \
  -d postgres:15

# Database will be available at:
# Host: localhost
# Port: 5432
# Database: gepanda
# User: postgres
# Password: postgres
```

## Step 2: Set DATABASE_URL Environment Variable

Create or edit `apps/api/.env`:

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/gepanda?schema=public"

# Example with default postgres user:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gepanda?schema=public"

# Example with Docker:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gepanda?schema=public"
```

**Replace:**
- `USERNAME` with your PostgreSQL username (usually `postgres`)
- `PASSWORD` with your PostgreSQL password
- `localhost:5432` if your PostgreSQL is on a different host/port
- `gepanda` if you used a different database name

## Step 3: Run Prisma Migrations

From the project root:

```bash
# Navigate to API directory
cd apps/api

# Generate Prisma Client (if not already done)
npx prisma generate --schema=../../prisma/schema.prisma

# Run migrations to create tables
npx prisma migrate dev --name init --schema=../../prisma/schema.prisma
```

This will:
- Create all tables defined in `prisma/schema.prisma`
- Apply migrations to your database
- Generate Prisma Client types

## Step 4: Verify Database Connection

### Option A: Check API Health Endpoint

Start your API server:

```bash
cd apps/api
npm run dev
```

Then visit: `http://localhost:3001/db/health`

You should see:
```json
{
  "ok": true,
  "message": "Database connection healthy"
}
```

### Option B: Use Prisma Studio

```bash
cd apps/api
npx prisma studio --schema=../../prisma/schema.prisma
```

This opens a web UI at `http://localhost:5555` where you can:
- View all tables
- Browse data
- Edit records
- Test queries

## Step 5: Seed Initial Data (Optional)

If you have seed scripts:

```bash
cd apps/api
npx prisma db seed --schema=../../prisma/schema.prisma
```

## Troubleshooting

### "Database not available" Error

1. **Check DATABASE_URL is set:**
   ```bash
   cd apps/api
   cat .env | grep DATABASE_URL
   ```

2. **Verify PostgreSQL is running:**
   ```bash
   # On macOS/Linux
   pg_isready
   
   # Or check process
   ps aux | grep postgres
   ```

3. **Test connection manually:**
   ```bash
   psql -U postgres -d gepanda -c "SELECT 1;"
   ```

4. **Check database exists:**
   ```bash
   psql -U postgres -l | grep gepanda
   ```

### "Migration failed" Error

1. **Reset database (⚠️ WARNING: Deletes all data):**
   ```bash
   cd apps/api
   npx prisma migrate reset --schema=../../prisma/schema.prisma
   ```

2. **Or manually drop and recreate:**
   ```sql
   DROP DATABASE gepanda;
   CREATE DATABASE gepanda;
   ```

### "Prisma Client not generated" Error

```bash
cd apps/api
npx prisma generate --schema=../../prisma/schema.prisma
```

### Connection Timeout

- Check PostgreSQL is listening on port 5432:
  ```bash
  # macOS/Linux
  lsof -i :5432
  
  # Windows
  netstat -an | findstr 5432
  ```

- Verify firewall isn't blocking connections
- Check PostgreSQL `pg_hba.conf` allows local connections

## Common Commands Reference

```bash
# Generate Prisma Client
npx prisma generate --schema=../../prisma/schema.prisma

# Create new migration
npx prisma migrate dev --name migration_name --schema=../../prisma/schema.prisma

# Apply pending migrations
npx prisma migrate deploy --schema=../../prisma/schema.prisma

# Open Prisma Studio (database GUI)
npx prisma studio --schema=../../prisma/schema.prisma

# Reset database (⚠️ Deletes all data)
npx prisma migrate reset --schema=../../prisma/schema.prisma

# Format Prisma schema
npx prisma format --schema=../../prisma/schema.prisma

# Validate Prisma schema
npx prisma validate --schema=../../prisma/schema.prisma
```

## Next Steps

After database is set up:

1. ✅ Start API server: `cd apps/api && npm run dev`
2. ✅ Check health: `curl http://localhost:3001/db/health`
3. ✅ Test signup: `POST http://localhost:3001/api/auth/signup`
4. ✅ Open Prisma Studio to view data: `npx prisma studio`

## Production Notes

For production deployments:

- Use connection pooling (e.g., PgBouncer)
- Set `DATABASE_URL` in your hosting platform's environment variables
- Use `prisma migrate deploy` instead of `migrate dev`
- Enable SSL connections: `?sslmode=require` in DATABASE_URL
- Use strong passwords and restrict database access

