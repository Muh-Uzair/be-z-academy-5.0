# ==============================================================================
# Stage 1: Builder (Compiles TypeScript into JavaScript)
# ==============================================================================
FROM node:22-alpine AS builder

# Set the dedicated working directory for building the application
WORKDIR /build

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy the rest of the application source code (respecting .dockerignore)
COPY . .

# Compile TypeScript into JavaScript (outputs to /build/dist)
RUN npm run build


# ==============================================================================
# Stage 2: Runner (Lightweight Production Runtime)
# ==============================================================================
FROM node:22-alpine AS runner

# Set production environment
ENV NODE_ENV=production

# Set working directory for the application
WORKDIR /app

# Copy package manifests to install production-only dependencies
COPY package*.json ./

# Install only production dependencies (skips devDependencies)
RUN npm ci --omit=dev

# Copy the compiled JavaScript from the builder stage
COPY --from=builder /build/dist ./dist

# Expose the API port
EXPOSE 5000

# Start the Node.js production server
CMD ["node", "dist/src/server.js"]
