#!/usr/bin/env bash
set -euo pipefail

echo "🚀 LaunchCtrl — Starting development environment..."

# Check for .env
if [ ! -f ".env" ]; then
  echo "⚠️  No .env file found. Copying from .env.example..."
  cp .env.example .env
  echo "✅ .env created. Please fill in the required values before continuing."
  exit 1
fi

# Start infrastructure
echo "📦 Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

# Wait for postgres
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U launchctrl > /dev/null 2>&1; do
  sleep 1
done
echo "✅ PostgreSQL is ready."

# Run migrations
echo "🗄️  Running database migrations..."
pnpm db:migrate

# Check if seed needed
if [ "${SEED:-false}" = "true" ]; then
  echo "🌱 Seeding database..."
  pnpm db:seed
fi

echo "✅ Infrastructure ready. Starting app services..."
pnpm dev
