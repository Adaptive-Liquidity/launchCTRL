#!/usr/bin/env bash
set -euo pipefail
echo "🗄️  Running database migrations..."
pnpm --filter @launchctrl/api db:migrate
echo "✅ Migrations complete."
