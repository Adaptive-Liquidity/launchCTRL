# LaunchCtrl Security Checklist

**Version:** 1.0.0  
**Last Updated:** 2026-01  
**Owner:** Platform Operations  
**Classification:** INTERNAL  

Use this checklist for every production deployment, configuration change, and periodic review. Items marked **BLOCKING** must be resolved before go-live. Items marked **RECOMMENDED** are best practice but have documented acceptable workarounds.

---

## Pre-Deploy Checklist

### Environment Configuration

- [ ] **[BLOCKING]** `BOT_TOKEN` is set and non-empty
  - Verify: `echo $BOT_TOKEN | wc -c` should return >40
  - Source: Telegram BotFather → `/token`

- [ ] **[BLOCKING]** `ENCRYPTION_KEY` is set and is exactly 64 hex characters (32 bytes)
  - Generate: `openssl rand -hex 32`
  - Verify length: `echo $ENCRYPTION_KEY | tr -d '\n' | wc -c` should return `64`
  - Verify hex: `echo $ENCRYPTION_KEY | grep -E '^[0-9a-f]{64}$'` should match

- [ ] **[BLOCKING]** `SESSION_SECRET` is set and is at least 32 characters
  - Generate: `openssl rand -hex 32`

- [ ] **[BLOCKING]** `DATABASE_URL` is set with valid PostgreSQL connection string
  - Format: `postgresql://user:password@host:5432/dbname?sslmode=require`
  - Verify: `pnpm prisma db execute --stdin <<< "SELECT 1"`

- [ ] **[BLOCKING]** `REDIS_URL` is set with valid Redis connection string including auth
  - Format: `rediss://:password@host:6379` (note `rediss://` for TLS)

- [ ] **[BLOCKING]** `NODE_ENV=production` is set
  - This enables error sanitization, disables stack traces in responses, and activates Helmet's strict CSP

- [ ] **[BLOCKING]** `BOT_TOKEN` is NOT committed to source control
  - Run: `git log --all --full-history -- '**/.env*'` — should return no results with secrets
  - Run: `pnpm run secrets:scan` to check for leaked secrets in git history

- [ ] **[BLOCKING]** `.env` file is NOT copied into the Docker image
  - Verify: `docker inspect <image> | grep -i env` should not show BOT_TOKEN value
  - The `Dockerfile` must use `ARG`-free patterns; secrets injected at runtime via orchestration

- [ ] `STRIPE_SECRET_KEY` is set (if billing is enabled)
  - Use `sk_live_...` prefix for production, `sk_test_...` for staging

- [ ] `STRIPE_WEBHOOK_SECRET` is set (if billing is enabled)
  - Generated from Stripe Dashboard → Webhooks → Signing secret

- [ ] `CORS_ORIGIN` is set to your exact Mini App domain
  - Example: `https://t.me/your_bot_username` or your web domain
  - Must NOT be `*` in production

- [ ] `API_BASE_URL` is set to your public API URL (used in self-referencing links)

### DRY_RUN Configuration

- [ ] **[BLOCKING]** `DRY_RUN=true` is confirmed for initial deployment
  - Default is `true` — verify with: `grep DRY_RUN packages/api/src/config.ts`
  - Do NOT set `DRY_RUN=false` until end-to-end testing is complete

- [ ] `DRY_RUN=false` is only set after:
  - [ ] Full end-to-end test with real Telegram bot (not test bot)
  - [ ] Execution of a full launch sequence in staging
  - [ ] Explicit sign-off from project lead
  - [ ] Monitoring dashboards are live and alerting

### Database

- [ ] **[BLOCKING]** All Prisma migrations have been run before starting the API
  - Command: `pnpm prisma migrate deploy`
  - Verify: `pnpm prisma migrate status` shows all migrations applied

- [ ] PostgreSQL user has least-privilege grants (not `SUPERUSER`)
  - The DB user should have: SELECT, INSERT, UPDATE, DELETE on application tables only
  - Should NOT have: CREATE TABLE, DROP, TRUNCATE, pg_read_all_data

- [ ] **[RECOMMENDED]** PostgreSQL SSL mode is `verify-full` (with CA cert) in production
  - Minimum acceptable: `sslmode=require`

- [ ] Database backup configured and tested
  - Backup frequency: daily minimum
  - Restore tested: verify you can restore to a clean instance

### Redis

- [ ] **[BLOCKING]** Redis password is set (`REQUIREPASS` in redis.conf or AUTH in URL)
  - Test: `redis-cli -u $REDIS_URL PING` should succeed; `redis-cli -h host PING` without auth should fail

- [ ] **[BLOCKING]** Redis port 6379 is NOT exposed to the public internet
  - Verify: `nmap -p 6379 <public-ip>` should show port as filtered/closed

- [ ] Redis `maxmemory` is configured
  - Recommended: `maxmemory 256mb` minimum
  - Policy: `maxmemory-policy allkeys-lru` for session instance

