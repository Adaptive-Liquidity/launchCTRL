FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/miniapp/package.json ./apps/miniapp/
COPY packages/types/package.json ./packages/types/
RUN pnpm install --frozen-lockfile

FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@launchctrl/miniapp", "dev"]

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN turbo build --filter @launchctrl/miniapp

FROM base AS production
COPY --from=build /app/apps/miniapp/.next/standalone ./
COPY --from=build /app/apps/miniapp/.next/static ./apps/miniapp/.next/static
COPY --from=build /app/apps/miniapp/public ./apps/miniapp/public
EXPOSE 3000
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["node", "apps/miniapp/server.js"]
