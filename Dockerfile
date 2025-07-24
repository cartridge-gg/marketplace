# Multi-stage run dojo services
#
FROM ghcr.io/dojoengine/dojo:v1.6.0 AS dojo

RUN apt update && apt install curl jq -y

FROM ghcr.io/dojoengine/katana:v1.6.0 AS katana


FROM ghcr.io/dojoengine/torii:v1.6.0 AS torii

RUN apt update && apt install jq -y

#
# Multi-stage Dockerfile for metadata-processor
# This Dockerfile must be built from the monorepo root directory
# Build command: docker build -f worker/metadata-processor/Dockerfile .
# Run command: docker run <image-name>
#
# Build stage
FROM oven/bun:1-alpine AS metadata-processor-build

# Install pnpm
RUN bun install -g pnpm turbo

# Set working directory
WORKDIR /app

COPY . .

# Build dependencies
# If pnpm i exits with "Killed" try to boost memory and memory-swap until error disappear
RUN pnpm install --frozen-lockfile; \
  pnpm build:deps


# Production stage
FROM oven/bun:1-alpine AS metadata-processor-prod

# Install pnpm
RUN bun install -g pnpm

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app/worker/metadata-processor

# Copy package files from build stage
COPY --from=metadata-processor-build --chown=nodejs:nodejs /app /app

# Switch to non-root user
USER nodejs

# Run the application
CMD ["bun", "run", "run:effect"]
