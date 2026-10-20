FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Dependency production saja, tanpa file yang tidak dibutuhkan saat runtime (file lisensi tetap disertakan).
# Semua dependency murni JavaScript, jadi hasilnya bisa dipakai di arsitektur mana pun.
FROM --platform=$BUILDPLATFORM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
  && find node_modules -type f \( -name '*.md' -o -name '*.map' -o -name '*.d.ts' -o -name '*.d.mts' -o -name '*.d.cts' -o -name '*.ts.map' -o -name 'CHANGELOG*' \) ! -iname 'licen[cs]e*' -delete \
  && find node_modules -type d \( -name test -o -name tests -o -name __tests__ -o -name docs -o -name example -o -name examples \) -prune -exec rm -rf {} +

# Runtime: Node.js dari paket Alpine, jauh lebih kecil dari image node resmi (tanpa npm/yarn)
FROM alpine:3.21
RUN apk add --no-cache nodejs tzdata && adduser -D -H app
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY seeds ./seeds
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
