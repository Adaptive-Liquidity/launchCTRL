FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/lib/package.json ./packages/lib/
RUN pnpm install --frozen-lockfile

FROM deps AS development
COPY . .
EXPOSE 3002
CMD ["pnpm", "--filter", "@launchctrl/bot", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @launchctrl/bot... build

FROM base AS production
COPY --from=build /app/apps/bot/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/server.js"]
