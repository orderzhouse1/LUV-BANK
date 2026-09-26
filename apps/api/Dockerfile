# Build context: repository root
# docker build -f apps/api/Dockerfile -t luv-bank-api:phase11 .

ARG NODE_VERSION=22.17.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/database/package.json packages/database/
COPY packages/validation/package.json packages/validation/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/config packages/config
COPY packages/validation packages/validation
COPY packages/database packages/database
COPY apps/api apps/api
COPY tsconfig.base.json ./
# Prisma generate needs placeholders only; no real secrets in image layers.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?sslmode=require"
ENV DIRECT_URL="postgresql://build:build@127.0.0.1:5432/build?sslmode=require"
RUN pnpm --filter @luv-bank/database exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter @luv-bank/config run build \
 && pnpm --filter @luv-bank/validation run build \
 && pnpm --filter @luv-bank/database run build \
 && pnpm --filter @luv-bank/api run build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 10001 luvbank \
 && useradd --system --uid 10001 --gid luvbank --create-home luvbank

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/packages/config/package.json packages/config/
COPY --from=build /app/packages/database/package.json packages/database/
COPY --from=build /app/packages/validation/package.json packages/validation/
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/packages/config packages/config
COPY --from=build /app/packages/validation packages/validation
COPY --from=build /app/packages/database packages/database
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/package.json apps/api/package.json

USER luvbank
WORKDIR /app/apps/api
EXPOSE 4000
ENV API_HOST=0.0.0.0
ENV API_PORT=4000
# Migrations are NEVER run by this entrypoint.
CMD ["node", "dist/server.js"]
