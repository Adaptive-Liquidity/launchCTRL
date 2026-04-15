#!/usr/bin/env bash
set -euo pipefail
echo "🌱 Seeding database..."
pnpm --filter @launchctrl/api db:seed
echo "✅ Seed complete."
