# API Server Startup Fix - Summary

## Files Edited

### `apps/api/src/index.ts`
- Added comprehensive startup diagnostics
- Added process-level error handlers
- Enhanced server startup logging
- Added error handling for server listen failures

## Changes Made

### 1. Startup Diagnostics
- ✅ Prints `NODE_ENV`
- ✅ Prints `PORT` (from env or default 3001)
- ✅ Prints `process.cwd()`
- ✅ Prints loaded environment variable keys (names only, not values)

### 2. Process Error Handlers
- ✅ `process.on('uncaughtException')` - logs and exits
- ✅ `process.on('unhandledRejection')` - logs and exits
- ✅ `httpServer.on('error')` - handles port binding errors (EADDRINUSE)

### 3. Server Configuration
- ✅ Server binds to `0.0.0.0:${PORT}` (allows localhost + network)
- ✅ PORT defaults to 3001 if not set in env
- ✅ Clear logging of listening URLs

### 4. Health Check Route
- ✅ `/api/healthz` route exists and returns `{ ok: true }` when server is running
- ✅ `/health` legacy route also available

## How to Start the Server

### Method 1: Using npm script (Recommended)
```powershell
cd C:\Users\devel\Desktop\GepandaAIgroupchat
npm run dev:api
```

### Method 2: Direct API start
```powershell
cd C:\Users\devel\Desktop\GepandaAIgroupchat\apps\api
npm run dev
```

### Method 3: Using PowerShell script
```powershell
.\start-api.ps1
```

## What You Should See

When the server starts successfully, you'll see:

```
======================================================================
🚀 API SERVER STARTUP
======================================================================

📋 Environment:
   NODE_ENV: not set (defaults to development)
   PORT: 3001 (default)
   Working Directory: C:\Users\devel\Desktop\GepandaAIgroupchat

🔑 Loaded Environment Variables (keys only):
   ✓ STREAM_API_KEY: set
   ✓ STREAM_API_SECRET: set
   ...

✅ All routes loaded successfully

🌐 Starting HTTP server...
   Binding to: 0.0.0.0:3001
   This allows connections from localhost and network interfaces

======================================================================
✅ SERVER STARTED SUCCESSFULLY
======================================================================

🚀 API Server is now listening:
   Local:    http://localhost:3001
   Network:  http://0.0.0.0:3001
   Health:   http://localhost:3001/api/healthz

📡 Available endpoints:
   GET  /api/healthz - Health check
   GET  /health - Legacy health check
   GET  / - API info

======================================================================
```

## How to Verify Port 3001 is Listening

### Method 1: Check in browser
Open: `http://localhost:3001/api/healthz`
Should return: `{"ok": true, "time": "...", "checks": {...}}`

### Method 2: PowerShell command
```powershell
netstat -ano | Select-String ":3001"
```
Should show: `TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING`

### Method 3: Test with curl
```powershell
curl http://localhost:3001/api/healthz
```

### Method 4: Check process
```powershell
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
```

## Troubleshooting

### Port Already in Use
If you see `EADDRINUSE` error:
```powershell
# Find process using port 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess

# Kill the process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force
```

### Missing Environment Variables
Ensure `apps/api/.env` exists with:
```
STREAM_API_KEY=your_key
STREAM_API_SECRET=your_secret
```

### Server Not Starting
Check the console output for:
- ❌ Missing environment variables
- ❌ Port binding errors
- ❌ Route loading errors
- ❌ Uncaught exceptions

All errors are now logged with clear messages and stack traces.

