# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install all deps (including devDependencies needed for build)
COPY package*.json ./
RUN npm ci && npm cache clean --force

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

# nginx config template — Railway injects $PORT at runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Install gettext for envsubst
RUN apk add --no-cache gettext

EXPOSE 80

# Replace $PORT in nginx config at startup, then launch nginx
CMD ["sh", "-c", "envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
