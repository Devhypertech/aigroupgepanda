# Quick API Server Startup Script
Write-Host "🚀 Starting API Server..." -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot

# Check if .env exists
if (-not (Test-Path "apps\api\.env")) {
    Write-Host "❌ ERROR: apps\api\.env file not found!" -ForegroundColor Red
    Write-Host "   Please create apps\api\.env with STREAM_API_KEY and STREAM_API_SECRET" -ForegroundColor Yellow
    exit 1
}

# Build shared package first
Write-Host "📦 Building shared package..." -ForegroundColor Cyan
npm run build:shared
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build shared package" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Starting API server on http://localhost:3001" -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start API server
npm run dev:api

