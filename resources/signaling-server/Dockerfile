# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build
WORKDIR /app

# Install dependencies and build
COPY package.json tsconfig.json ./
COPY src ./src
RUN bun install
RUN bun run build

FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Install openssl for certificate generation
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy built output and entrypoint
COPY --from=build /app/dist ./dist
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create certs directory
RUN mkdir -p /certs

EXPOSE 8787

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "dist/index.js"]
