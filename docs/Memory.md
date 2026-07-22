# Memory.md — Whtzup.city (working progress log)

> Living context so a new chat/tool doesn't re-read the whole codebase. Update the
> top block + change log after each meaningful change.

## Current state

- **Branch:** `main`. **HEAD:** `7e5f587` (design tokens), pushed to
  `github.com/akshayka2004/whatzup.city`.
- **Deploy:** VPS (Mumbai), PM2 — `saas-api` :4001, `saas-web` :3000,
  `saas-worker`, `saas-launch-page` :6001. Supabase Postgres (ap-south-1), local
  Redis + Typesense.
- **Build health:** API `nest build` clean; web `next build` clean.

## In flight

- **UI/UX overhaul** (dark + bronze, system-first, polish-not-disrupt). Phase UX-1
  (design system tokens + primitives) done + pushed. Next: UX-2 nav/shells, then
  per-role page passes. See `docs/Phases.md`.

## Recently done (newest first)

- `7e5f587` — global design tokens realigned to bronze anchor palette; AA contrast
  fix (`--muted-foreground` was 4.33:1 on cards → ~5.7:1); status + z-index tokens;
  Button/Input polish (44px targets, cursor, motion). PRODUCT.md + DESIGN.md added.
- `2d67e02` — premium `/login` redesign + `/forgot-password` page; ForgotPasswordDto
  tenant optional. login-hero.png added.
- `db863fe` — reviews: bust business cache on rating change; recompute centralised.
- `f64369f` — submit the star rating captured in the bill form.
- `70a0d25` — bills: business moderation queue scoped by businessId (cross-tenant);
  owner/customer notifications.
- `3740551` — onboarding gate for non-approved workspaces; plan resubmit fix;
  surface reject reason; auto-publish reviews.
- `50e40dc` — analytics: platform-wide overview for super-admin.
- `18a39e3` — order literal `/users` routes before `:id`.
- Region migration Tokyo → Mumbai (storage copy + env swap).

## Gotchas to remember (bit us in prod)

1. **Next standalone**: after every web build, copy `.next/static` + `public` into
   `.next/standalone/apps/web/` or JS chunks + images 404 (`ChunkLoadError`).
2. **Redis business cache**: writes changing `averageRating`/counts must bust
   `business:{id}` (and slug) — else stale after refresh. Never `FLUSHALL` (kills BullMQ).
3. **Cross-tenant bills**: query by `businessId`, use the bill's own `tenantId` for
   writes/notifications. Tenant-scoped queries hid bills from owners.
4. **Route order**: literal routes before `:param` (P2023 invalid UUID otherwise).
5. **No inline `<style>`** in client components (React 19 crash) — CSS in globals.css.
6. **.env**: root `.env` is what the API reads; never paste masked keys (bullets →
   ByteString error); `pm2 restart --update-env` to reload.
7. **Prisma migrate**, never `db push`.
8. **Dev preview pane**: screenshots/`/login` render flakily in the in-app browser;
   verify via compiled CSS/build output + real Chrome.

## VPS deploy quick ref

```bash
cd /opt/saas-platform/whatzup.city && git pull origin main
# API (only if api changed):
pnpm --filter @saas/api build && pm2 restart saas-api --update-env
# Web:
cd apps/web && rm -rf .next && pnpm build \
  && cp -r .next/static .next/standalone/apps/web/.next/ \
  && cp -r public .next/standalone/apps/web/ && cd ../.. \
  && pm2 restart saas-web --update-env
# DB migration (only if schema changed):
cd packages/database && pnpm prisma migrate deploy && pnpm prisma generate && cd ../..
```

## Open items

- `/reset-password` page (API exists).
- DB perf indexes migration apply on VPS.
- Social sign-in wiring.
- Opera cross-browser check.
