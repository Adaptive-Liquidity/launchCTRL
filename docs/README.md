# LaunchCtrl — Telegram Launch Control Plane

**The honest, production-grade launch operations platform for Solana/pump.fun token communities.**

LaunchCtrl gives crypto community builders a structured, auditable workflow for configuring their Telegram infrastructure — Rose Bot moderation, Combot analytics, and community copy assets — without dark patterns, fake automation claims, or wallet custody.

---

## What Is LaunchCtrl?

LaunchCtrl is a **Telegram Mini App + agent backend** that orchestrates every step of a Solana token community launch:

- Walk through a guided wizard to describe your project, security needs, and automation preferences
- Receive a **SHARP execution plan**: every step clearly labeled with its execution mode (AUTO, ONE_CLICK, COPY_PASTE, or MANUAL)
- Get exact Rose Bot commands generated for your configuration — copy and paste them into your group
- Get Combot dashboard configuration instructions — step-by-step, nothing automated that can't be automated
- Generate community copy assets: welcome messages, rules, FAQ notes, crisis mode templates, social commands
- Track every action in a per-workspace audit log

LaunchCtrl is honest about what it can and cannot automate. There is no fake "one-click Rose Bot setup." There is no wallet custody. There is no dark-pattern UX.

---

## SHARP vs WILD Philosophy

**SHARP** = Secure, Honest, Accountable, Real, Production-ready.
**WILD** = Future deep automation features, always feature-flagged and never deceptive.

Every feature in LaunchCtrl ships as either SHARP (working, honest, usable today) or WILD (future roadmap, gated behind `FEATURE_WILD_MODE=true`). Nothing is labeled "automated" unless it genuinely executes without human intervention.

See [docs/SHARP.md](./SHARP.md) for the full philosophy and execution mode taxonomy.

---

## Features

| Feature | Status | Execution Mode |
|---------|--------|----------------|
| Workspace management (create, name, manage entities) | SHARP | AUTO |
| Wizard-driven plan generation | SHARP | AUTO |
| Rose Bot configuration generator | SHARP | COPY_PASTE |
| Rose Bot hardening commands | SHARP | COPY_PASTE |
| Combot anti-spam configuration | SHARP | MANUAL_CONFIRMATION_REQUIRED |
| Combot analytics setup | SHARP | MANUAL_CONFIRMATION_REQUIRED |
| Welcome message generation | SHARP | AUTO (copy generation) |
| Community rules generation | SHARP | AUTO (copy generation) |
| FAQ note generation | SHARP | AUTO (copy generation) |
| Social commands generation (/twitter, /buy, etc.) | SHARP | AUTO (copy generation) |
| Crisis mode copy templates | SHARP | AUTO (copy generation) |
| Raid mode copy templates | SHARP | AUTO (copy generation) |
| Execution audit log | SHARP | AUTO |
| Skill pack system | SHARP | AUTO |
| Advanced bot analytics integrations | WILD | — |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| API | Fastify, Drizzle ORM, Zod |
| Database | PostgreSQL 16 |
| Cache / Queues | Redis 7 + BullMQ |
| Bot | grammY (Telegram Bot API) |
| Mini App | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| Auth | Telegram initData HMAC-SHA256 validation |
| Runtime | Node.js 22 |
| Package Manager | pnpm 9 |
| Container | Docker + docker-compose |

---

## Monorepo Structure

```
launchctrl/
├── apps/
│   ├── api/          # Fastify REST API (port 3001)
│   ├── bot/          # grammY Telegram bot (port 3002)
│   └── miniapp/      # Next.js 15 Mini App (port 3000)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── config/       # Zod-validated environment config
│   ├── lib/          # Shared utilities (crypto, logger, idempotency)
│   ├── domain/       # Planner pipeline (normalizeIntake → renderBundle)
│   ├── skills/       # Skill pack registry and loader
│   ├── templates/    # Template renderer and tone profiles
│   └── integrations/ # Integration adapters (Rose, Combot, stubs)
├── docs/             # Project documentation
├── tests/            # Vitest unit, integration, and smoke tests
├── scripts/          # Dev, migration, and seed scripts
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 22.x |
| pnpm | 9.x |
| Docker | 24.x+ |
| Docker Compose | 2.x+ |

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/your-org/launchctrl.git
cd launchctrl

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set TELEGRAM_BOT_TOKEN, JWT_SECRET, and ENCRYPTION_KEY

# 3. Start PostgreSQL and Redis
docker compose up -d postgres redis

# 4. Install dependencies
pnpm install

# 5. Run database migrations
pnpm --filter @launchctrl/api migrate

# 6. Seed development data (optional)
pnpm --filter @launchctrl/api seed

# 7. Start all services in development mode
pnpm dev
```

The following services will be available:
- **Mini App**: http://localhost:3000
- **API**: http://localhost:3001
- **Bot**: http://localhost:3002 (webhook endpoint)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Min 32 chars, for JWT signing |
| `ENCRYPTION_KEY` | Yes | Exactly 64 hex chars (32 bytes) for AES-256 |
| `TELEGRAM_BOT_WEBHOOK_SECRET` | No | Webhook validation secret |
| `TELEGRAM_MINI_APP_URL` | No | Public URL of the Mini App |
| `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS` | No | Default: 86400 (24h) |
| `LOG_LEVEL` | No | Default: `info` |
| `FEATURE_WILD_MODE` | No | Default: `false` |
| `FEATURE_ADVANCED_AUTOMATION` | No | Default: `false` |
| `API_PORT` | No | Default: 3001 |
| `BOT_PORT` | No | Default: 3002 |

See `.env.example` for the full list with comments.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all apps in development mode (via Turborepo) |
| `pnpm build` | Build all packages and apps |
| `pnpm typecheck` | Run TypeScript type checking across the monorepo |
| `pnpm lint` | Run ESLint across the monorepo |
| `pnpm test` | Run all Vitest tests |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm --filter @launchctrl/api migrate` | Run database migrations |
| `pnpm --filter @launchctrl/api seed` | Seed development data |

---

## Documentation

| File | Contents |
|------|----------|
| [docs/ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, diagrams, DB schema |
| [docs/SHARP.md](./SHARP.md) | SHARP philosophy, execution modes, safety guarantees |
| [docs/planner-internals.md](./planner-internals.md) | Deep dive into the 5-stage planner pipeline |
| [docs/skills-guide.md](./skills-guide.md) | Skill pack system, all 9 built-in packs, how to add your own |
| [docs/integrations-guide.md](./integrations-guide.md) | Adapter interface, Rose/Combot adapters, stub adapters |
| [docs/api-reference.md](./api-reference.md) | Complete REST API reference |

---

## Security

- All session tokens are 64-char nanoid strings stored in the `sessions` table
- Telegram `initData` is validated server-side using HMAC-SHA256 (`WebAppData` key derivation)
- Sensitive integration credentials are AES-256 encrypted at rest
- Per-workspace audit log records every significant action with actor, timestamp, and details
- Rate limiting: 100 req/min per user, 20 req/min for auth endpoints

**All Rose Bot configuration is COPY_PASTE — LaunchCtrl never has API-level access to Rose Bot. No wallet custody. No private key handling.**

LaunchCtrl does not store, transmit, or request access to any wallet credentials, seed phrases, or private keys at any point in the user journey.

---

## License

MIT — see LICENSE file.
