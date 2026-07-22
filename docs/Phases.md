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

## UI/UX overhaul (in progress)

- ✅ **UX-1 — Design system:** `PRODUCT.md` + `DESIGN.md`; global token realignment
  to bronze identity; AA contrast fix (`--muted-foreground`); status + z-index
  tokens; Button/Input polish (touch targets, cursor, motion). *(commit 7e5f587)*
- 🟡 **UX-2 — Navigation & shells:** header, business/admin/super-admin/public
  sidebars, mobile nav — spacing, active states, hierarchy, hit areas.
- ⬜ **UX-3 — Public pages:** home, category, nearby, business detail, offers,
  events, government — hierarchy, cards, imagery, empty states.
- ⬜ **UX-4 — Business dashboard:** dashboard, offers, events, moderation, bills,
  settings, team, subscriptions — action-first layout, tables, forms.
- ⬜ **UX-5 — Admin/super-admin:** queues, tables (density/alignment), analytics,
  detail panels.
- ⬜ **UX-6 — States & polish:** empty/error/loading states everywhere, form
  validation, toasts, motion pass, responsive audit, a11y audit.

## Remaining / backlog

- ⬜ **`/reset-password` page** (API endpoint exists).
- ⬜ **DB perf indexes** migration apply on VPS (composite + partial indexes staged).
- ⬜ **Social sign-in** (currently UI placeholder only).
- ⬜ **Opera** cross-browser confirmation (suspected ad-blocker/cache).
