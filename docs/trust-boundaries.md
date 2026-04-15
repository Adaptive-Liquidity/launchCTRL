# LaunchCtrl Trust Boundaries

**Version:** 1.0.0  
**Last Updated:** 2026-01  
**Owner:** Platform Security  
**Classification:** INTERNAL

---

## 1. Trust Boundary Overview

A trust boundary is any point where data crosses from one zone of control (or trust level) to another. LaunchCtrl has five primary trust boundaries. Each boundary has different validation requirements, failure modes, and monitoring strategies.

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ZONE 0: EXTERNAL UNTRUSTED                                                   ║
║                                                                               ║
║   ┌─────────────────┐        ┌──────────────────┐                            ║
║   │  Telegram User  │        │  Telegram Server  │                           ║
║   │  (Browser/App)  │        │  (Platform)       │                           ║
║   └────────┬────────┘        └────────┬──────────┘                           ║
║            │ HTTP requests            │ initData (HMAC signed)               ║
╚════════════╪══════════════════════════╪══════════════════════════════════════╝
             │                          │
             │   ━━━━━━━━━━━━━━━━━━━━━ TB-1 ━━━━━━━━━━━━━━━━━━━━━           
             ▼                          ▼
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ZONE 1: SEMI-TRUSTED (API PERIMETER)                                         ║
║                                                                               ║
║  ┌────────────────────────────────────────────────────────────────────────┐  ║
║  │  Hono API Server                                                       │  ║
║  │                                                                        │  ║
║  │  /auth/telegram  ◄── TB-1: validate initData HMAC → issue session     │  ║
║  │  /api/v1/*       ◄── TB-2: validate session bearer → workspace scope  │  ║
║  │                                                                        │  ║
║  │  grammY Bot Handler  ◄── Telegram Bot API (webhook, URL-auth)         │  ║
║  └────────┬──────────────────────────────────────────┬───────────────────┘  ║
║           │                                          │                        ║
╚═══════════╪══════════════════════════════════════════╪════════════════════════╝
            │   ━━━━━━ TB-3 ━━━━━━      ━━━━━━ TB-4 ━━━━━━   ━━━ TB-5 ━━━
            ▼                           ▼                       ▼
╔═══════════════════════╗  ╔════════════════════╗  ╔══════════════════════════╗
║  ZONE 2: INTERNAL DB  ║  ║  ZONE 2: INTERNAL  ║  ║  ZONE 3: EXTERNAL       ║
║                       ║  ║  CACHE/QUEUE        ║  ║  INTEGRATIONS           ║
║  PostgreSQL           ║  ║                    ║  ║                          ║
║  - users              ║  ║  Redis             ║  ║  Telegram Bot API        ║
║  - workspaces         ║  ║  - sessions        ║  ║  Stripe API              ║
║  - plans              ║  ║  - BullMQ jobs     ║  ║  pump.fun (read-only)    ║
║  - execution_runs     ║  ║  - rate limits     ║  ║  [WILD] Twitter/X API    ║
║  - audit_events       ║  ║                    ║  ║  [WILD] Discord API      ║
║  - integration_configs║  ║                    ║  ║                          ║
║    (AES-256-GCM)      ║  ║                    ║  ║                          ║
╚═══════════════════════╝  ╚════════════════════╝  ╚══════════════════════════╝
```

---

## 2. Trust Boundary Details

### TB-1: Telegram Platform → LaunchCtrl Auth

**Zone transition:** ZONE 0 (untrusted external) → ZONE 1 (API perimeter)

**Purpose:** Convert Telegram's platform-signed identity assertion into a LaunchCtrl session.

**What crosses this boundary:**

| Data | Direction | Format |
|------|-----------|--------|
| `initData` string | Inbound | URL-encoded: `user=%7B...%7D&chat_instance=...&auth_date=...&hash=abc123` |
| Session token | Outbound | `{ "token": "<64-char-nanoid>", "expiresAt": "<ISO8601>" }` |

**Validation mechanism — step by step:**

1. **Parse initData:** Decode URL-encoded string into key-value pairs.
2. **Extract hash:** Remove `hash` field from params.
3. **Construct data-check string:** Sort remaining keys alphabetically, join as `key=value\n` pairs.
4. **Compute secret key:** `HMAC-SHA256(key="WebAppData", data=BOT_TOKEN)` → 32-byte secret.
5. **Compute expected hash:** `HMAC-SHA256(key=secretKey, data=dataCheckString)` → hex digest.
6. **Compare hashes:** Constant-time comparison (`crypto.timingSafeEqual`) — reject if mismatch.
7. **Check auth_date:** Reject if `Date.now()/1000 - auth_date > 300` (5-minute window).
8. **Parse user:** JSON-parse `params.user` → extract `id`, `first_name`, `username`.
9. **Upsert user:** Create or update `users` record with Telegram ID.
10. **Issue session:** Generate `nanoid(64)`, store in Redis with 24h TTL, return to client.

**Failure modes:**

| Failure | HTTP Response | Log Action |
|---------|--------------|-----------|
| Missing `hash` field | `400 Bad Request` | Log with IP |
| HMAC mismatch | `401 Unauthorized` | Log with IP + truncated initData |
| `auth_date` too old | `401 Unauthorized` | Log with IP + age delta |
| Invalid `user` JSON | `400 Bad Request` | Log with IP |
| Redis unavailable | `503 Service Unavailable` | Alert + log |

**Monitoring:**
- Counter metric: `auth.initdata.validation_failures` — alert if >50/min from single IP
- Counter metric: `auth.initdata.expired` — alert if >100/min (potential replay attack)
- Log all validation failures (sanitized — no raw initData) to structured log drain

---

### TB-2: Mini App → API (Session Auth)

**Zone transition:** ZONE 0 (untrusted client) → ZONE 1 (API perimeter)

**Purpose:** Authenticate subsequent API calls using the session token issued at TB-1.

**What crosses this boundary:**

| Data | Direction | Format |
|------|-----------|--------|
| Session token | Inbound | `Authorization: Bearer <token>` header |
| Workspace ID | Inbound | Path parameter `/api/v1/workspaces/:workspaceId/*` |
| API request payload | Inbound | JSON body (Zod-validated) |
| API response | Outbound | JSON (workspace-scoped data only) |

**Validation mechanism — step by step:**

1. **Extract bearer token:** Parse `Authorization` header. Reject if missing or malformed.
2. **Redis session lookup:** `GET session:{token}` — reject if nil (expired or invalid).
3. **Parse session data:** Extract `userId`, `telegramId`, `sessionId` from stored JSON.
4. **Attach session to context:** `ctx.set('session', sessionData)` for downstream handlers.
5. **Workspace membership check** (for workspace-scoped routes):
   - Extract `workspaceId` from path params.
   - Query `workspace_members` for `(userId, workspaceId)` — reject if not found.
   - Attach `workspaceId` and `role` to context.
6. **Role check** (for admin-only routes):
   - Verify `ctx.var.workspace.role === 'admin'` — return `403 Forbidden` if not.
7. **Input validation:** Zod schema parse of request body — return `422 Unprocessable Entity` if invalid.

**Failure modes:**

| Failure | HTTP Response | Log Action |
|---------|--------------|-----------|
| Missing Authorization header | `401 Unauthorized` | — |
| Invalid token format | `401 Unauthorized` | Log IP |
| Token not in Redis (expired/invalid) | `401 Unauthorized` | Log IP + token prefix (first 8 chars) |
| Not a workspace member | `403 Forbidden` | Log userId + workspaceId |
| Insufficient role | `403 Forbidden` | Log userId + workspaceId + attempted action |
| Invalid request body (Zod) | `422 Unprocessable Entity` | Log validation errors (no PII) |

**Monitoring:**
- Alert: >10 consecutive 401s from same IP within 60s
- Alert: any 403 `role` violations (unexpected elevation attempts)
- Dashboard: session token hit rate (cache hits vs expired lookups)

---

### TB-3: API → PostgreSQL Database

**Zone transition:** ZONE 1 (API perimeter) → ZONE 2 (internal data store)

**Purpose:** Persist and retrieve application data with workspace-scoped isolation.

**What crosses this boundary:**

| Data | Direction | Classification |
|------|-----------|----------------|
| User records (Telegram ID, username) | Both | CONFIDENTIAL |
| Workspace records | Both | INTERNAL |
| Plan definitions | Both | INTERNAL |
| Execution run status + logs | Both | INTERNAL |
| Audit events | Write-only | INTERNAL |
| Integration configs (AES-256-GCM ciphertext) | Both | CONFIDENTIAL |
| Feature flags | Read-only | INTERNAL |

**Validation mechanism:**

- All queries use Prisma ORM — parameterized, no raw SQL string interpolation
- Every data-access function receives `workspaceId` from middleware context (not user input)
- `workspace_members` join required for all workspace-scoped data access
- No `$queryRaw` or `$executeRaw` with user-controlled input permitted (enforced in code review)
- Database user has least-privilege grants: no `DROP`, no `TRUNCATE`, no cross-schema access

**Connection management:**
- Prisma connection pool: max 10 connections per API instance
- PgBouncer in transaction mode for production (see scale-notes.md)
- Connection timeout: 5 seconds
- Query timeout: 30 seconds (slow query alert at 500ms)

**Failure modes:**

| Failure | Handling |
|---------|---------|
| Connection refused | Return `503`, alert ops |
| Query timeout (>30s) | Cancel query, return `504`, log slow query |
| Unique constraint violation | Return `409 Conflict` with code |
| FK constraint violation | Return `422 Unprocessable Entity` |

**Monitoring:**
- Metric: `db.query.duration_ms` histogram by query name
- Alert: P95 query time >500ms
- Alert: Connection pool exhaustion (all connections in use)
- Alert: Any failed transaction on `audit_events` INSERT

---

### TB-4: API → Redis

**Zone transition:** ZONE 1 (API perimeter) → ZONE 2 (internal cache/queue)

**Purpose:** Session storage, job queue management, and rate limit counters.

**What crosses this boundary:**

| Data | Direction | Redis Namespace | TTL |
|------|-----------|----------------|-----|
| Session JSON (userId, telegramId) | Both | `session:{token}` | 24h |
| BullMQ job payloads | Write | `bull:execution-queue:*` | Job lifetime |
| BullMQ job results | Read | `bull:execution-queue:*` | Job lifetime |
| Rate limit counters | Both | `rl:{userId}:{window}` | 60s |
| initData cache (for dedup) | Both | `initdata:{hash}` | 5min |

**Validation mechanism:**

- Redis `AUTH` password required in production
- TLS connection (`rediss://` URL scheme) for production deployments
- All keys namespaced — no wildcard `KEYS *` in application code (use `SCAN` with cursor if needed)
- Session data validated on read (parse JSON, check required fields)
- BullMQ job schema validated by worker on dequeue (not trusted as-is)

**Security constraints:**
- Redis port (6379) must not be exposed externally (firewall rule in pre-deploy checklist)
- Separate Redis instances recommended for sessions vs. queues vs. rate limits (prevents memory pressure cross-contamination)
- `maxmemory-policy allkeys-lru` for session instance, `noeviction` for queue instance

**Failure modes:**

| Failure | Handling |
|---------|---------|
| Redis connection refused | Auth: `503`; Queuing: job persisted to DB fallback |
| Key eviction (LRU) | Session evicted → user must re-authenticate (acceptable) |
| Redis restart (no persistence) | All sessions lost → mass re-authentication event |
| BullMQ job lost (no AOF) | Execution run marked stale after timeout, user notified |

**Monitoring:**
- Alert: Redis memory usage >80% of `maxmemory`
- Alert: Key eviction rate >0 on session instance
- Alert: BullMQ dead-letter queue depth >10
- Dashboard: session count, queue depth, rate limit hit rate

---

### TB-5: API → External Integrations

**Zone transition:** ZONE 1 (API perimeter) → ZONE 3 (external services)

**Purpose:** Output-only boundary for sending content to external platforms.

**What crosses this boundary:**

| Integration | Data Sent | Data Received | Mode |
|------------|-----------|---------------|------|
| Telegram Bot API | Messages, inline keyboards | Update acknowledgments | Active |
| Stripe API | Subscription mutations | Subscription status | Active |
| Stripe Webhooks | — | Payment events (validated) | Passive (inbound) |
| pump.fun | — | Token price data (read-only) | Active (read-only) |
| Rose Bot | — | — | COPY_PASTE only, no direct API |
| [WILD] Twitter/X API | Announcement text | Post IDs | WILD (flag-gated) |
| [WILD] Discord API | Server setup commands | — | WILD (flag-gated) |

**Validation of inbound webhooks:**

- **Stripe webhooks:** `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` — rejects unsigned events
- **Telegram bot webhook:** Bot token validated in webhook URL path (`/bot{BOT_TOKEN}/webhook`) — Telegram only calls this URL
- TODO: Add `X-Telegram-Bot-Api-Secret-Token` header validation for additional protection

**Outbound security:**
- All outbound requests use HTTPS (TLS 1.2+ minimum)
- API keys for external services stored in `integration_configs` table (AES-256-GCM encrypted at rest)
- Integration credentials decrypted in memory only at call time, never cached in plaintext
- Outbound request timeout: 10 seconds (prevent blocking on slow external APIs)
- Circuit breaker: after 5 consecutive failures, mark integration as unhealthy, alert user

**Failure modes:**

| Failure | Handling |
|---------|---------|
| External API unavailable | Execution step marked `FAILED`, user notified, retried via BullMQ |
| Invalid webhook signature | `401` returned to caller, logged as potential tampering |
| Rate limit from external API | BullMQ retry with exponential backoff + jitter |
| OAuth token expired | User prompted to re-connect integration |

---

## 3. Data Classification

| Classification | Definition | Examples |
|---------------|-----------|---------|
| **SECRET** | Cryptographic keys, credentials. Exposure causes system compromise. Never logged, never in DB. | BOT_TOKEN, ENCRYPTION_KEY, SESSION_SECRET |
| **CONFIDENTIAL** | Personal data or sensitive business data. Requires encryption at rest. Access logged. | Telegram user IDs, integration API keys (encrypted), group IDs |
| **INTERNAL** | Business operational data. Not for public disclosure. Standard access controls apply. | Plans, execution logs, audit events, feature flags |
| **PUBLIC** | Non-sensitive data. Safe to expose. | API documentation, feature flag names, error codes |

### Data Classification as It Crosses Each Boundary

```
Data Type               │ TB-1 │ TB-2 │ TB-3 │ TB-4 │ TB-5
────────────────────────┼──────┼──────┼──────┼──────┼──────
BOT_TOKEN               │SECRET│  —   │  —   │  —   │  —
  (never crosses any TB; used only to derive HMAC key in-process)

initData (inbound)      │CONF. │  —   │  —   │  —   │  —
  (validated, discarded; only user.id extracted)

Session token           │ ← issued │SECRET│  —   │SECRET│  —
  (opaque to DB; stored in Redis only)

Telegram user ID        │extracted│CONF.│CONF.│  —   │  —
  (stored in users table; sent in audit logs)

Integration configs     │  —   │CONF. │CONF. │  —   │decrypted in-process only
  (encrypted AES-256-GCM in DB; plaintext only in API memory at call time)

Plan/execution data     │  —   │INTERN│INTERN│INTERN│  —
  (standard INTERNAL data; workspace-scoped)

Audit events            │  —   │INTERN│INTERN│  —   │  —
  (append-only; never returned to client in full)

Stripe events           │  —   │  —   │INTERN│  —   │INTERN
  (subscription status; validated webhook signature)
```

---

## 4. Session Lifecycle

```
[1] CREATION
  User opens Telegram Mini App
  → Telegram generates initData (HMAC signed with BOT_TOKEN)
  → POST /auth/telegram { initData }
  → API validates HMAC (TB-1)
  → API generates nanoid(64) session token
  → Redis: SET session:{token} {userId, telegramId, createdAt} EX 86400
  → API returns { token, expiresAt }
  → Mini App stores token in memory (NOT localStorage, NOT cookie)

[2] USE
  Every API request:
  → Authorization: Bearer {token}
  → Middleware: GET session:{token} from Redis
  → If found: attach session to context, continue
  → If not found: 401 Unauthorized
  → Session TTL sliding window: NOT implemented (fixed 24h from creation)
  → Note: TTL does not reset on use — session expires 24h after creation regardless

[3] EXPIRY (natural)
  After 24h: Redis auto-expires key
  → Token no longer found in Redis → 401 on next request
  → User must re-authenticate via Telegram Mini App (new initData flow)
  → New session token issued

[4] REVOCATION (explicit)
  Triggered by:
  - POST /api/v1/auth/logout (user-initiated)
  - Admin workspace removal (member removed from workspace)
  - SESSION_SECRET rotation (invalidates all sessions by key change)
  
  Mechanism:
  → DEL session:{token} in Redis
  → Token immediately invalid
  → No grace period

[5] ROTATION
  SESSION_SECRET rotation invalidates all sessions because:
  → Sessions are stored as opaque keys in Redis (token = Redis key)
  → Rotation deletes ALL session:{*} keys (requires maintenance window)
  → All users must re-authenticate
  → Schedule: monthly (see security-checklist.md)
```

---

## 5. Encryption at Rest

### What Is Encrypted

| Data | Algorithm | Where | Notes |
|------|-----------|-------|-------|
| Integration configs (`connection_config` JSON) | AES-256-GCM | PostgreSQL `integration_configs.encrypted_config` | `iv` + `authTag` + `ciphertext` stored as JSON blob |
| Session data in Redis | Not encrypted | Redis in-memory | Relies on Redis AUTH + network isolation |
| Audit events | Not encrypted | PostgreSQL | Not sensitive; integrity > confidentiality |
| Plan/execution data | Not encrypted | PostgreSQL | INTERNAL classification only |

### AES-256-GCM Implementation

```typescript
interface EncryptedPayload {
  iv: string;       // 16-byte IV, hex-encoded
  authTag: string;  // 16-byte GCM auth tag, hex-encoded
  ciphertext: string; // encrypted data, hex-encoded
}

function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

function decrypt(payload: EncryptedPayload, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
```

### Key Management

- **ENCRYPTION_KEY:** 64 hex chars (32 bytes). Generated with `openssl rand -hex 32`.
- **Storage:** Environment variable only. Never in DB, never in source code, never in logs.
- **Usage:** Loaded once at startup into a `Buffer` in application memory. Not re-read per-request.
- **Rotation:** Requires re-encryption of all `integration_configs` rows. Procedure:
  1. Generate new key.
  2. Read all encrypted configs, decrypt with old key.
  3. Re-encrypt with new key.
  4. Write new ciphertext to DB (in a transaction).
  5. Update environment with new key.
  6. Restart API instances.
  7. Shred old key.

---

## 6. Encryption in Transit

### External (Client → API)

- **Protocol:** TLS 1.2 minimum, TLS 1.3 preferred
- **Certificate:** Provisioned by hosting provider (Vercel, Fly.io, Cloudflare) or Let's Encrypt
- **HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains` via Helmet
- **HTTP → HTTPS redirect:** Enforced at load balancer / reverse proxy level

### Internal (API → Redis)

- **Production:** `rediss://` URL scheme (TLS-wrapped Redis connection)
- **Development:** Plain `redis://` acceptable on localhost
- **AUTH:** Redis `REQUIREPASS` set in production config

### Internal (API → PostgreSQL)

- **Production:** `sslmode=require` in PostgreSQL connection string
- **Certificate validation:** `sslmode=verify-full` recommended (requires CA cert)
- **Development:** `sslmode=disable` acceptable on localhost

### API → External Services

- **Telegram Bot API:** HTTPS (Telegram enforces TLS)
- **Stripe API:** HTTPS (Stripe enforces TLS 1.2+)
- **All outbound HTTP clients:** `https://` URLs enforced in code; HTTP URLs rejected

---

## 7. Secrets Management

### Inventory of Secrets

| Secret | Name | Size | Rotation | Storage |
|--------|------|------|----------|---------|
| Telegram Bot Token | `BOT_TOKEN` | ~45 chars | On compromise | Env var |
| AES-256-GCM key | `ENCRYPTION_KEY` | 64 hex chars | Quarterly | Env var |
| Session secret | `SESSION_SECRET` | 64 hex chars | Monthly | Env var |
| PostgreSQL URL | `DATABASE_URL` | URL string | On compromise | Env var |
| Redis URL (with auth) | `REDIS_URL` | URL string | On compromise | Env var |
| Stripe secret key | `STRIPE_SECRET_KEY` | `sk_live_...` | On compromise | Env var |
| Stripe webhook secret | `STRIPE_WEBHOOK_SECRET` | `whsec_...` | On rotation | Env var |

### Rules — Never Violate

1. **Secrets never in source code.** `.env` files committed to version control fail CI (secret-scanning hooks).
2. **Secrets never in Docker images.** `Dockerfile` must not `COPY .env` or `ENV BOT_TOKEN=...`. Use runtime env injection.
3. **Secrets never in logs.** Pino `redact` config excludes `authorization`, `cookie`, and `env` keys from log output.
4. **Secrets never in error messages.** Error handler strips `process.env` references from any stringified errors.
5. **Secrets never in API responses.** Response serializers never include server-side config values.

### Rotation Procedure

```
ENCRYPTION_KEY rotation:
  1. Generate: openssl rand -hex 32 > /tmp/new_key.txt
  2. Set NEW_ENCRYPTION_KEY env var on a migration runner instance
  3. Run: pnpm run migrate:reencrypt --old-key $OLD --new-key $NEW
  4. Verify: pnpm run verify:encryption-integrity
  5. Update ENCRYPTION_KEY in production env
  6. Rolling restart API instances
  7. Shred /tmp/new_key.txt

SESSION_SECRET rotation:
  1. Generate: openssl rand -hex 32
  2. Update SESSION_SECRET in production env
  3. Rolling restart API instances
  4. All active sessions invalidated — users must re-authenticate
  5. Notify users if maintenance window communication is warranted

BOT_TOKEN rotation (Telegram BotFather):
  1. /revoke in BotFather → generates new token
  2. Update BOT_TOKEN in production env
  3. Rolling restart API instances
  4. All active sessions invalidated (new token = new HMAC key = all existing sessions invalid)
```
