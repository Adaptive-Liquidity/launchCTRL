#!/usr/bin/env bash
set -euo pipefail
echo "🔍 Running type checks across all packages..."
pnpm typecheck
echo "✅ Type checks passed."
