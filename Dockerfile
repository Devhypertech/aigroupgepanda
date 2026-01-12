FROM node:20-alpine

# Enable corepack for npm version management
RUN corepack enable && corepack prepare npm@10.2.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build shared package
RUN npm run build:shared

# Build API
RUN npm -w @gepanda/api run build

# Expose port
EXPOSE ${PORT:-3001}

# Start the API server
CMD ["npm", "-w", "@gepanda/api", "run", "start"]

