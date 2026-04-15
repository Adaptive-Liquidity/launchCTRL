# LaunchCtrl Scale Notes

**Version:** 1.0.0  
**Last Updated:** 2026-01  
**Owner:** Platform Engineering  
**Classification:** INTERNAL

---

## Overview

LaunchCtrl's architecture is intentionally simple at launch — a single stateless API, a single bot process, PostgreSQL, and Redis. This document describes capacity at current architecture and the scaling path as the product grows.

---

## 1. Current Capacity (Single-Node Baseline)

These are conservative estimates for a 2-core / 2GB RAM instance running all services.

| Component | Baseline Capacity | Notes |
|-----------|------------------|-------|
| Hono API | ~500 req/s | CPU-bound at HMAC computation for auth; typical requests are I/O-bound |
| grammY Bot | ~1,000 webhook events/s | grammY's concurrency model handles concurrent updates without blocking |
| BullMQ workers | ~100 concurrent jobs | Default worker concurrency = 5; configurable per CPU core |
| PostgreSQL | 100 connections (pool) | PgBouncer recommended in front for production |
| Redis | 256MB default | Configurable; split instances recommended above 500 active workspaces |
| Next.js Mini App | Static / CDN | Not API-bound; served from Vercel/Cloudflare Pages |

**Realistic workload at baseline:**
- 500 monthly active workspaces
- ~50 plan generations/day
- ~200 execution runs/day
- ~1,000 API requests/day total

The single-node setup can comfortably handle 10x this workload before needing horizontal scaling.

---

## 2. Horizontal Scaling

### API (Hono)

The API is **stateless** — no in-process state. Sessions live in Redis, data in PostgreSQL.

```
Internet → Load Balancer (nginx / Cloudflare) → [API replica 1]
                                               → [API replica 2]
                                               → [API replica 3]
```

**Scaling trigger:** P95 latency >500ms or CPU >70% sustained.  
**Scaling unit:** Add API replicas. No coordination needed between replicas.  
**Session affinity:** Not required — sessions are in Redis, any replica can serve any request.  
**Deployment:** Rolling restart safe — no in-flight state to drain.

### Bot (grammY)

Telegram sends all updates to a single webhook URL. The bot process receives the webhook call, then enqueues the work into BullMQ. The bot process itself should stay as a single lightweight receiver.

```
Telegram → Bot webhook endpoint → BullMQ "bot-events" queue → Workers (fan-out)
```

**Do not** run multiple bot processes listening to the same webhook — only one process can receive each update.

If the bot process becomes a bottleneck (unlikely — it only enqueues and does not compute):
- Move bot processing to a dedicated lightweight service
- Use `getUpdates` long-polling alternative with multiple consumers (complex, not recommended for initial scale)

### Mini App (Next.js)

Deploy as a static export to Vercel, Cloudflare Pages, or any CDN. The Mini App is a Telegram Web App — it makes API calls to your Hono backend. Static asset serving is handled by the CDN, not your API.

**No API-side scaling needed for Mini App growth** unless API call volume increases.

### Database (PostgreSQL)

```
Primary (writes) ──┬── Read Replica 1 (analytics queries)
                   └── Read Replica 2 (reporting, future dashboard)
```

- **Writes:** All go to primary. Prisma's write connection points to primary.
- **Reads:** Route long-running analytics queries (audit log exports, workspace stats) to read replicas to avoid blocking primary.
- **Prisma datasource routing:** Use `@db.replica` annotation or separate Prisma clients for read vs. write.

### Redis

```
Single Redis  →  3 separate Redis instances:
  redis-sessions:  24h TTL session tokens     (high read, low write)
  redis-queues:    BullMQ job queues          (balanced, persistence-on)
  redis-ratelimit: Sliding window counters    (high write, short TTL)
```

Separating instances prevents rate-limit counter writes from causing LRU eviction of session data.

---

## 3. Database Scaling

### Connection Pooling

**Problem:** PostgreSQL process-per-connection model can't handle thousands of short-lived API connections efficiently.

**Solution:** PgBouncer in transaction mode in front of PostgreSQL.

```
API replicas (n × 10 Prisma connections) → PgBouncer (50 server connections) → PostgreSQL
```

Configuration:
```ini
# pgbouncer.ini
[databases]
launchctrl = host=postgres port=5432 dbname=launchctrl

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 50
min_pool_size = 10
server_idle_timeout = 600
```

