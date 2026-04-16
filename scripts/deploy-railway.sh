#!/usr/bin/env bash
set -euo pipefail

# LaunchCtrl Railway Deployment Script
# Prerequisites:
#   1. Railway CLI installed: npm i -g @railway/cli
#   2. Logged in: railway login
#   3. Project linked: railway link (select your "marvelous-wisdom" project)
#   4. .env.railway file populated with all secrets

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== LaunchCtrl Railway Deployment ==="
echo ""

# ── Step 1: Verify Railway auth ─────────────────────────────
echo "[1/7] Verifying Railway authentication..."
railway whoami || { echo "ERROR: Not logged in. Run: railway login"; exit 1; }
echo ""

# ── Step 2: Verify project is linked ────────────────────────
echo "[2/7] Checking project link..."
railway status || { echo "ERROR: No project linked. Run: railway link"; exit 1; }
echo ""

# ── Step 3: Add Postgres plugin ──────────────────────────────
echo "[3/7] Adding Postgres database..."
echo "  -> If Postgres is already added, this may error (safe to ignore)"
railway add --database postgres || echo "  (Postgres may already exist)"
echo ""

# ── Step 4: Add Redis plugin ────────────────────────────────
echo "[4/7] Adding Redis..."
echo "  -> If Redis is already added, this may error (safe to ignore)"
railway add --database redis || echo "  (Redis may already exist)"
echo ""

# ── Step 5: Print reference variables ────────────────────────
echo "[5/7] Railway infrastructure ready."
echo ""
echo "=== MANUAL STEPS REQUIRED ==="
echo ""
echo "Go to https://railway.com/dashboard and for each service set these vars:"
echo ""
echo "--- API service (@launchctrl/api) ---"
echo "  NODE_ENV=production"
echo "  DATABASE_URL=\${{Postgres.DATABASE_URL}}"
echo "  REDIS_URL=\${{Redis.REDIS_URL}}"
echo "  TELEGRAM_BOT_TOKEN=<your BotFather token>"
echo "  JWT_SECRET=<from .env.railway>"
echo "  ENCRYPTION_KEY=<from .env.railway>"
echo "  TELEGRAM_MINI_APP_URL=https://<miniapp-service>.up.railway.app"
echo "  LOG_LEVEL=info"
echo ""
echo "--- Bot service (@launchctrl/bot) ---"
echo "  NODE_ENV=production"
echo "  TELEGRAM_BOT_TOKEN=<same token>"
echo "  TELEGRAM_MINI_APP_URL=https://<miniapp-service>.up.railway.app"
echo "  WEBHOOK_URL=https://<bot-service>.up.railway.app/webhook"
echo "  TELEGRAM_BOT_WEBHOOK_SECRET=<from .env.railway>"
echo "  DATABASE_URL=\${{Postgres.DATABASE_URL}}"
echo "  REDIS_URL=\${{Redis.REDIS_URL}}"
echo "  JWT_SECRET=<from .env.railway>"
echo "  ENCRYPTION_KEY=<from .env.railway>"
echo ""
echo "--- MiniApp service (@launchctrl/miniapp) ---"
echo "  NEXT_PUBLIC_API_URL=https://<api-service>.up.railway.app"
echo ""

# ── Step 6: Run migrations ──────────────────────────────────
echo "[6/7] Running database migrations..."
echo "  -> Make sure DATABASE_URL is set in your Railway API service first"
echo "  -> Then run: railway run --service api pnpm --filter @launchctrl/api db:migrate"
echo ""

# ── Step 7: Deploy ──────────────────────────────────────────
echo "[7/7] Deploying services..."
echo "  Railway auto-deploys from GitHub on push."
echo "  If you need manual deploy: railway up --service <service-name>"
echo ""
echo "=== Deployment script complete ==="
echo "Run the verification checklist after all services are up:"
echo "  curl https://<api-domain>/health"
echo "  curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
echo "  Open https://<miniapp-domain> in browser"
