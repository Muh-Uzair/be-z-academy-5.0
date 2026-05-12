# ====================== Builder Stage ======================
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install all dependencies (devDependencies needed for build)
RUN npm ci

# Copy configuration and source code + certificate
COPY tsconfig.json ./
COPY src ./src
COPY ca.pem ./ca.pem

# Build the TypeScript application
RUN npm run build

# ====================== Production Stage ======================
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production 

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy SSL certificate for Aiven services
COPY --from=builder /app/ca.pem ./ca.pem

# Expose the port the app listens on (documentation only)
EXPOSE 4000

# Start the application
CMD ["npm", "start"]