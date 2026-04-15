# LaunchCtrl Threat Model

**Version:** 1.0.0  
**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**Last Updated:** 2026-01  
**Owner:** Platform Security  
**Classification:** INTERNAL

---

## 1. System Overview

LaunchCtrl is a Telegram Mini App + agent backend for Solana token community launch operations. The system helps community managers orchestrate launch sequences — generating copy, coordinating announcements, and managing multi-platform setup steps — without holding any private keys or wallet custody.

**Key architectural facts relevant to security:**

- All auth flows through Telegram `initData` HMAC-SHA256 validation
- Sessions are 64-character nanoids, transmitted as bearer tokens
- Sensitive integration configs encrypted with AES-256-GCM at rest
- Rose Bot operations are COPY_PASTE only — no direct API access
- `DRY_RUN=true` by default — no live execution without explicit opt-in
- No private key storage, no wallet custody
- All user-facing automation is workspace-scoped

---

## 2. Asset Inventory

| Asset | Classification | Location | Sensitivity |
|-------|---------------|----------|-------------|
| Session tokens (64-char nanoid) | SECRET | Redis (TTL 24h) | HIGH — grants full session access |
| Bot token (env var) | SECRET | Process environment | CRITICAL — used for initData validation |
| Encryption key (AES-256-GCM, 32 bytes) | SECRET | Process environment | CRITICAL — protects all stored configs |
| Session secret (JWT signing) | SECRET | Process environment | HIGH — signs session payloads |
| Telegram user IDs | CONFIDENTIAL | PostgreSQL `users` table | MEDIUM — PII |
| Telegram group IDs | CONFIDENTIAL | PostgreSQL `workspaces` table | MEDIUM — operational data |
| Integration configs (encrypted) | CONFIDENTIAL | PostgreSQL `integration_configs` table | HIGH — contains API keys at rest encrypted |
| Generated assets (copy, commands) | INTERNAL | PostgreSQL `assets` table | LOW — user-generated content |
| Execution plans | INTERNAL | PostgreSQL `execution_plans` table | LOW — workflow metadata |
| Execution run logs | INTERNAL | PostgreSQL `execution_runs` table | MEDIUM — operational audit data |
| Audit events | INTERNAL | PostgreSQL `audit_events` table | MEDIUM — security audit trail |
| BullMQ job payloads | INTERNAL | Redis (BullMQ namespace) | MEDIUM — may contain execution params |
| Rate limit counters | INTERNAL | Redis (rate-limit namespace) | LOW |
| Feature flags | INTERNAL | PostgreSQL `feature_flags` table | LOW |

---

## 3. Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TELEGRAM PLATFORM                               │
│  (External — not controlled by LaunchCtrl)                              │
│                                                                         │
│  ┌──────────────┐    initData (HMAC-SHA256 signed)                      │
│  │  Telegram    │───────────────────────────────────────┐               │
│  │  Mini App    │                                       │               │
│  │  (WebApp)    │◄──────────────────────────────────────┤               │
│  └──────────────┘    session token (bearer)             │               │
│         │                                               │               │
└─────────┼───────────────────────────────────────────────┼───────────────┘
          │                          TB-1: initData         │
          │                          validation boundary    │
