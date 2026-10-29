FROM node:26-alpine AS base
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

COPY package.json ./
# Upgrading corepack is not cosmetic: the version bundled in the node image is
# frozen at image build time, and an outdated one fails signature verification
# against newer pnpm releases with "Cannot find matching keyid".
RUN npm i -g corepack@latest \
  && corepack enable \
  && corepack prepare --activate

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i --frozen-lockfile

FROM base AS deps_prod
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm i --frozen-lockfile --prod --ignore-scripts

FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build


FROM node:26-alpine AS prod
WORKDIR /app

ENV NODE_ENV="production"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

RUN mkdir logs
RUN chown nestjs:nodejs logs

COPY --from=deps_prod --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist

USER nestjs

EXPOSE 11111

CMD [ "node", "dist/src/main" ]
