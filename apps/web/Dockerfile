# Build context: repository root
# docker build -f apps/web/Dockerfile -t luv-bank-web:phase11 .

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
COPY apps/web apps/web
COPY tsconfig.base.json ./
# Public build-time values only. Never bake JWT/DB secrets here.
ARG NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
ARG NEXT_PUBLIC_DEFAULT_LOCALE=en
ARG PWA_CACHE_VERSION=phase-9-v1
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE \
    PWA_CACHE_VERSION=$PWA_CACHE_VERSION \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    OUTPUT_STANDALONE=1
RUN pnpm --filter @luv-bank/validation run build \
 && pnpm --filter @luv-bank/web run build

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN groupadd --system --gid 10001 luvbank \
 && useradd --system --uid 10001 --gid luvbank --create-home luvbank

COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

USER luvbank
WORKDIR /app/apps/web
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
CMD ["node", "server.js"]