┌─────────▼───────────────────────────────────────────────▼───────────────┐
│                         LAUNCHCTRL API                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Hono API Server                                                │   │
│  │  - /auth/telegram      (TB-1: validates initData)               │   │
│  │  - /api/v1/workspaces  (TB-2: session bearer auth)              │   │
│  │  - /api/v1/plans       (TB-2: session bearer auth)              │   │
│  │  - /api/v1/execute     (TB-2: session bearer auth)              │   │
│  │  - /api/v1/flags       (TB-2: session bearer auth)              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                │                    │                         │
│         │ TB-3           │ TB-4               │ TB-5                    │
└─────────┼────────────────┼────────────────────┼─────────────────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│  PostgreSQL     │  │  Redis       │  │  External Integrations   │
│  (Internal)     │  │  (Internal)  │  │  (Output-only)           │
│                 │  │              │  │                          │
│  TB-3:          │  │  TB-4:       │  │  TB-5:                   │
│  Prisma client  │  │  ioredis TLS │  │  - Rose Bot (COPY_PASTE) │
│  parameterized  │  │  + AUTH      │  │  - pump.fun (read-only)  │
│  queries        │  │              │  │  - Twitter/X (WILD)      │
└─────────────────┘  └──────────────┘  └──────────────────────────┘
```

### TB-1: Telegram Platform → LaunchCtrl

**Description:** The boundary between Telegram's platform (which generates signed `initData`) and LaunchCtrl's authentication endpoint.

**What crosses it:** `initData` URL-encoded string containing `user` JSON, `chat_instance`, `chat_type`, `auth_date`, and HMAC `hash` field.

**Validation mechanism:**
```typescript
// HMAC-SHA256: key = SHA256("WebAppData" + BOT_TOKEN)
const secretKey = createHmac('sha256', 'WebAppData')
  .update(process.env.BOT_TOKEN!)
  .digest();

const dataCheckString = Object.keys(params)
  .filter(k => k !== 'hash')
  .sort()
  .map(k => `${k}=${params[k]}`)
  .join('\n');

const expectedHash = createHmac('sha256', secretKey)
  .update(dataCheckString)
  .digest('hex');

