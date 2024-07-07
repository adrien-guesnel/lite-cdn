FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ARG NODE_AUTH_TOKEN
WORKDIR /usr/app

# Install all node_modules and build the project
FROM base AS build

WORKDIR /usr/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install 

COPY . .
RUN pnpm build
RUN pnpm install --prod

FROM node:20-alpine AS prod

WORKDIR /usr/app

COPY --from=build /usr/app/dist ./
COPY --from=build /usr/app/node_modules ./node_modules

EXPOSE 11111

CMD node ./index.js
