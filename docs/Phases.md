# Phases.md — Whtzup.city

Build broken into phases. ✅ done · 🟡 in progress · ⬜ planned.

## Foundation (done)

- ✅ **P0 — Scaffolding:** monorepo (pnpm+turbo), NestJS API, Next.js web, worker,
  Prisma schema, Supabase, Redis, Typesense, PM2 deploy.
- ✅ **P1 — Auth & roles:** JWT access+refresh, RolesGuard, seeded accounts,
  multi-tenant scoping.
- ✅ **P2 — Business core:** business CRUD, categories, branches, documents, media,
  tags, public profile.

## Product build-out (done)

- ✅ **P3 — Onboarding & verification:** business + entity onboarding wizards,
  admin/super-admin verification queue, approve/reject with reason, workspace gate.
- ✅ **P4 — Discovery:** home, category, nearby, search (Typesense), business detail,
  city filtering, public cards.
- ✅ **P4B — Offers/events/notices:** offers (%/amount, city-targeted), events CRUD +
  click tracking, government announcements (link + issue/start/end dates + expiry).
- ✅ **P5 — Reviews & bills:** reviews/ratings (auto-publish, aggregate, cache-bust),
  bill upload → OCR → cross-tenant moderation queue → verified purchase, owner +
  customer notifications.
- ✅ **P6 — Admin/super-admin:** registrations, businesses (filters/sort/totals),
  tenants, users (edit any), categories, events, notices, reports, escalated bill
  queue, platform-wide analytics overview.
- ✅ **P7 — Trials/subscriptions:** trial lifecycle + expiry gate, subscription plans.

## Infrastructure (done)

- ✅ **Region migration:** Supabase Tokyo → Mumbai (colocate with VPS), storage copy,
  env swap, URL handling. Killed ~100ms/query latency.
- ✅ **Docs baseline:** `PROJECT_DOCUMENTATION.md`.

## Auth redesign (done)

- ✅ **Login redesign:** premium split-layout `/login` (city hero, bronze palette).
- ✅ **Forgot-password:** `/forgot-password` page + tenant-optional DTO.

## UI/UX overhaul — design system v3 (October 2026)

- ✅ **UX-1 — Design system v3:** soft-modern tokens (shape scale, soft status surfaces,
  elevation, type utilities, CVD-validated chart palette), restyled primitives, new
  `components/system/*`, `/design` style guide, `pnpm lint:design` guard (933 → 13).
- ✅ **UX-2 — Navigation & shells:** single nav config for every role, one AppShell,
  collapsible sidebar, avatar account menu (theme + language), light/dark gates.
- ✅ **UX-3 — Public pages:** BusinessCard v2, search-first hero, category bar,
  favorites fix, no fake claim codes, search/card/save/share/website tracking.
- ✅ **Auth:** light AuthShell, `/reset-password`.
- 🟡 **UX-4 — Business dashboard:** ✅ Today overview, analytics, sectioned settings,
  accessible modals everywhere · ⬜ bill-queue split view + shortcuts, promotions
  drawer with live preview, review replies, real support tickets.
- 🟡 **UX-5 — Admin/super-admin:** ✅ platform overview on analytics v2, live system
  health, real bill-escalation queue, fabricated screens removed · ⬜ merge admin /
  super-admin duplicates, DataTable on all lists.
- 🟡 **UX-6 — States & polish:** ✅ toasts/confirm dialog, 12px minimum text,
  semantic colours app-wide, dark-mode logo · ⬜ dashboard `loading.tsx`, full a11y
  audit, Malayalam for page bodies.

## Analytics v2 (October 2026)

- ✅ IST day/week/month buckets, visitor dedupe, bot filtering, period comparison,
  funnel, sources, devices, heatmap, offer conversion, platform revenue/onboarding.
- ✅ Event allowlist, server-derived tenant/device/bot, hashed IPs, batch ingest.
- ✅ Ownership checks on business analytics/customers/dashboard; trials stats role guard.
- ✅ Claims idempotent + atomic; verified purchases counted on verification.
- ⬜ Daily rollup tables + nightly job (only needed once event volume grows).

## Remaining / backlog

- ⬜ **DB perf indexes** migration apply on VPS (composite + partial indexes staged).
- ⬜ **Social sign-in** (currently UI placeholder only).
- ⬜ **Opera** cross-browser confirmation (suspected ad-blocker/cache).