if (expectedHash !== params.hash) throw new AuthError('Invalid initData');
if (Date.now() / 1000 - Number(params.auth_date) > 300) throw new AuthError('initData expired');
```

**Failure mode:** Attacker constructs fake user data without valid HMAC — rejected at `/auth/telegram`. Stale `initData` (>5 min) — rejected by `auth_date` check.

**Monitoring:** Log all HMAC validation failures with source IP, user agent, and truncated initData hash for pattern analysis.

---

### TB-2: Mini App (Client) → API (Session Auth)

**Description:** All authenticated API routes require a bearer session token issued after successful TB-1 validation.

**What crosses it:** `Authorization: Bearer <64-char-nanoid>` header on all `/api/v1/*` requests.

**Validation mechanism:** Middleware extracts token, looks up session in Redis, validates expiry, attaches `ctx.var.session` to Hono context.

**Failure mode:** Invalid/expired token returns `401 Unauthorized`. Missing header returns `401`.

**Monitoring:** Alert on >10 consecutive 401s from the same IP within 60 seconds.

---

### TB-3: API → Database

**Description:** All database access goes through Prisma ORM with parameterized queries. No raw SQL in application code.

**What crosses it:** Prisma query objects — never raw user-supplied strings in query position.

**Validation mechanism:** Prisma ORM parameterization prevents SQL injection. All queries are workspace-scoped via middleware-injected `workspaceId`.

**Failure mode:** Workspace middleware must be present on all data-access routes. Routes without workspace middleware can potentially access cross-workspace data — this is a known gap requiring code review.

**Monitoring:** DB connection pool exhaustion alerts, slow query logging (>500ms).

---

### TB-4: API → Redis

**Description:** Redis is used for session storage (tokens), BullMQ job queues, and rate limiting counters.

**What crosses it:** Session tokens (stored as JSON), job payloads (serialized execution params), rate limit counters (integers).

**Validation mechanism:** Redis AUTH password required. `ioredis` TLS connection in production. All Redis keys namespaced (`session:`, `bull:`, `rl:`).

**Failure mode:** Redis restart loses all sessions (forced re-authentication) and pending BullMQ jobs (depending on persistence config). This is an accepted operational risk.

**Monitoring:** Redis memory usage, eviction rate, connection count.

---

### TB-5: API → External Integrations

**Description:** Output-only boundary. LaunchCtrl generates content and commands but does not receive webhook callbacks or inbound data from external systems (with exception of Stripe billing webhooks, which are separately validated).

**What crosses it (outbound):**
- Formatted copy blocks → user clipboard (COPY_PASTE mode)
- Telegram Bot API calls (grammY) — send messages to groups
- Stripe API calls — subscription management

**What crosses it (inbound):**
- Stripe webhook events — validated via `stripe.webhooks.constructEvent()` with webhook secret
- Telegram Bot updates — validated via bot token in webhook URL

**Failure mode:** External service unavailable → execution step marked `FAILED`, user notified, no data loss.

**Monitoring:** Track external API call latencies and error rates per integration.

---

## 4. Threat Analysis (STRIDE)

### 4.1 Spoofing

#### S-01: Forged Telegram initData
| Field | Value |
|-------|-------|
| **Threat** | Attacker crafts a fake `initData` payload with arbitrary `user.id` to impersonate any Telegram user |
| **Impact** | HIGH — full account takeover for any Telegram user ID |
| **Likelihood** | LOW — requires BOT_TOKEN to construct valid HMAC |
| **Mitigation** | HMAC-SHA256 validation using secret derived from BOT_TOKEN. Without the BOT_TOKEN, forging a valid `hash` is computationally infeasible (2^256 brute force space). |
| **Residual risk** | BOT_TOKEN exposure (see ID-01) would enable this attack. |

#### S-02: Session Token Theft
| Field | Value |
|-------|-------|
| **Threat** | Attacker obtains a valid 64-char session token (from network intercept, XSS, or log exposure) and uses it to make API requests |
| **Impact** | HIGH — full access to victim's workspace(s) for token lifetime |
| **Likelihood** | LOW — HTTPS-only, tokens not in URLs, not in logs |
| **Mitigation** | Tokens transmitted only in `Authorization: Bearer` header. Tokens stored in Redis with 24h TTL. Tokens are 64 chars of cryptographically random nanoid (~384 bits of entropy). HTTPS enforced. |
| **Residual risk** | Tokens not bound to IP or user agent. Stolen token is valid from any origin until expiry or explicit revocation. |

#### S-03: CSRF Attacks
| Field | Value |
|-------|-------|
| **Threat** | Attacker tricks authenticated user's browser into making state-changing API requests from a third-party origin |
| **Impact** | MEDIUM — could trigger execution runs, modify workspace settings |
| **Likelihood** | LOW — Telegram Mini App context limits cross-origin request vectors |
| **Mitigation** | Bearer token auth (not cookies) inherently prevents CSRF — browsers don't auto-attach Authorization headers. CORS origin whitelist restricts which origins can make requests. |
| **Residual risk** | None significant in current architecture. |

#### S-04: Workspace Impersonation
| Field | Value |
|-------|-------|
| **Threat** | Authenticated user manipulates `workspaceId` parameter to access another workspace's data |
| **Impact** | HIGH — cross-tenant data access |
| **Likelihood** | MEDIUM — common attack vector, requires only valid session token |
| **Mitigation** | Workspace membership validated in middleware for every route. All queries scoped to `workspaceId` extracted from the session's verified membership, not from user-supplied input. |
| **Residual risk** | Correct implementation must be verified in code review. Any route that accepts a workspaceId from query params without membership verification is vulnerable. |

---

### 4.2 Tampering

#### T-01: Plan Step Modification in Transit
| Field | Value |
|-------|-------|
| **Threat** | MITM attacker modifies plan step payload between client and API (e.g., changes a COPY_PASTE command to inject malicious content) |
| **Impact** | MEDIUM — injected content reaches user clipboard or group chats |
| **Likelihood** | LOW — TLS prevents MITM |
| **Mitigation** | TLS 1.2+ required for all API communication. HSTS header enforced. |
| **Residual risk** | Depends on correct TLS configuration in deployment. |

#### T-02: Asset Content Tampering
| Field | Value |
|-------|-------|
| **Threat** | Attacker with DB write access modifies stored asset content (copy, announcement text) to substitute malicious content served to users |
| **Impact** | HIGH — malicious content served to community |
| **Likelihood** | LOW — requires DB access |
| **Mitigation** | DB access restricted to API service account with least-privilege role (SELECT/INSERT/UPDATE on own tables only). No direct DB access from user-facing code paths. |
| **Residual risk** | Compromised API service account would allow this attack. |

#### T-03: Audit Log Tampering
| Field | Value |
|-------|-------|
| **Threat** | Attacker deletes or modifies audit events to conceal malicious actions |
| **Impact** | HIGH — loss of forensic evidence |
| **Likelihood** | LOW — requires DB access |
| **Mitigation** | Audit log table uses INSERT-only pattern (no UPDATE/DELETE in application code). DB user for audit writes has INSERT but not DELETE on `audit_events`. Consider append-only external log drain (e.g., Loki, Datadog) as secondary store. |
| **Residual risk** | No cryptographic log chaining — a DB admin with full privileges could still modify records. External log drain is recommended but not yet implemented. |

#### T-04: DB Record Manipulation via SQL Injection
| Field | Value |
|-------|-------|
| **Threat** | Attacker injects SQL through user-controlled inputs to read/modify arbitrary DB records |
| **Impact** | CRITICAL — full database compromise |
| **Likelihood** | LOW — Prisma ORM parameterizes all queries |
| **Mitigation** | Prisma ORM used exclusively. No `$queryRaw` with user input. Input validation via Zod schemas on all API endpoints. |
| **Residual risk** | Any future use of `$queryRaw` or `$executeRaw` with user input must be audited. |

---

### 4.3 Repudiation

#### R-01: Denied Execution Actions
| Field | Value |
|-------|-------|
| **Threat** | User claims they did not trigger an execution run that caused harm (e.g., sent malicious content to a Telegram group) |
| **Impact** | MEDIUM — operational and legal exposure |
| **Likelihood** | MEDIUM — users may genuinely dispute automated actions |
| **Mitigation** | All execution runs logged to `audit_events` with: Telegram user ID, workspace ID, plan ID, execution run ID, timestamp (UTC), action type, and step-level outcomes. Logs are immutable (INSERT-only). |
| **Residual risk** | Logs are stored in same DB — not independently tamper-evident. External log drain not yet implemented. |

#### R-02: Lost Audit Trail
| Field | Value |
|-------|-------|
| **Threat** | Audit events lost due to Redis restart (if audit is cached in Redis) or DB failure |
| **Impact** | HIGH — unrecoverable audit gap |
| **Likelihood** | LOW — audit events written to PostgreSQL, not Redis |
| **Mitigation** | Audit events written synchronously to PostgreSQL before returning success response. Not queued through Redis/BullMQ to avoid loss on queue failure. |
| **Residual risk** | If API crashes between action execution and audit write, the event may be lost. Consider transactional outbox pattern for critical audit events. |

---

### 4.4 Information Disclosure

#### ID-01: Bot Token Exposure
| Field | Value |
|-------|-------|
| **Threat** | BOT_TOKEN leaks via environment dump, error message, or source code commit |
| **Impact** | CRITICAL — enables forging of initData (see S-01), impersonation of bot |
| **Likelihood** | LOW — env vars not committed, not in logs |
| **Mitigation** | BOT_TOKEN loaded exclusively from environment. Never logged. Never included in error responses. `.env` excluded from Docker image and source control. `pnpm audit` catches accidental commits. |
| **Residual risk** | Process listing (`ps aux`, `/proc/environ`) can expose env vars on shared hosts. Use container orchestration secrets (Kubernetes Secrets, Docker secrets) rather than raw env vars in production. |

#### ID-02: Session Token in Logs
| Field | Value |
|-------|-------|
| **Threat** | Session tokens appear in access logs (as path params or query strings) or application logs |
| **Impact** | HIGH — log aggregation system becomes a session store for attackers |
| **Likelihood** | LOW — tokens transmitted only in Authorization header |
| **Mitigation** | Session tokens transmitted only in `Authorization: Bearer` header — never in URLs. Pino logger configured to redact `authorization` header fields from access logs. |
| **Residual risk** | Developers must maintain discipline not to log request headers in debug code. Pre-deploy code review must check for accidental header logging. |

#### ID-03: PII in Error Messages
| Field | Value |
|-------|-------|
| **Threat** | Unhandled exceptions expose internal details (Telegram user IDs, stack traces, DB schemas) in API error responses |
| **Impact** | MEDIUM — aids attacker reconnaissance |
| **Likelihood** | MEDIUM — common in development-mode error handling |
| **Mitigation** | Global error handler in Hono middleware strips stack traces in production (`NODE_ENV=production`). Error responses return only `{ error: string, code: string }`. Internal details logged to pino (not returned to client). |
| **Residual risk** | New error paths added by developers may not use the global handler if they return early. Code review checklist includes: no `res.json(err)` patterns. |

#### ID-04: Integration Config Plaintext Storage
| Field | Value |
|-------|-------|
| **Threat** | Integration API keys (e.g., Twitter OAuth tokens, pump.fun API keys) stored in plaintext in DB are exposed in a DB breach |
| **Impact** | HIGH — third-party account takeover |
| **Likelihood** | LOW — DB not publicly accessible |
| **Mitigation** | All integration configs encrypted with AES-256-GCM before storage. Encryption key stored in environment, never in DB. `iv` and `authTag` stored alongside ciphertext. |
| **Residual risk** | If both DB backup and ENCRYPTION_KEY leak simultaneously, configs are compromised. Key rotation procedure (see security-checklist.md) mitigates long-term exposure. |

#### ID-05: Redis Key Enumeration
| Field | Value |
|-------|-------|
| **Threat** | Attacker with Redis access uses `KEYS *` or `SCAN` to enumerate session tokens or job payloads |
| **Impact** | HIGH — session enumeration, job payload inspection |
| **Likelihood** | LOW — Redis requires AUTH, not publicly exposed |
| **Mitigation** | Redis AUTH enabled in production. Redis port not exposed externally (internal network only). Keys namespaced but not obscured — security relies on network isolation, not key secrecy. |
| **Residual risk** | Misconfigured firewall exposing Redis port is a critical vulnerability. Infrastructure-level check in security-checklist.md. |

---

### 4.5 Denial of Service

#### D-01: Auth Endpoint Flooding
| Field | Value |
|-------|-------|
| **Threat** | Attacker floods `/auth/telegram` with requests, exhausting CPU (HMAC computation) and connection pool |
| **Impact** | HIGH — legitimate users cannot authenticate |
| **Likelihood** | MEDIUM — auth endpoints are common DDoS targets |
| **Mitigation** | Rate limiter on `/auth/telegram`: 20 req/min per IP (stricter than general limit). Returns `429 Too Many Requests` with `Retry-After` header. Upstream CDN/WAF can absorb volumetric floods. |
| **Residual risk** | IP-based rate limiting is bypassable with IP rotation. Consider adding CAPTCHA challenge after threshold if attack patterns emerge. |

#### D-02: Large Plan Generation Requests
| Field | Value |
|-------|-------|
| **Threat** | Attacker submits plan generation requests with very large/complex skill configurations to exhaust CPU/memory |
| **Impact** | MEDIUM — slow plan generation, memory pressure |
| **Likelihood** | LOW — requests gated behind session auth |
| **Mitigation** | Request body size limit (Hono body limit middleware, default 1MB). Plan generation runs in BullMQ worker (isolated process, separate memory). Worker job timeout: 60 seconds. |
| **Residual risk** | Worker concurrency must be tuned to prevent queue starvation from slow jobs. |

#### D-03: BullMQ Queue Flooding
| Field | Value |
|-------|-------|
| **Threat** | Authenticated user submits thousands of execution jobs, flooding BullMQ queue and starving other users |
| **Impact** | MEDIUM — other users experience severe delays |
| **Likelihood** | MEDIUM — authenticated but potentially malicious users |
| **Mitigation** | General rate limit: 100 req/min per user. TODO: implement per-workspace job queue depth limit (max 50 pending jobs per workspace). Priority queuing ensures higher-priority jobs aren't starved indefinitely. |
| **Residual risk** | Per-workspace queue depth limit not yet implemented. |

#### D-04: Redis Memory Exhaustion
| Field | Value |
|-------|-------|
| **Threat** | Attacker creates many sessions or triggers many BullMQ jobs to exhaust Redis memory, causing eviction of live session data |
| **Impact** | HIGH — active user sessions evicted, all users logged out |
| **Likelihood** | LOW — session creation gated behind initData validation |
| **Mitigation** | Redis `maxmemory` policy: `allkeys-lru` for cache instances, `noeviction` for job queues (separate Redis instances recommended). Session TTL: 24h (auto-expiry). Rate limiting on auth endpoint limits session creation rate. |
| **Residual risk** | Single Redis instance for sessions + queues is a risk. Separate instances recommended (see scale-notes.md). |

---

### 4.6 Elevation of Privilege

#### E-01: Workspace Member → Admin Escalation
| Field | Value |
|-------|-------|
| **Threat** | Workspace member manipulates their role by directly calling admin-only API endpoints or modifying request payloads |
| **Impact** | HIGH — member gains admin control of workspace |
| **Likelihood** | MEDIUM — common in multi-tenant apps without proper RBAC |
| **Mitigation** | Role checked from DB (not from JWT/session payload) on every admin operation. Admin-only middleware verifies `workspace_members.role = 'admin'` for the requesting user. Role cannot be self-elevated — only existing admin can promote members. |
| **Residual risk** | Any route that accepts role from user-supplied payload rather than DB lookup is vulnerable. Code review required. |

#### E-02: Cross-Workspace Data Access
| Field | Value |
|-------|-------|
| **Threat** | Authenticated user accesses data from a workspace they are not a member of by manipulating workspace IDs in requests |
| **Impact** | HIGH — cross-tenant data breach |
| **Likelihood** | MEDIUM — predictable integer or UUID workspace IDs |
| **Mitigation** | Workspace middleware validates membership on every request. All queries use `workspaceId` from verified membership context, never from raw user input. |
| **Residual risk** | Routes added without workspace middleware are vulnerable. Automated test suite should cover cross-workspace access attempts for every data-access endpoint. |

#### E-03: Feature Flag Bypass (WILD Features)
| Field | Value |
|-------|-------|
| **Threat** | User bypasses feature flag checks to access WILD features not enabled for their workspace or subscription tier |
| **Impact** | MEDIUM — access to unstable/experimental features, potential ToS violations |
| **Likelihood** | LOW — feature flags checked server-side |
| **Mitigation** | Feature flags checked on API server, never trusted from client. `GET /api/v1/flags` is read-only and returns what the client is allowed to see. WILD feature code paths check flag status before executing. |
| **Residual risk** | `FORCE_WILD_FLAGS` env var overrides flag checks — must be restricted to development/staging environments. |

---

## 5. Current Mitigations Summary

| Mitigation | Implementation | Code Reference |
|-----------|---------------|----------------|
| initData HMAC validation | `createHmac('sha256', 'WebAppData').update(BOT_TOKEN)` | `packages/api/src/auth/telegram.ts` |
| initData expiry (5 min) | `auth_date` check in auth middleware | `packages/api/src/auth/telegram.ts` |
| Session token generation | `nanoid(64)` — 384 bits entropy | `packages/api/src/auth/session.ts` |
| Session storage with TTL | Redis `SET session:{token} ... EX 86400` | `packages/api/src/auth/session.ts` |
| Bearer token auth | Hono middleware on all `/api/v1/*` routes | `packages/api/src/middleware/auth.ts` |
| Workspace membership check | Middleware validates membership before every data op | `packages/api/src/middleware/workspace.ts` |
| Role-based access control | Admin operations check `workspace_members.role` from DB | `packages/api/src/middleware/rbac.ts` |
| AES-256-GCM encryption | Integration configs encrypted before DB storage | `packages/api/src/lib/encryption.ts` |
| Rate limiting (user) | 100 req/min per user ID via Redis sliding window | `packages/api/src/middleware/rateLimit.ts` |
| Rate limiting (auth) | 20 req/min per IP on `/auth/telegram` | `packages/api/src/middleware/rateLimit.ts` |
| Request body limits | 1MB max body via Hono body limit middleware | `packages/api/src/app.ts` |
| Input validation | Zod schemas on all API endpoints | `packages/api/src/routes/*/schema.ts` |
| SQL injection prevention | Prisma ORM parameterized queries only | All DB operations |
| Error sanitization | Global error handler strips stack traces in production | `packages/api/src/middleware/error.ts` |
| Security headers | Helmet middleware (CSP, HSTS, X-Frame-Options, etc.) | `packages/api/src/app.ts` |
| CORS restrictions | Origin whitelist to Mini App domain | `packages/api/src/app.ts` |
| DRY_RUN default | `DRY_RUN=true` by default, explicit opt-in for live execution | `packages/api/src/config.ts` |
| Audit logging | INSERT-only audit_events for all execution actions | `packages/api/src/lib/audit.ts` |
| No wallet custody | No private key storage anywhere in codebase | Architectural |
| Secrets in env vars | BOT_TOKEN, ENCRYPTION_KEY never in code or DB | Architectural |

---

## 6. Known Gaps & Accepted Risks

| Gap | Severity | Status | Rationale |
|-----|----------|--------|-----------|
| No 2FA for workspace admin actions | MEDIUM | Accepted | Admin actions require valid Telegram auth + workspace membership. Adding TOTP would significantly increase friction with marginal security gain for current threat model. Revisit if enterprise tier launches. |
| Session tokens not bound to IP/UA | MEDIUM | Accepted | IP binding breaks users on mobile networks with dynamic IPs. UA binding is bypassable. Risk mitigated by 24h TTL and revocation capability. |
| initData replay within 5-minute window | MEDIUM | Accepted | Telegram's design — 5-min window is the platform standard. Replay within window is possible if initData is intercepted (requires MITM, HTTPS prevents this). |
| Redis in-memory data loss on restart | MEDIUM | Accepted | Sessions lost on restart → users re-authenticate. BullMQ jobs lost if Redis not configured with AOF persistence. Operational impact documented in runbook. |
| No webhook signature validation (TODO) | HIGH | **Open** | Stripe webhook signature validation implemented; Telegram bot webhook URL-based auth only. Should add secret token validation. |
| No per-workspace job queue depth limit | LOW | **Open** | Tracked as TODO in D-03 above. |
| Audit logs not externally drained | MEDIUM | **Open** | Audit events only in DB. No tamper-evident external drain yet. |
| No transactional outbox for audit events | LOW | **Open** | Audit event could be lost if API crashes between action and audit write. |

---

## 7. Security Roadmap

Prioritized by severity × exploitability:

| Priority | Item | Severity | Effort | Target |
|----------|------|----------|--------|--------|
| P0 | Add Telegram webhook secret token validation | HIGH | Small | Next sprint |
| P0 | External log drain for audit events (Loki/Datadog) | HIGH | Medium | Next sprint |
| P1 | Per-workspace BullMQ job depth limit | MEDIUM | Small | Q1 |
| P1 | Automated cross-workspace access tests for all routes | MEDIUM | Medium | Q1 |
| P1 | Separate Redis instances: sessions / queues / rate limits | MEDIUM | Medium | Q1 |
| P2 | Transactional outbox pattern for critical audit events | LOW | Large | Q2 |
| P2 | Key rotation automation (ENCRYPTION_KEY re-encryption) | MEDIUM | Large | Q2 |
| P2 | Container orchestration secrets (K8s Secrets / Vault) | MEDIUM | Medium | Q2 |
| P3 | 2FA for workspace admin actions (enterprise tier) | MEDIUM | Large | Q3 |
| P3 | Cryptographic audit log chaining | LOW | Large | Q3 |
| P3 | IP-based session binding with exception allowlist | LOW | Medium | Q3 |
