FROM node:20-alpine

# Enable corepack for npm version management
RUN corepack enable && corepack prepare npm@10.2.0 --activate

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build shared package first (required for API build)
RUN npm run build:shared

# Build API
RUN cd apps/api && npm run build

# Verify build output
RUN test -f apps/api/dist/index.js && echo "✓ index.js exists" || echo "✗ index.js missing"
RUN test -f apps/api/dist/db/client.js && echo "✓ client.js exists" || echo "✗ client.js missing"

# Expose port
EXPOSE ${PORT:-3001}

# Start the API server
CMD ["npm", "-w", "@gepanda/api", "run", "start"]