- [ ] **[RECOMMENDED]** AOF persistence enabled for BullMQ queue Redis instance
  - Config: `appendonly yes` in redis.conf
  - Prevents job loss on Redis restart

### Telegram Bot

- [ ] Bot webhook is set to your production URL
  - Command: `curl https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=https://your-api.com/bot/webhook`
  - Verify: `curl https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo`

- [ ] **[RECOMMENDED]** Bot webhook uses `secret_token` parameter for validation
  - Set: `curl ... setWebhook?url=...&secret_token=<random-secret>`
  - Implement `X-Telegram-Bot-Api-Secret-Token` header validation in webhook handler

- [ ] Bot is set to privacy mode for group messages (if applicable)
  - Verify in BotFather: `/mybots` → Bot Settings → Group Privacy

### CORS and Security Headers

- [ ] CORS allowed origins matches your Mini App domain exactly (no trailing slash issues)
  - Test: `curl -H "Origin: https://attacker.com" https://your-api.com/api/v1/workspaces` should return `403` or no CORS headers

- [ ] Helmet security headers are active
  - Test: `curl -I https://your-api.com/api/v1/health | grep -E '(x-frame|x-content|strict-transport|content-security)'`
  - Expected headers present: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`

---

## Runtime Verification Checklist

### Rate Limiting

- [ ] **[BLOCKING]** Rate limiting is active on auth endpoint
  - Test: Send 25 rapid POST requests to `/auth/telegram` from same IP
  - Expected: 20th+ requests return `429 Too Many Requests` with `Retry-After` header

- [ ] Rate limiting is active on general API
  - Test: Send 105 rapid requests to any `/api/v1/*` endpoint
  - Expected: 101st+ requests return `429`

- [ ] Rate limit headers present in responses
  - Expected: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Session Management

- [ ] Session expiry is working
  - Test: Create a session, manually expire its Redis key (`DEL session:{token}`), attempt API call
  - Expected: `401 Unauthorized`

- [ ] Session is not returned or loggable
  - Test: Check API access logs — session tokens must NOT appear in log lines
  - Verify: `pnpm run test:security:token-leakage`

- [ ] Logout revokes session immediately
  - Test: Call `POST /api/v1/auth/logout`, attempt subsequent request with same token
  - Expected: `401 Unauthorized`

### initData Validation

- [ ] Stale initData is rejected
  - Test: Craft a valid initData with `auth_date` > 5 minutes ago
  - Expected: `401 Unauthorized` with code `INITDATA_EXPIRED`

- [ ] Tampered initData is rejected
  - Test: Modify `user.id` field in initData without recalculating HMAC
  - Expected: `401 Unauthorized` with code `INITDATA_INVALID`

### Audit Logging

- [ ] Audit events are written for all execution actions
  - Test: Trigger an execution run (any mode), check `audit_events` table
  - Expected: One or more rows with `action_type = 'EXECUTION_STEP_*'` and correct `user_id`

- [ ] Audit events cannot be deleted via API
  - Verify: No DELETE endpoint exists for `/api/v1/audit*`
  - Verify: DB user cannot execute `DELETE FROM audit_events`

### Error Response Sanitization

- [ ] Stack traces do not appear in production error responses
  - Test: Trigger a `500` error (e.g., invalid DB config temporarily)
  - Expected response body: `{ "error": "Internal server error", "code": "INTERNAL_ERROR" }`
  - Must NOT contain: `Error:`, `at Object.`, file paths, line numbers

- [ ] BOT_TOKEN does not appear in any error response
  - Run: `pnpm run test:security:secret-leakage`

### Webhook Validation

- [ ] Stripe webhook rejects requests without valid signature
  - Test: POST to `/webhooks/stripe` with empty or wrong `Stripe-Signature` header
  - Expected: `400 Bad Request` with `INVALID_SIGNATURE`

- [ ] **[RECOMMENDED]** Telegram webhook rejects requests without secret token header
  - Test: POST to `/bot/webhook` without `X-Telegram-Bot-Api-Secret-Token`
  - Expected: `401 Unauthorized`

### Feature Flags

- [ ] All WILD feature flags are `enabled=false` by default
  - Test: `GET /api/v1/flags` — verify no `wild.*` flags show `enabled: true` unless intentionally activated
  - Verify: `SELECT * FROM feature_flags WHERE key LIKE 'wild.%' AND enabled = true` returns no rows

- [ ] `FORCE_WILD_FLAGS` env var is NOT set in production
  - Verify: `printenv FORCE_WILD_FLAGS` should return empty

---

## Monitoring Checklist

### Log Aggregation

- [ ] Structured JSON logs flowing to log drain
  - Verify: Pino output is valid JSON: `node -e "require('./dist/app').start()" | head -5 | jq .`
  - Log drain configured: Loki / Datadog / Papertrail

- [ ] Log level set correctly for environment
  - Production: `LOG_LEVEL=info` (not `debug` — debug may log sensitive data)
  - Staging: `LOG_LEVEL=debug` acceptable

- [ ] `authorization` header is redacted from access logs
  - Verify in log drain: search for `Bearer` — should return zero results

### Alerting

- [ ] Alert configured: repeated 401s from single IP
  - Threshold: >10 auth failures from same IP within 60 seconds
  - Action: Notify ops channel, optionally trigger automatic IP block

- [ ] Alert configured: execution runs with ERROR status
  - Threshold: Any single execution run with final status `FAILED`
  - Action: Notify workspace admin + ops log

- [ ] Alert configured: DB connection pool exhaustion
  - Threshold: Available connections < 2
  - Action: Page on-call ops

- [ ] Alert configured: Redis memory >80% of maxmemory
  - Action: Notify ops, plan scaling

- [ ] Alert configured: BullMQ dead-letter queue depth >10
  - Action: Notify ops, inspect failed jobs

- [ ] Alert configured: P95 API latency >1000ms (5-minute window)
  - Action: Investigate, page if sustained

### Health Checks

- [ ] `/api/v1/health` endpoint returns `200` with DB and Redis status
  - Expected: `{ "status": "ok", "db": "ok", "redis": "ok" }`

- [ ] Health check included in load balancer / container orchestration liveness probe

---

## Periodic Security Review Checklist

### Monthly

- [ ] Rotate `SESSION_SECRET`
  - Procedure: Generate new 64-char hex, update env, rolling restart
  - Impact: All active sessions invalidated (users re-authenticate)
  - Schedule during low-traffic period, communicate to users

- [ ] Review recent auth failure logs for anomalous patterns
  - Look for: Systematic user ID enumeration attempts, credential stuffing patterns

- [ ] Run `pnpm audit` in all workspaces
  - Resolve: All `critical` and `high` severity findings before next deploy
  - Track: `moderate` findings with timeline for resolution

- [ ] Review active WILD feature flags — disable any not actively in use
  - Query: `SELECT key, enabled, rollout_percentage FROM feature_flags WHERE key LIKE 'wild.%'`

### Quarterly

- [ ] Rotate `ENCRYPTION_KEY`
  - Procedure: See trust-boundaries.md → Secrets Management → Rotation Procedure
  - Requires: Migration script, maintenance window, DB backup before rotation

- [ ] Review audit logs for anomalies
  - Look for: Unexpected workspace admin role grants, bulk execution runs at unusual hours, users accessing workspaces they don't typically use

- [ ] Test backup restoration
  - Restore DB backup to clean PostgreSQL instance
  - Verify: All tables present, row counts reasonable, encryption configs decrypt correctly

- [ ] Review CORS, CSP, and security header configuration for regressions
  - Run: `securityheaders.com` scan against your API domain
  - Target grade: A or A+

- [ ] Review all third-party integrations for deprecated APIs or expiring credentials
  - Check: Stripe API version in use, Telegram Bot API changelog, any OAuth token expiry

### Annually

- [ ] Full threat model review (this document)
  - Update asset inventory for any new data types
  - Add new threats discovered over the year
  - Review accepted risks — are they still acceptable?

- [ ] Dependency audit and major version upgrades
  - Target: Hono, Prisma, grammY, BullMQ on latest major versions

- [ ] Penetration test (if enterprise tier is launched)
  - Scope: Auth flows, workspace isolation, WILD feature flag bypass attempts

- [ ] Review and update security-checklist.md for new features shipped

---

## Emergency Response Checklist

### Suspected Bot Token Compromise

- [ ] Immediately revoke token: BotFather → `/mybots` → `API Token` → `Revoke current token`
- [ ] Update `BOT_TOKEN` env var on all instances
- [ ] Rolling restart all API instances
- [ ] All active sessions immediately invalidated (old HMAC key no longer valid)
- [ ] Audit: Review recent initData validation logs for anomalous user IDs
- [ ] Notify affected workspace admins if suspicious execution runs detected

### Suspected ENCRYPTION_KEY Compromise

- [ ] Treat all stored integration configs as compromised
- [ ] Notify all workspace admins to rotate their integration credentials (Twitter tokens, etc.)
- [ ] Generate new ENCRYPTION_KEY
- [ ] Re-encrypt all configs (migration script)
- [ ] Update env and restart

### Suspected Session Token Leak

- [ ] Revoke specific token: `DEL session:{token}` in Redis
- [ ] If bulk leak suspected: Flush all sessions (`DEL session:*`) — all users re-authenticate
- [ ] Rotate SESSION_SECRET to invalidate any tokens not yet flushed
- [ ] Audit: Check which API actions were performed with leaked token

### Database Breach

- [ ] Take database offline (or revoke compromised credentials immediately)
- [ ] Assess: What data was accessed? Integration configs (encrypted), user IDs, workspace data?
- [ ] If integration configs were accessed: Assume all plaintext configs compromised (attacker may have ENCRYPTION_KEY too)
- [ ] Notify affected users per applicable breach notification laws (GDPR 72h, CCPA, etc.)
- [ ] Rotate ENCRYPTION_KEY, have users rotate all integration credentials
- [ ] Review PostgreSQL audit logs for the breach window