With PgBouncer in transaction mode, 1,000 API connection slots require only 50 PostgreSQL server connections.

**Prisma note:** `pgBouncer=true` in connection string disables Prisma's built-in prepared statement cache (incompatible with PgBouncer transaction mode). Add `?pgBouncer=true&connection_limit=1` to `DATABASE_URL` when using PgBouncer.

### Table Partitioning

**`audit_events` table** — append-only, high-volume, queried by date range:

```sql
-- Partition by month (range partitioning)
CREATE TABLE audit_events (
  id          UUID NOT NULL,
  workspace_id UUID NOT NULL,
  user_id     UUID NOT NULL,
  action_type TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions (auto-created by migration or cron)
CREATE TABLE audit_events_2026_01 PARTITION OF audit_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_events_2026_02 PARTITION OF audit_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- etc.
```

**Benefits:**
- Queries scoped to date range touch only relevant partitions (partition pruning)
- Old partitions can be detached and archived without locking the main table
- Vacuum runs more efficiently on partition-sized tables

### Archival

**`execution_runs` table** — operational data with natural expiry:

```sql
-- Archive runs older than 90 days to cold storage table
-- Run as a scheduled job (pg_cron or external cron)
INSERT INTO execution_runs_archive
  SELECT * FROM execution_runs WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM execution_runs WHERE created_at < NOW() - INTERVAL '90 days';
```

Cold storage table: no indexes (append-only), consider `UNLOGGED` for further performance. Alternatively, export to S3 as Parquet files for long-term retention.

### Critical Indexes

All indexes defined in Prisma schema migrations:

```sql
-- workspace_members: membership lookup (every authenticated request)
CREATE INDEX idx_workspace_members_user_workspace 
  ON workspace_members(user_id, workspace_id);

-- workspace_members: workspace admin lookup
CREATE INDEX idx_workspace_members_workspace_role 
  ON workspace_members(workspace_id, role);

-- execution_runs: by workspace + status (dashboard queries)
CREATE INDEX idx_execution_runs_workspace_status 
  ON execution_runs(workspace_id, status, created_at DESC);

-- audit_events: by workspace + date range (most common query pattern)
CREATE INDEX idx_audit_events_workspace_created 
  ON audit_events(workspace_id, created_at DESC);

-- assets: by plan (asset listing per plan)
CREATE INDEX idx_assets_plan_id 
  ON assets(plan_id, created_at DESC);

-- plans: by workspace (plan listing)
CREATE INDEX idx_plans_workspace_created 
  ON plans(workspace_id, created_at DESC);

-- integration_configs: by workspace + type (integration lookup)
CREATE INDEX idx_integration_configs_workspace_type 
  ON integration_configs(workspace_id, integration_type);

-- feature_flag_overrides: lookup by flag + workspace
CREATE INDEX idx_flag_overrides_key_workspace 
  ON feature_flag_overrides(flag_key, workspace_id);
```

### N+1 Query Risks

**Known N+1 patterns and mitigations:**

| Query Pattern | Risk | Mitigation |
|--------------|------|-----------|
| List workspaces → fetch member count per workspace | N+1 count queries | Add `_count: { members: true }` to `include` in Prisma query |
| List plans → fetch step count + last execution status | N+1 subqueries | Single query with Prisma `include: { steps: true, executions: { orderBy: ..., take: 1 } }` |
| Execution runner fetching step configs | Sequential step fetches | Eager-load all steps in single query at plan start |
| Audit log export → workspace member name enrichment | N+1 user lookups | JOIN users table in audit query, not in app code |

**Rule:** All list endpoints must use Prisma `include` or `_count` — no application-layer loops that generate per-item queries.

---

## 4. Redis Scaling

### Recommended Instance Separation

| Instance | Purpose | TTL Strategy | maxmemory-policy | Size Estimate |
|----------|---------|-------------|-----------------|--------------|
| `redis-sessions` | Session tokens (64-char nanoid → user data JSON) | 24h hard | `allkeys-lru` (evict expired sessions first) | ~500 active sessions × 200 bytes = ~100KB; safe at 64MB |
| `redis-queues` | BullMQ job queues (execution + asset generation) | Job lifetime | `noeviction` (never evict — jobs must not be lost) | Depends on throughput; start at 128MB |
| `redis-ratelimit` | Sliding window counters per user/IP | 60s window | `allkeys-lru` | ~1,000 active users × 100 bytes = trivial; 32MB |

