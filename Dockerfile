# syntax=docker/dockerfile:1.7
FROM node:22.17.1-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM dependencies AS api-build
COPY apps/api apps/api
COPY prisma prisma
RUN npm run prisma:generate --workspace=@veritab/api && npm run build --workspace=@veritab/api

FROM api-build AS migrate
ENV NODE_ENV=production
CMD ["npm", "run", "database:deploy"]

FROM api-build AS api-production-dependencies
RUN npm prune --omit=dev

FROM node:22.17.1-bookworm-slim AS api-runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 10001 veritab && useradd --system --uid 10001 --gid veritab --home-dir /app veritab
COPY --from=api-production-dependencies --chown=veritab:veritab /app/node_modules ./node_modules
COPY --from=api-build --chown=veritab:veritab /app/apps/api/dist ./apps/api/dist
COPY --from=api-build --chown=veritab:veritab /app/apps/api/package.json ./apps/api/package.json
COPY --from=api-build --chown=veritab:veritab /app/prisma ./prisma
USER 10001:10001
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
