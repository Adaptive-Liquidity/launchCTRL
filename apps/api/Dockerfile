FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/lib/package.json ./packages/lib/
COPY packages/domain/package.json ./packages/domain/
COPY packages/skills/package.json ./packages/skills/
COPY packages/templates/package.json ./packages/templates/
COPY packages/integrations/package.json ./packages/integrations/
RUN pnpm install --frozen-lockfile

FROM deps AS development
COPY . .
EXPOSE 3001
CMD ["pnpm", "--filter", "@launchctrl/api", "dev"]

FROM deps AS build
COPY . .
RUN turbo build --filter @launchctrl/api

FROM base AS production
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/server.js"]
