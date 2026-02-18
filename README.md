# GePanda AI GroupChat

A full-stack AI-powered group chat application with travel planning, shopping, and social feed features.

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20
- **npm** >= 10
- **PostgreSQL** database (for API)
- Environment variables configured (see [Environment Variables](#environment-variables))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gepanda-ai-groupchat.git
cd gepanda-ai-groupchat

# Install dependencies
npm install
```

## 🛠️ Development

### Running Locally

```bash
# Start both API and web servers in development mode
npm run dev

# Or run separately:
npm run dev:api    # API server on http://localhost:3001
npm run dev:web    # Web app on http://localhost:3000
```

The development servers will:
- **API**: Run on port 3001 with hot reload (using `tsx watch`)
- **Web**: Run on port 3000 with Next.js hot reload

### Project Structure

```
gepanda-ai-groupchat/
├── apps/
│   ├── api/          # Node.js/Express API server (TypeScript)
│   │   ├── src/      # Source code
│   │   └── dist/     # Compiled output (generated)
│   └── web/          # Next.js frontend (TypeScript)
│       ├── app/      # Next.js app directory
│       └── .next/    # Build output (generated)
├── packages/
│   └── shared/       # Shared TypeScript package
└── package.json      # Root package.json with workspace scripts
```

## 📦 Production Build

### Build Everything

```bash
# Build all packages (shared → API → web)
npm run build
```

This will:
1. Build the shared package
2. Compile TypeScript API to `apps/api/dist/`
3. Build Next.js app to `apps/web/.next/`

### Start Production Servers

```bash
# Start both API and web in production mode
npm run start

# Or start separately:
npm run start:api    # Runs node dist/index.js
npm run start:web    # Runs next start
```

## 🔐 Environment Variables

### API Server (`apps/api/.env`)

Create `apps/api/.env` with:

**Required:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/gepanda
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
ZHIPU_API_KEY=your_zhipu_api_key
JWT_SECRET=your_jwt_secret
```

**Optional (enable additional features):**
```bash
SERPAPI_API_KEY=your_serpapi_key          # Google Shopping search
DOBA_PUBLIC_KEY=your_doba_public_key      # Product catalog
DOBA_PRIVATE_KEY=your_doba_private_key
CROSSMINT_API_KEY=your_crossmint_key      # Checkout/payment
TRAVELPAYOUTS_API_KEY=your_travel_key     # Flight/hotel search
```

See [`ENV_TEMPLATES.md`](./ENV_TEMPLATES.md) for complete template.

### Web App (`apps/web/.env.local`)

Create `apps/web/.env.local` with:

**Required:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

**Optional:**
```bash
GOOGLE_CLIENT_ID=your_google_client_id     # Google OAuth
GOOGLE_CLIENT_SECRET=your_google_secret
```

See [`ENV_TEMPLATES.md`](./ENV_TEMPLATES.md) for complete template.

## 📚 Documentation

- **[PRODUCTION_BUILD.md](./PRODUCTION_BUILD.md)** - Detailed production build and deployment guide
- **[ENV_TEMPLATES.md](./ENV_TEMPLATES.md)** - Complete environment variable templates

## 🧪 Available Scripts

### Root Level

- `npm run dev` - Start both API and web in development mode
- `npm run build` - Build all packages for production
- `npm run start` - Start both API and web in production mode
- `npm run lint` - Run Next.js linter

### Individual Workspaces

- `npm run dev:api` / `npm run dev:web` - Start individual services
- `npm run build:api` / `npm run build:web` - Build individual services
- `npm run start:api` / `npm run start:web` - Start individual services

## 🚢 Deployment

### Railway (API)

```bash
# Railway-specific build command
npm run build:railway:api
```

Set environment variables in Railway dashboard.

### Vercel (Web)

```bash
# Vercel-specific build command
npm run build:vercel:web
```

Set environment variables in Vercel project settings.

See [`PRODUCTION_BUILD.md`](./PRODUCTION_BUILD.md) for detailed deployment instructions.

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (via Prisma)
- **Chat**: Stream Chat
- **AI**: Zhipu GLM-4 Flash
- **Auth**: NextAuth.js

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contributing guidelines here]

## 📧 Support

[Add support contact information here]
