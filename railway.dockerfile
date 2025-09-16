# Railway-specific Dockerfile for Bridge Service
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY bridge-service.js ./

# Create a simple health check script
RUN echo '#!/bin/sh\nwget --no-verbose --tries=1 --spider http://localhost:$PORT/health || exit 1' > /health-check.sh && \
    chmod +x /health-check.sh

# Expose the port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /health-check.sh

# Start command
CMD ["node", "bridge-service.js"]