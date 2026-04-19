# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup -S nearme && adduser -S nearme -G nearme

WORKDIR /app

# Copy deps from previous stage (no devDependencies, no npm cache)
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY src ./src
COPY package.json ./

# Set ownership
RUN chown -R nearme:nearme /app

USER nearme

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Use node directly — faster startup, no npm overhead
CMD ["node", "src/index.js"]
