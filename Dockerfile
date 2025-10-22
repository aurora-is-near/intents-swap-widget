# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ linux-headers eudev-dev libusb-dev

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build demo pages as production SPA
# Increase Node heap size for build
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV BUILD_TARGET=demo
RUN yarn build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built demo pages
COPY --from=builder /app/dist-demo /usr/share/nginx/html

# Copy public files (manifest, favicon, etc)
COPY --from=builder /app/public /usr/share/nginx/html

# Create nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    # Enable CORS for TON Connect \
    add_header Access-Control-Allow-Origin *; \
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS"; \
    add_header Access-Control-Allow-Headers *; \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
