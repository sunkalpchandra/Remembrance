# Use an official Node image for the build stage (full Debian to avoid native build issues)
FROM node:20-bullseye as builder

# Disable telemetry for Next.js builds
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app

# Copy package manifests first for caching
# This Dockerfile assumes you use npm. If you use pnpm or bun, adapt these steps.
COPY package.json package-lock.json* ./

# Install dependencies (including dev deps needed for the build)
# --prefer-offline is fine in CI, but keep defaults for reproducibility.
RUN npm install --legacy-peer-deps

# Copy the rest of the source
COPY . .

# Build the Next.js app
# This uses the `build` script defined in package.json ("next build")
RUN npm run build

# -------------------------------------------------------------------
# Production image
# -------------------------------------------------------------------
FROM node:20-bullseye-slim as runner

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Copy built assets from the builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

COPY --from=builder /app/package.json ./package.json
# Copy node_modules created in the builder (production & runtime deps)
COPY --from=builder /app/node_modules ./node_modules

# If you have any runtime-only files (e.g. runtime certs, assets), copy them here as needed
# COPY --from=builder /app/some-runtime-file ./some-runtime-file

EXPOSE ${PORT}

# Use the package.json "start" script to run production server (next start -p $PORT)
# You can replace with ["npx", "next", "start", "-p", "3000"] if preferred.
CMD ["npm", "start"]
