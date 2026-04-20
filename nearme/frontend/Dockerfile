# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install all deps (including devDependencies needed for build)
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy source and build
COPY public ./public
COPY src ./src
RUN npm run build

# ── Stage 2: serve with nginx ──────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Security: remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# nginx config: handle React Router (all routes -> index.html) + gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Run as non-root (nginx already drops privileges internally)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
