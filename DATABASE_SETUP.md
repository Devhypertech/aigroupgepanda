# Database Setup Instructions

## The Error You're Seeing

The error "Can't reach database server at `localhost:5432`" means PostgreSQL is not running.

## Option 1: Start PostgreSQL with Docker (Recommended)

### Step 1: Install Docker Desktop
1. Download Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Make sure Docker is running (check system tray)

### Step 2: Start PostgreSQL
```bash
cd infra
docker-compose up -d
```

### Step 3: Run Database Migrations
```bash
cd apps/api
npx prisma migrate dev --schema=../../prisma/schema.prisma
```

### Step 4: Verify Database is Running
```bash
docker ps
```
You should see `gepanda-postgres` container running.

## Option 2: Use Existing PostgreSQL Installation

If you already have PostgreSQL installed:

1. **Update `.env` file** in `apps/api/`:
   ```
   DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE?schema=public"
   ```

2. **Create the database**:
   ```sql
   CREATE DATABASE gepanda_dev;
   ```

3. **Run migrations**:
   ```bash
   cd apps/api
   npx prisma migrate dev --schema=../../prisma/schema.prisma
   ```

## Option 3: Quick Test (Skip Database for Now)

If you just want to test the Socket.IO connection without database:

1. The server will start but room join will fail
2. You'll see error messages in the console
3. This is expected - database is required for room functionality

## Verify Setup

After starting PostgreSQL, refresh your browser and try joining a room again. The error should be gone.

## Troubleshooting

- **Port 5432 already in use**: Another PostgreSQL instance might be running. Stop it or change the port in `docker-compose.yml`
- **Docker not found**: Make sure Docker Desktop is installed and running
- **Migration errors**: Make sure the database exists and credentials are correct