### Cluster Mode

Activate Redis Cluster when single-instance memory exceeds 256MB or when replication lag becomes a concern:

```bash
# Redis Cluster: 3 primary + 3 replica nodes (6 total)
# Minimum recommended: redis-queues instance (noeviction + AOF)
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

**BullMQ and Redis Cluster:** BullMQ supports Redis Cluster since v4. Use `{ cluster: { nodes: [...] } }` in connection config.

### TTL Strategy Reference

| Key Pattern | TTL | Rationale |
|-------------|-----|----------|
| `session:{token}` | 86400s (24h) | User session lifetime |
| `initdata:{hash}` | 300s (5min) | initData replay deduplication window |
| `rl:user:{userId}:{window}` | 60s (sliding window) | Rate limit counter |
| `rl:ip:{ip}:{window}` | 60s (sliding window) | Auth endpoint IP rate limit |
| `bull:execution-queue:*` | Job lifetime (BullMQ manages) | Queue managed by BullMQ |
| `bull:asset-queue:*` | Job lifetime (BullMQ manages) | Queue managed by BullMQ |

---

## 5. BullMQ Scaling

### Queue Architecture

```
execution-queue (priority: HIGH)
  └── Workers: 5 concurrent (tunable)
  └── Jobs: plan execution steps (30s max)
  └── Priority: 1-10 (lower = higher priority)
  └── DLQ: execution-queue-failed

asset-generation-queue (priority: NORMAL)
  └── Workers: 3 concurrent (tunable)  
  └── Jobs: copy generation, asset rendering (60s max)
  └── DLQ: asset-queue-failed

bot-events-queue (priority: LOW)
  └── Workers: 2 concurrent
  └── Jobs: Telegram event processing
  └── DLQ: bot-queue-failed
```

### Worker Tuning

```typescript
// Default: 5 concurrent jobs per worker process
const executionWorker = new Worker('execution-queue', processor, {
  connection: redisQueuesConnection,
  concurrency: process.env.WORKER_CONCURRENCY 
    ? parseInt(process.env.WORKER_CONCURRENCY) 
    : 5,
});

