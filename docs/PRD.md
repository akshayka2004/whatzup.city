# PRD.md — Whtzup.city (Project Requirements Document)

## 1. Product summary

Whtzup.city is a **multi-tenant civic + local-business platform for Kerala**. It
connects three groups that normally have no shared system: verified local
businesses, citizens/customers, and government/civic bodies. Businesses register
and get verified, publish offers and events, and moderate customer purchase
bills; customers discover businesses, submit bills for verification, and leave
ratings; government/civic bodies publish announcements targeted by city; and an
admin/super-admin control plane oversees the whole platform.

Live deployment: bare-metal VPS (Mumbai), web `:3000`, API `:4001`, launch page
`:6001`. Domain `72.61.238.98` / `platform.whtzup.city`.

## 2. Goals

- Give small local businesses a trusted, low-friction presence + engagement tools.
- Give citizens one place for verified businesses, offers, events, and civic notices.
- Give government/civic bodies a targeted announcement channel.
- Give the platform operator moderation + oversight at scale across many tenants.

## 3. Non-goals

- Not a marketplace/checkout (no cart, no fulfilment).
- Not a social network (follows/bookmarks exist but are secondary).
- Not a payments processor (subscription/payment records exist; no live gateway wired).

## 4. Target users & roles

| Role | Who | Primary jobs |
|---|---|---|
| Customer / citizen | Public, mostly mobile | Discover businesses/offers/events, read civic notices, submit bills, rate businesses |
| Business owner | SME owners | Manage listing, publish offers/events, moderate customer bills, view analytics |
| Business moderator / staff | Delegated staff | Approve/reject bills, limited management |
| Civic / government / organization / influencer / professional / event-organizer | Specialised "entity" accounts | Onboard, publish notices/events per type |
| Admin (MASTER_ADMIN) | Platform staff | Approve registrations, moderate content, view analytics |
| Super-admin (SUPER_ADMIN) | Platform owner | Everything: tenants, businesses, users, categories, events, escalations, platform analytics |

## 5. Core features (implemented)

**Auth & onboarding**
- JWT auth (access + refresh), role-based access, password reset request flow.
- Business onboarding wizard (details → documents/media → subscription plan → submit).
- Specialised entity onboarding (civic/gov/org/influencer/professional/event-organizer).
- Admin/super-admin verification queue: approve/reject with reason; full-screen
  gate blocks non-approved workspaces and shows status + rejection remark + resubmit.

**Business & discovery**
- Business profiles (logo, cover, tags, description, halal status, city, branches).
- Public discovery: home, category, nearby, search, business detail, offers, events,
  government announcements. City filtering.
- Reviews & ratings (auto-published, aggregate `averageRating`/`totalReviews`,
  cache-busted on write). Ratings can be posted standalone or with a bill.

**Offers, events, trials, subscriptions**
- Offers (percentage or fixed amount), city-targeted, claim/redeem.
- Events with CRUD (owner + admin), date/time, click tracking.
- Trial lifecycle + subscription plans; trial-expiry gate.

**Bills & verification**
- Customer uploads a bill → OCR job → business owner moderation queue
  (approve/reject/flag/request-reupload/owner-override) → verified purchase.
- Owner + customer notifications across the lifecycle. Cross-tenant safe.

**Civic / government**
- Government announcements with link, issue/start/end dates, city targeting, expiry.

**Admin / super-admin**
- Registrations, businesses (filters/sort/totals), tenants, users (edit any),
  categories (order/parent), events CRUD, notices, reports/moderation,
  escalated bill queue, platform-wide analytics overview.

**Platform**
- Notifications (in-app + FCM optional + email), audit logs, fraud flags,
  Typesense search, pre-aggregated analytics summary tables, feature flags.

## 6. Key requirements & constraints

- **Multi-tenancy** by `tenant_id`, app-scoped (service-role key, RLS off). Each
  business is effectively its own tenant; customers live in `default`. Cross-tenant
  entities (bills) must key off globally-unique ids, not tenant filters.
- **Accessibility:** WCAG AA — body ≥4.5:1, large/bold ≥3:1, visible focus,
  semantic HTML, labelled forms, reduced-motion paths, status never hue-only.
- **Mobile-first:** touch targets ≥44px; primary actions never hidden under the
  fixed bottom nav.
- **Status integrity:** pending/approved/rejected/expired drive money + moderation;
  must be unmistakable (icon + label + color).

## 7. Open / planned

- `/reset-password` page (API endpoint exists, UI missing).
- App-wide UI/UX pass (Phase 1 tokens done; nav + per-role pages pending — see Phases.md).
- Social sign-in (UI placeholder only; not wired).
- DB perf indexes migration (staged; apply on VPS).
