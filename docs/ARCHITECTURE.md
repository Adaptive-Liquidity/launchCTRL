# LaunchCtrl — System Architecture

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│                                                                      │
│   ┌──────────────────────────┐   ┌──────────────────────────────┐  │
│   │  Telegram Mini App       │   │  Telegram Client             │  │
│   │  (Next.js 15, port 3000) │   │  (Bot commands, /start etc.) │  │
│   └───────────┬──────────────┘   └──────────────┬───────────────┘  │
└───────────────┼───────────────────────────────────┼─────────────────┘
                │ HTTPS / initData                   │ Webhook
                ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                 │
│                                                                      │
│   ┌─────────────────────────────────────────────────┐              │
│   │           API — Fastify (port 3001)              │              │
│   │                                                   │              │
│   │  Auth (HMAC-SHA256 initData validation)          │              │
│   │  Session management (64-char nanoid tokens)      │              │
│   │  REST routes: workspaces, plans, runs, assets    │              │
│   │  Skill registry (gray-matter YAML frontmatter)   │              │
│   │  Planner pipeline (5 stages)                     │              │
│   │  Executor service (step-by-step run engine)      │              │
│   │  Audit log writer                                │              │
│   └─────────────┬───────────────────────────────────┘              │
│                  │                                                   │
│   ┌─────────────────────────────────────────────────┐              │
│   │           Bot — grammY (port 3002)               │              │
│   │                                                   │              │
│   │  /start, /workspaces, /skills, /runs commands    │              │
│   │  Webhook handler                                  │              │
│   │  Auth middleware (re-validates session via API)   │              │
│   └─────────────────────────────────────────────────┘              │
│                                                                      │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────────┐
│                    PERSISTENCE LAYER                                  │
│                                                                      │
│   ┌───────────────────┐   ┌───────────────────┐  ┌───────────────┐ │
│   │  PostgreSQL 16     │   │  Redis 7           │  │  BullMQ       │ │
│   │  (port 5432)       │   │  (port 6379)       │  │  (job queues) │ │
│   │  11 tables         │   │  Session cache     │  │               │ │
│   │  Drizzle ORM       │   │  Rate limit state  │  │  execution-   │ │
│   │                   │   │                   │  │  queue        │ │
│   └───────────────────┘   └───────────────────┘  │  asset-gen-   │ │
│                                                    │  queue        │ │
│                                                    └───────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Package Dependency Graph

```
@launchctrl/types
    └── (no internal deps — foundational types only)

@launchctrl/config
    └── (no internal deps — env validation only)

@launchctrl/lib
    └── @launchctrl/config

@launchctrl/domain
    ├── @launchctrl/types
    └── @launchctrl/lib

@launchctrl/skills
    ├── @launchctrl/types
    └── @launchctrl/lib

@launchctrl/templates
    ├── @launchctrl/types
    └── (no other internal deps)

@launchctrl/integrations
    ├── @launchctrl/types
    ├── @launchctrl/lib
    └── @launchctrl/config

apps/api
    ├── @launchctrl/types
    ├── @launchctrl/config
    ├── @launchctrl/lib
    ├── @launchctrl/domain
    ├── @launchctrl/skills
    ├── @launchctrl/templates
    └── @launchctrl/integrations

apps/bot
    ├── @launchctrl/types
    ├── @launchctrl/config
    └── @launchctrl/lib

apps/miniapp
    └── @launchctrl/types
```

---

## Request Lifecycle

### Authentication Flow

```
Client                   API                      DB / Redis
  │                        │                           │
  │  POST /api/auth/       │                           │
  │  telegram              │                           │
  │  { initData: "..." } ─►│                           │
  │                        │  1. Parse URLSearchParams │
  │                        │  2. Extract hash param    │
  │                        │  3. Build data-check str  │
  │                        │  4. Compute secretKey:    │
  │                        │     HMAC('WebAppData',    │
  │                        │         BOT_TOKEN)        │
  │                        │  5. Compute expected hash │
  │                        │  6. timingSafeStringEqual │
  │                        │  7. Check auth_date age   │
  │                        │  8. Parse user JSON       │
  │                        │                           │
  │                        │  findOrCreateUser() ─────►│
  │                        │◄─────────────── user obj  │
  │                        │                           │
  │                        │  createSession() ────────►│
  │                        │  INSERT sessions          │
  │                        │◄─────────── { token: ... }│
  │                        │                           │
  │◄── 200 { token, user } │                           │
```

### Authenticated Route Flow

```
Client                  API Middleware               Route Handler
  │                          │                            │
  │  GET /api/...            │                            │
  │  Authorization: Bearer X ►                            │
  │                          │ validateSession(X)         │
  │                          │ ──► DB/Redis lookup        │
  │                          │ ◄── session + user obj     │
  │                          │ req.currentUser = user     │
  │                          │ ────────────────────────── ►
  │                          │                    handler(req, reply)
  │                          │                    service call
  │                          │                    DB query
  │◄──── 200 { data: ... }   │◄───────────────────────────│
```

---

## Planner Pipeline