// Recommendation: WORKER_CONCURRENCY = 2 × (number of CPU cores)
// For a 2-core instance: WORKER_CONCURRENCY=4
// For a 4-core instance: WORKER_CONCURRENCY=8
```

### Retry Strategy

```typescript
const jobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,     // first retry after 1s, then 2s, then 4s
  },
  removeOnComplete: { count: 100 },   // keep last 100 completed jobs for debugging
  removeOnFail: false,                 // keep all failed jobs in DLQ for inspection
};
```

**Job timeout enforcement:**
```typescript
// execution steps: max 30 seconds
const processor = async (job: Job) => {
  return Promise.race([
    executeStep(job.data),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Job timeout: 30s exceeded')), 30_000)
    ),
  ]);
};
```

### Dead Letter Queue Monitoring

Failed jobs (exhausted all retries) remain in BullMQ's failed set. Monitor and alert:

```typescript
// Scheduled check every 5 minutes
const failedCount = await executionQueue.getFailedCount();
if (failedCount > 10) {
  alerts.notify('BullMQ DLQ depth exceeded threshold', { queue: 'execution-queue', count: failedCount });
}
```

**DLQ operations:**
- View failed jobs: BullMQ dashboard (Bull Board) at `/admin/queues`
- Retry a failed job: `job.retry()`
- Discard a failed job: `job.remove()`

---

## 6. Multi-Tenant Isolation

### Current Isolation (Implemented)

- **Data isolation:** All DB queries are workspace-scoped via middleware. No query can return data from a different workspace.
- **Session isolation:** Sessions are workspace-aware — a user's session carries their workspace membership context.
- **Audit isolation:** Audit events are workspace-scoped — workspace admins can only query their own audit logs.
- **Feature flag isolation:** Feature flag overrides can be per-workspace — different workspaces can have different flag states.

### Pending Isolation (TODO)

**Per-workspace rate limits (TODO):** Currently rate limits are per-user. A workspace with many active members could collectively exhaust rate limits. Implement workspace-level limits alongside user-level limits:

```typescript
// Future: workspace-level rate limit layer
async function checkWorkspaceRateLimit(workspaceId: string, action: string) {
  const key = `rl:workspace:${workspaceId}:${action}:${getCurrentWindow()}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  
  const limit = WORKSPACE_RATE_LIMITS[action] ?? 500; // req/min per workspace
  if (count > limit) throw new RateLimitError(`Workspace rate limit exceeded for ${action}`);
}
```

**Per-workspace Redis namespace (Future):** For very large deployments, namespace BullMQ queues by workspace to prevent one workspace's job flood from affecting queue depth metrics for all workspaces:

```
bull:execution-queue:{workspaceId}:waiting
bull:execution-queue:{workspaceId}:active
```

This requires BullMQ custom key prefix support.

**Resource quotas by subscription tier (TODO):** Enforce plan generation and asset count limits at the middleware layer, not just in application logic:

```typescript
// Check before creating plan
const usage = await getWorkspaceUsage(workspaceId, currentBillingPeriod());
if (usage.planGenerations >= tier.limits.planGenerationsPerMonth) {
  throw new QuotaExceededError('plan_generations', tier.limits.planGenerationsPerMonth);
}
```

---

## 7. Observability Stack

### Recommended Stack

```
Application → pino JSON logs → [Log Shipper] → Loki or Datadog
           → Prometheus metrics → Grafana dashboards
           → OpenTelemetry traces → Jaeger or Honeycomb
```

### Metrics to Instrument

| Metric | Type | Labels | Alert Threshold |
|--------|------|--------|----------------|
| `http_request_duration_ms` | Histogram | `method`, `route`, `status` | P95 >1000ms |
| `http_request_total` | Counter | `method`, `route`, `status` | — |
| `auth_validation_failures_total` | Counter | `failure_type`, `ip` | >50/min same IP |
| `session_operations_total` | Counter | `operation` (create/hit/miss/revoke) | Miss rate >20% |
| `db_query_duration_ms` | Histogram | `model`, `operation` | P95 >500ms |
| `redis_operation_duration_ms` | Histogram | `command` | P95 >50ms |
| `bullmq_jobs_total` | Counter | `queue`, `status` | Failed >10 |
| `bullmq_job_duration_ms` | Histogram | `queue` | P95 >20s |
| `rate_limit_hits_total` | Counter | `type` (user/workspace/ip) | — |
| `feature_flag_evaluations_total` | Counter | `flag`, `result` | — |
| `workspace_quota_checks_total` | Counter | `resource`, `result` | Exceeded >0 |

### OpenTelemetry Tracing

Instrument key request paths to trace the full call chain:

```typescript
// packages/api/src/lib/telemetry.ts
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('launchctrl-api', '1.0.0');

// Wrap critical paths in spans
const span = tracer.startSpan('execution.run.step', {
  attributes: {
    'workspace.id': workspaceId,
    'plan.id': planId,
    'step.type': step.type,
    'execution.mode': step.mode,
  },
});
try {
  const result = await executeStep(step);
  span.setStatus({ code: SpanStatusCode.OK });
  return result;
} catch (err) {
  span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
  throw err;
} finally {
  span.end();
}
```

### Grafana Dashboard Structure

**Dashboard 1: API Health**
- Request rate (req/s) by route
- Error rate (4xx, 5xx) over time
- P50/P95/P99 latency by route
- Active session count

**Dashboard 2: Execution Operations**
- Execution runs per hour (by mode: DRY_RUN vs live)
- BullMQ queue depth over time
- Job success/failure ratio
- DLQ depth per queue

**Dashboard 3: Security Events**
- Auth failures per hour by type
- Rate limit hits per hour by type
- 403 (authorization failures) per hour
- Webhook signature failures

**Dashboard 4: Resource Utilization**
- DB connection pool utilization
- Redis memory usage
- API CPU/memory per replica
- BullMQ worker utilization

### Log Schema

All logs follow this structure (pino JSON):

```json
{
  "level": "info",
  "time": "2026-01-15T14:30:00.000Z",
  "pid": 12345,
  "hostname": "api-replica-2",
  "msg": "Execution step completed",
  "requestId": "req_abc123",
  "workspaceId": "ws_xyz789",
  "userId": "usr_def456",
  "action": "execution.step.complete",
  "stepType": "COPY_PASTE",
  "durationMs": 145
}
```

**Redacted fields** (never appear in logs):
- `authorization` (session tokens)
- `password`, `secret`, `token`, `key` (any field matching these patterns)
- `initData` (raw Telegram auth data)
