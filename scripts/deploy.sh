#!/usr/bin/env bash
# Bare-metal VPS deploy for the PM2-hosted app (apps/api + apps/web, standalone).
# Fails loudly on any step instead of silently continuing to the next one —
# root cause of the 2026-08-11 outage was two manual steps run out of order
# with no error propagation (a no-op migrate command, a stale .next build).
set -euo pipefail
cd "$(dirname "$0")/.."

# The root shell on the VPS has exported an old DATABASE_URL before; Nest lets
# process env override .env, so a stale export points the API at the wrong DB.
unset DATABASE_URL DIRECT_URL

# Previous builds' JS/CSS chunks are kept here for a couple of days so tabs that
# were open during a deploy can still load what they ask for.
STATIC_ARCHIVE="${STATIC_ARCHIVE:-$HOME/.whtzup-static-archive}"
mkdir -p "$STATIC_ARCHIVE"

echo "==> git pull"
git pull origin main

echo "==> pnpm install"
pnpm install --frozen-lockfile

echo "==> prisma migrate deploy"
pnpm --filter @saas/database db:migrate:prod

echo "==> prisma generate"
pnpm --filter @saas/database db:generate

echo "==> build api"
# Plain `pnpm --filter X build` runs only X's own build script — it ignores
# turbo.json's dependsOn: ["^build"], so workspace deps like @saas/types
# never rebuild first and apps/api compiles against a stale dist/ (root
# cause of the 2026-09-04 PLATFORM_STAFF enum-not-found deploy failure).
# `turbo run build --filter` resolves that dependency graph before building.
pnpm exec turbo run build --filter=@saas/api

echo "==> archive current static chunks"
if [ -d apps/web/.next/static ]; then
  cp -a apps/web/.next/static/. "$STATIC_ARCHIVE/"
fi
find "$STATIC_ARCHIVE" -type f -mtime +2 -delete 2>/dev/null || true

echo "==> build web"
rm -rf apps/web/.next
pnpm exec turbo run build --filter=@saas/web

echo "==> copy standalone static/public"
mkdir -p apps/web/.next/standalone/apps/web/.next
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
# Old chunks fill in only where the new build has no file of that name.
cp -an "$STATIC_ARCHIVE/." apps/web/.next/standalone/apps/web/.next/static/ 2>/dev/null || true
cp -r apps/web/public apps/web/.next/standalone/apps/web/public

echo "==> build launch page"
pnpm --filter @saas/launch-page build

echo "==> pm2 reload"
# saas-web moved from a single fork process to cluster mode; PM2 can't switch a
# running app's exec mode in place, so drop the old fork once.
if pm2 describe saas-web 2>/dev/null | grep -q "fork_mode"; then
  pm2 delete saas-web
fi
# startOrReload applies ecosystem.config.js env (COOKIE_SECURE, HOSTNAME, ...) and
# reloads cluster apps one worker at a time.
pm2 startOrReload ecosystem.config.js \
  --only saas-api,saas-web,saas-worker,saas-launch-page --update-env
pm2 save

echo "==> health check"
healthy=0
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4001/api/v1/health >/dev/null 2>&1 \
    && curl -fsS -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
    healthy=1
    break
  fi
  sleep 3
done
if [ "$healthy" = 1 ]; then echo "API + web healthy"; else echo "WARNING: health check failed"; fi

echo "==> done"
pm2 logs saas-api saas-web --lines 20 --nostream
