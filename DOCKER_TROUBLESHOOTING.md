# Docker Desktop Troubleshooting

## Issue: "Docker Desktop is unable to start"

### Step 1: Make Sure Docker Desktop is Fully Started
1. Open Docker Desktop from the Start menu
2. Wait for it to fully start (the whale icon in system tray should be steady, not animated)
3. You may see "Docker Desktop is starting..." - wait until it says "Docker Desktop is running"

### Step 2: Enable WSL 2 (Required for Docker Desktop on Windows)
Docker Desktop requires WSL 2 on Windows. To enable it:

1. **Open PowerShell as Administrator** (Right-click → Run as Administrator)
2. Run these commands:
   ```powershell
   wsl --install
   ```
3. Restart your computer
4. After restart, Docker Desktop should work

### Step 3: Alternative - Use Docker Desktop Settings
1. Open Docker Desktop
2. Go to Settings → General
3. Make sure "Use WSL 2 based engine" is checked
4. Click "Apply & Restart"

### Step 4: Check Docker Status
Once Docker Desktop is running, verify it works:
```bash
docker --version
docker ps
```

## If Docker Still Won't Start

### Option A: Restart Docker Desktop
1. Right-click Docker Desktop icon in system tray
2. Click "Quit Docker Desktop"
3. Wait 10 seconds
4. Start Docker Desktop again

### Option B: Check Windows Features
1. Open "Turn Windows features on or off"
2. Make sure "Virtual Machine Platform" is checked
3. Make sure "Windows Subsystem for Linux" is checked
4. Restart if you made changes

### Option C: Use Existing PostgreSQL (Skip Docker)
If you have PostgreSQL installed already:
1. Update `apps/api/.env` with your connection string
2. Create database: `CREATE DATABASE gepanda_dev;`
3. Run migrations: `cd apps/api && npx prisma migrate dev --schema=../../prisma/schema.prisma`

## Once Docker is Running

Run these commands:
```bash
cd infra
docker-compose up -d
```

Then verify:
```bash
docker ps
```

You should see `gepanda-postgres` container running.

