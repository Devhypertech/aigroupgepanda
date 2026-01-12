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

# Clean any existing builds
RUN rm -rf apps/api/dist packages/shared/dist

# Build shared package first (required for API build)
RUN npm run build:shared

# Verify shared package build
RUN test -f packages/shared/dist/index.js && \
    test -f packages/shared/dist/socketEvents.js && \
    echo "✓ Shared package built successfully" || \
    (echo "✗ Shared package build failed" && exit 1)

# Build API from root (using workspace command)
RUN npm -w @gepanda/api run build

# Verify API build output
RUN test -f apps/api/dist/index.js && \
    test -f apps/api/dist/db/client.js && \
    echo "✓ API built successfully" || \
    (echo "✗ API build failed" && exit 1)

# Show critical import statements
RUN echo "=== Shared package imports ===" && \
    head -3 packages/shared/dist/index.js && \
    echo "=== API imports ===" && \
    grep -n "db/client\|socketEvents" apps/api/dist/index.js | head -5

# Expose port
EXPOSE ${PORT:-3001}

# Start the API server (run from apps/api directory)
WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]

