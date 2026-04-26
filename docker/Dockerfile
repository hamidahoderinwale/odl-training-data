# Multi-stage build for the AI Training Data Deals Next.js dashboard.
# Builder seeds SQLite from the bundled JSONL so the image ships ready-to-serve
# (HF Spaces free tier has ephemeral storage; baking the DB into the image is
# faster and lets Next.js pre-render with real data).

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci

# Build stage — generate client, seed DB, then build Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Schema-relative path: Prisma resolves this to /app/prisma/prisma/dev.db
ENV DATABASE_URL=file:./prisma/dev.db

# Order matters: client must exist before seed runs, DB must exist before
# `next build` (Next pre-renders the home page and queries the DB at build).
RUN npx prisma generate
RUN npx prisma db push --accept-data-loss
RUN npx tsx prisma/seed_from_hf.ts
RUN npx next build

# Production image — minimal runtime
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Must match builder so Prisma reads the dev.db that was just seeded
ENV DATABASE_URL=file:./prisma/dev.db

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from the standalone build.
# `prisma/` needs to be owned by `nextjs` so SQLite can write journal/WAL
# files in the same directory at runtime, even for read-only queries.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
