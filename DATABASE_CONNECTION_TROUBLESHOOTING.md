# Database Connection Troubleshooting

## Error: "Database service is temporarily unavailable"

This error occurs when the API cannot connect to the PostgreSQL database. Follow these steps to diagnose and fix:

## Step 1: Check API Server is Running

```bash
# Check if API server is running on port 3001
curl http://localhost:3001/api/auth/ping
```

Expected: `{"ok":true}`

If not running:
```bash
cd apps/api
npm run dev
```

## Step 2: Check Database Health

```bash
# Test database connection
curl http://localhost:3001/db/health
```

Expected: `{"ok":true,"message":"Database connection healthy"}`

If error:
- Database is not connected
- DATABASE_URL is not set
- PostgreSQL is not running

## Step 3: Verify DATABASE_URL

Check `apps/api/.env` file exists and has:

```env
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/gepanda?schema=public
```

**Replace:**
- `USERNAME` with your PostgreSQL username (usually `postgres`)
- `PASSWORD` with your PostgreSQL password
- `localhost:5432` if your database is on a different host/port
- `gepanda` if you used a different database name

## Step 4: Check PostgreSQL is Running

### Windows:
```powershell
# Check if PostgreSQL service is running
Get-Service -Name postgresql*

# Or check process
Get-Process -Name postgres -ErrorAction SilentlyContinue
```

### macOS/Linux:
```bash
# Check if PostgreSQL is running
pg_isready

# Or check process
ps aux | grep postgres
```

### Start PostgreSQL:
- **Windows**: Start PostgreSQL service from Services
- **macOS**: `brew services start postgresql`
- **Linux**: `sudo systemctl start postgresql`

## Step 5: Test Database Connection Manually

```bash
# Connect to PostgreSQL
psql -U postgres -d gepanda

# If connection works, you'll see:
# gepanda=#
```

If connection fails:
- Database doesn't exist → Create it (see Step 6)
- Wrong credentials → Update DATABASE_URL
- PostgreSQL not running → Start PostgreSQL service

## Step 6: Create Database (if needed)

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE gepanda;

-- Exit
\q
```

## Step 7: Run Prisma Migrations

```bash
cd apps/api

# Generate Prisma Client
npx prisma generate --schema=../../prisma/schema.prisma

# Run migrations
npx prisma migrate dev --name init --schema=../../prisma/schema.prisma
```

## Step 8: Verify Prisma Client

```bash
cd apps/api

# Test Prisma connection
npx prisma studio --schema=../../prisma/schema.prisma
```

This opens Prisma Studio at `http://localhost:5555` where you can:
- View all tables
- Verify User table exists
- Check data

## Common Issues

### Issue: "DATABASE_URL is not set"

**Solution:**
1. Create `apps/api/.env` file
2. Add `DATABASE_URL=postgresql://...`
3. Restart API server

### Issue: "Connection refused"

**Solution:**
1. PostgreSQL is not running → Start PostgreSQL service
2. Wrong port → Check PostgreSQL port (default: 5432)
3. Firewall blocking → Check firewall settings

### Issue: "Database does not exist"

**Solution:**
1. Create database: `CREATE DATABASE gepanda;`
2. Update DATABASE_URL if using different name

### Issue: "Password authentication failed"

**Solution:**
1. Verify password in DATABASE_URL
2. Reset PostgreSQL password if needed
3. Check `pg_hba.conf` allows local connections

### Issue: "Prisma Client not generated"

**Solution:**
```bash
cd apps/api
npx prisma generate --schema=../../prisma/schema.prisma
```

## Quick Diagnostic Commands

```bash
# 1. Check API health
curl http://localhost:3001/api/auth/ping

# 2. Check database health
curl http://localhost:3001/db/health

# 3. Check DATABASE_URL (from apps/api directory)
cd apps/api
cat .env | grep DATABASE_URL

# 4. Test PostgreSQL connection
psql -U postgres -d gepanda -c "SELECT 1;"

# 5. Check Prisma Client
cd apps/api
npx prisma validate --schema=../../prisma/schema.prisma
```

## Expected Flow

1. ✅ PostgreSQL is running
2. ✅ Database `gepanda` exists
3. ✅ `DATABASE_URL` is set in `apps/api/.env`
4. ✅ Prisma Client is generated
5. ✅ Migrations are applied
6. ✅ API server can connect to database

## Still Having Issues?

1. **Check API server logs** for detailed error messages
2. **Check PostgreSQL logs** for connection attempts
3. **Verify network** - ensure localhost connections work
4. **Try Docker** - if local PostgreSQL is problematic:
   ```bash
   docker run --name gepanda-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=gepanda \
     -p 5432:5432 \
     -d postgres:15
   ```

