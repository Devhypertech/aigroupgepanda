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

# Build API from root (using workspace command)
RUN npm -w @gepanda/api run build

# Verify build output and show import statements
RUN echo "=== Checking build output ===" && \
    ls -la apps/api/dist/ && \
    echo "=== Checking db folder ===" && \
    ls -la apps/api/dist/db/ && \
    echo "=== Checking imports in index.js ===" && \
    grep -n "db/client" apps/api/dist/index.js || echo "No db/client import found"

# Expose port
EXPOSE ${PORT:-3001}

# Start the API server (run from apps/api directory)
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]