```
  WizardAnswers (from wizard UI)
          │
          ▼
  ┌─────────────────┐
  │ normalizeIntake │  Resolves labels, computes flags (isMemeProject,
  │                 │  isHighSecurity, isHighAutomation, hasPumpFun).
  └────────┬────────┘  Returns NormalizedIntake.
           │
           ▼
  ┌──────────────────┐
  │  selectStack     │  Determines required/recommended/optional
  │                  │  integration slugs based on security profile,
  └────────┬─────────┘  automation profile, and category.
           │            Returns StackRecommendation.
           │
           ▼
  ┌────────────────────┐
  │ generatePlanSteps  │  Produces ordered PlanStep[] with:
  │                    │  - Correct ExecutionMode per step type
  └────────┬───────────┘  - Idempotency keys
           │              - Rose commands (COPY_PASTE)
           │              - Combot instructions (MANUAL_CONF.)
           │              - Asset generation requests (AUTO)
           ▼
  ┌────────────────────┐
  │ validatePlanSteps  │  Checks for:
  │                    │  - Duplicate actions
  └────────┬───────────┘  - Manual steps missing instructions
           │              - Integration conflicts (Rose + Safeguard)
           │              Returns ValidationResult { valid, errors, warnings }
           ▼
  ┌──────────────────────┐
  │ renderExecutionBundle│  Assembles final Plan object:
  │                      │  - Plan.id (nanoid)
  └──────────────────────┘  - Plan.steps (all PlanStep[])
                             - Plan.assetSpecs (GeneratedAssetSpec[])
                             - Plan.risks (aggregated from steps)
                             - Plan.estimatedTotalMinutes
                             - Plan.autoStepCount / manualStepCount
```

---

## Execution Flow

```
Plan approved
      │
      ▼
  POST /api/runs  { planId, workspaceId, isDryRun: true }
      │
      ▼
  ExecutorService.startRun()
      │
      ├──► Create execution_runs record (status: running)
      │
      ├──► For each PlanStep (in sequence order):
      │         │
      │         ├── AUTO step
      │         │     └─► Execute directly (DB write, asset gen, etc.)
      │         │         Update step status → completed
      │         │
      │         ├── COPY_PASTE step
      │         │     └─► Generate copy content
      │         │         Store as generated_assets record
      │         │         Update step status → awaiting_manual
      │         │         (Does NOT send commands autonomously)
      │         │
      │         └── MANUAL_CONFIRMATION_REQUIRED step
      │               └─► Generate dashboard instructions
      │                   Store as generated_assets record
      │                   Update step status → awaiting_manual
      │                   (Waits for human to mark confirmed)
      │
      ├──► If DRY_RUN=true: skip all external API calls
      │    Record everything as if executed, no real side effects
      │
      ├──► On completion: Update execution_runs.status → completed
      │
      └──► Write audit_events for every step outcome
```

---

## Database Schema

All 11 tables in the `launchctrl` PostgreSQL database:

| Table | Description |
|-------|-------------|
| `users` | Telegram user accounts (telegramUserId, name, username, photo) |
| `sessions` | Active auth sessions (64-char token, userId, expiresAt) |
| `workspaces` | User workspaces — the top-level organizational unit |
| `workspace_members` | Many-to-many: users ↔ workspaces with roles (owner, editor, viewer) |
| `telegram_entities` | Telegram groups, channels, and bots associated with a workspace |
| `integrations` | Per-workspace integration configurations (encrypted credentials) |
| `plans` | Wizard-generated execution plans with steps and asset specs |
| `execution_runs` | Individual plan execution runs (status, dry run flag, timing) |
| `generated_assets` | Copy content, commands, and instructions generated for a run |
| `skill_runs` | Records of individual skill pack invocations |
| `audit_events` | Immutable log of all significant actions (actor, action, resource, metadata) |
| `feature_flags` | Per-workspace feature flag overrides |

---

## Redis Usage

| Use Case | Key Pattern | TTL |
|----------|-------------|-----|
| Session validation cache | `session:{token}` | Matches session expiry |
| Rate limiting state | `ratelimit:{userId}:{window}` | 60s sliding window |
| BullMQ job metadata | Managed by BullMQ | Per-job TTL |

Redis is used for fast session lookups and rate limiting. Sessions are the source of truth in PostgreSQL — Redis is a cache only.

---

## BullMQ Queues

| Queue | Purpose | Workers |
|-------|---------|---------|
| `execution-queue` | Process execution run steps asynchronously | 1 per API instance |
| `asset-generation-queue` | Generate copy assets (templates + tone rendering) | 1 per API instance |

Both queues use exponential backoff retry with a max of 3 attempts. Failed jobs are moved to a dead-letter set.

---

## Security Boundaries

### 1. initData Validation (Telegram Authentication)

Every request to `POST /api/auth/telegram` validates the Telegram `initData` string:
- Extract and sort all params except `hash`
- Derive `secretKey = HMAC-SHA256("WebAppData", BOT_TOKEN)`
- Compute `expectedHash = HMAC-SHA256(secretKey, dataCheckString)`
- Compare with timing-safe string equality (no early exit on length mismatch)
- Reject if `auth_date` is older than `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS`

### 2. Session Authentication

All authenticated routes use a `requireAuth` Fastify preHandler:
- Extract Bearer token from `Authorization` header
- Look up session in DB (with Redis cache fallback)
- Attach `request.currentUser` for downstream use
- Return 401 for missing, invalid, or expired sessions

### 3. Workspace Membership Check

All workspace-scoped routes verify the requesting user is a member:
- Workspace owner can perform all operations
- Editor can create plans and runs
- Viewer can only read

### 4. Rate Limits

- 100 requests/minute per authenticated user (global)
- 20 requests/minute for auth endpoints (`/api/auth/*`)
- Returns 429 with `Retry-After` header

---

## Port Assignments

| Service | Port | Protocol |
|---------|------|---------|
| Mini App (Next.js) | 3000 | HTTP |
| API (Fastify) | 3001 | HTTP |
| Bot (grammY webhook) | 3002 | HTTP |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |
