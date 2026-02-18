# Environment Variable Templates

This file contains template content for `.env` files. Copy the relevant sections to create your `.env` files.

## API Server (`apps/api/.env`)

```bash
# ============================================================================
# GePanda API Server - Environment Variables
# ============================================================================
# Copy this content to apps/api/.env and fill in your actual values
# DO NOT commit .env to version control

# ============================================================================
# Server Configuration
# ============================================================================
NODE_ENV=production
PORT=3001
WEB_APP_URL=http://localhost:3000

# ============================================================================
# Database (Required)
# ============================================================================
# PostgreSQL connection string
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://user:password@localhost:5432/gepanda

# ============================================================================
# Stream Chat API (Required for chat features)
# ============================================================================
# Get your keys from https://dashboard.getstream.io/
STREAM_API_KEY=your_stream_api_key_here
STREAM_API_SECRET=your_stream_api_secret_here

# Optional: Separate keys for Activity Feeds (if different from Chat)
# If not set, will use STREAM_API_KEY and STREAM_API_SECRET
# STREAM_FEEDS_API_KEY=your_feeds_api_key_here
# STREAM_FEEDS_API_SECRET=your_feeds_api_secret_here

# ============================================================================
# AI / LLM Configuration (Required for chat AI)
# ============================================================================
# Zhipu AI API Key (for GLM-4 Flash model)
# Get from https://open.bigmodel.cn/
ZHIPU_API_KEY=your_zhipu_api_key_here

# ============================================================================
# Shopping APIs (Optional - for product search and checkout)
# ============================================================================
# SerpAPI - Google Shopping search
# Get from https://serpapi.com/
SERPAPI_API_KEY=your_serpapi_key_here

# Doba - Product catalog
# Get from https://www.doba.com/
DOBA_PUBLIC_KEY=your_doba_public_key_here
DOBA_PRIVATE_KEY=your_doba_private_key_here

# Crossmint - Checkout/payment links
# Get from https://www.crossmint.com/
CROSSMINT_API_KEY=your_crossmint_api_key_here
CROSSMINT_PROJECT_ID=your_crossmint_project_id_here

# Rye Checkout (Alternative checkout provider)
# RYE_API_KEY=your_rye_api_key_here

# ============================================================================
# Travel APIs (Optional - for flight/hotel search)
# ============================================================================
# Travelpayouts - Flight and hotel data
# Get from https://www.travelpayouts.com/
TRAVELPAYOUTS_API_KEY=your_travelpayouts_api_key_here

# Weather API (Optional)
# WEATHER_API_KEY=your_weather_api_key_here

# ============================================================================
# Admin Configuration (Optional)
# ============================================================================
# Comma-separated list of admin email addresses
# ADMIN_EMAILS=admin1@example.com,admin2@example.com

# ============================================================================
# JWT Secret (Required for authentication)
# ============================================================================
# Generate a random secret: openssl rand -base64 32
JWT_SECRET=your_jwt_secret_here

# ============================================================================
# NextAuth Configuration (if using NextAuth in API)
# ============================================================================
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=your_nextauth_secret_here
```

## Web App (`apps/web/.env.local`)

```bash
# ============================================================================
# GePanda Web App - Environment Variables
# ============================================================================
# Copy this content to apps/web/.env.local and fill in your actual values
# DO NOT commit .env.local to version control

# ============================================================================
# API Configuration (Required)
# ============================================================================
# Backend API server URL
# Development: http://localhost:3001
# Production: https://your-api-domain.com
NEXT_PUBLIC_API_URL=http://localhost:3001

# ============================================================================
# Stream Chat API (Required for chat features)
# ============================================================================
# Get your keys from https://dashboard.getstream.io/
# This is the PUBLIC key (safe to expose to browser)
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key_here

# ============================================================================
# NextAuth Configuration (Required for authentication)
# ============================================================================
# Base URL of your application
# Development: http://localhost:3000
# Production: https://your-domain.com
NEXTAUTH_URL=http://localhost:3000

# Generate a random secret: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here

# ============================================================================
# Google OAuth (Optional - for Google sign-in)
# ============================================================================
# Get from https://console.cloud.google.com/
# GOOGLE_CLIENT_ID=your_google_client_id_here
# GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# ============================================================================
# Travelpayouts (Optional - for travel links)
# ============================================================================
# Travelpayouts marker/affiliate ID
# NEXT_PUBLIC_TRAVELPAYOUTS_MARKER=613624

# ============================================================================
# Server Port (Optional)
# ============================================================================
# Default: 3000
# PORT=3000
```

## Quick Setup Commands

### Create API .env file:
```bash
# On Unix/Mac:
cat > apps/api/.env << 'EOF'
# Paste API template content here
EOF

# On Windows PowerShell:
# Create apps/api/.env manually and paste the API template content
```

### Create Web .env.local file:
```bash
# On Unix/Mac:
cat > apps/web/.env.local << 'EOF'
# Paste Web template content here
EOF

# On Windows PowerShell:
# Create apps/web/.env.local manually and paste the Web template content
```

## Notes

- **Required variables** must be set for the application to work
- **Optional variables** enable additional features but the app will work without them
- Never commit `.env` or `.env.local` files to version control
- In production, use your hosting platform's environment variable management:
  - **Vercel**: Project Settings > Environment Variables
  - **Railway**: Variables tab
  - **Render**: Environment tab
  - **AWS**: Secrets Manager or Parameter Store

