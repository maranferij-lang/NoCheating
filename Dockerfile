# NoCheating prototype — single container (API + built web app + SQLite on a volume)
FROM node:22-bookworm-slim

# ffmpeg is optional: the server uses it to make browser-seekable copies of recorded segments
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY scripts scripts
# postinstall downloads the MediaPipe models (needs network during build)
RUN npm ci --no-audit --no-fund

COPY . .
RUN node scripts/setup-assets.mjs && npm run build

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data \
    PROCTOR_PIN=1234
VOLUME ["/data"]
EXPOSE 3000
CMD ["npm", "start"]
