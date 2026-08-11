#!/usr/bin/env bash
# Bare-metal VPS deploy for the PM2-hosted app (apps/api + apps/web, standalone).
# Fails loudly on any step instead of silently continuing to the next one —
# root cause of the 2026-08-11 outage was two manual steps run out of order
# with no error propagation (a no-op migrate command, a stale .next build).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> git pull"
git pull origin main

echo "==> pnpm install"
pnpm install --frozen-lockfile

echo "==> prisma migrate deploy"
pnpm --filter @saas/database db:migrate:prod

echo "==> prisma generate"
pnpm --filter @saas/database db:generate

echo "==> build api"
pnpm --filter @saas/api build

echo "==> build web"
rm -rf apps/web/.next
pnpm --filter @saas/web build

echo "==> copy standalone static/public"
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
cp -r apps/web/public apps/web/.next/standalone/apps/web/public

echo "==> pm2 restart"
pm2 restart saas-api saas-web --update-env

echo "==> done"
pm2 logs saas-api saas-web --lines 20 --nostream
