# Whtzup.city — Project Documentation

> **Purpose of this document:** a single, self-contained reference that lets any
> engineer understand, run, scale, rebuild, or rework any part of this platform
> without prior context. Keep it current — see [Maintaining this document](#18-maintaining-this-document).
>
> **Last updated:** 2026-07-19 (login/forgot-password redesign)

---

## 1. What this project is

Whtzup.city is a **multi-tenant SaaS local-business directory & engagement
platform**. It lets businesses register and get verified, publish offers/events,
collect customer reviews and ratings, and lets customers discover businesses,
submit purchase bills for verification, and earn/redeem offers. It also has
government/civic announcement features and a super-admin control plane for
platform oversight (tenants, businesses, users, analytics, moderation).

Primary user classes:

- **Public / customers** — browse businesses, post reviews/ratings, upload bills.
- **Business owners / staff / moderators** — manage a business workspace,
  moderate customer bills, publish offers/events.
- **Civic / government / organization / influencer / professional / event-organizer**
  — specialised "entity" account types with their own onboarding.
- **Admin / Super-admin (platform)** — approve registrations, moderate content,
  view platform-wide analytics, manage everything.

---

## 2. Tech stack

| Layer          | Technology |
|----------------|------------|
| Language       | TypeScript (end to end) |
| Monorepo       | pnpm workspaces + Turborepo |
| Backend API    | NestJS (`apps/api`), REST, versioned under `/api/v1` (served on port 4001) |
| Background jobs| NestJS worker (`apps/worker`) + BullMQ |
| Frontend       | Next.js 16 (App Router, standalone output) (`apps/web`, port 3000) |
| Landing page   | Separate small server (`apps/launch-page`, port 6001) |
| ORM / DB       | Prisma + PostgreSQL (Supabase, region **ap-south-1 / Mumbai**) |
| Cache / queues | Redis (app cache + BullMQ) |
| Search         | Typesense |
| File storage   | Supabase Storage (buckets) |
| Auth           | JWT (access + refresh), Passport |
| Process mgr    | PM2 (bare-metal VPS) |
| Notifications  | In-app + FCM (Firebase, optional/graceful) + SMTP email |

---

## 3. Monorepo layout

```
/
├── apps/
│   ├── api/          NestJS REST API (the backend)
│   ├── web/          Next.js app (business dashboard + public site + admin/super-admin)
│   ├── worker/       BullMQ background worker (OCR, notifications, bill verification)
│   └── launch-page/  Standalone marketing/launch landing server
├── packages/
│   ├── database/     Prisma schema, migrations, seed, client (@saas/database)
│   ├── types/        Shared TS types & enums (@saas/types)
│   ├── auth/         Shared auth helpers (@saas/auth)
│   └── ui/           Shared UI components (@saas/ui)
├── ecosystem.config.js   PM2 process definitions (prod)
├── docker/               Docker assets (compose files at root)
├── scripts/              Repo scripts
├── turbo.json            Turborepo pipeline
├── pnpm-workspace.yaml   Workspace globs (apps/*, packages/*)
└── .env                  Root env (git-ignored)
```

Workspace package names: `@saas/api`, `@saas/web`, `@saas/worker`,
`@saas/database`, `@saas/types`, `@saas/auth`, `@saas/ui`.

Run a command in one package: `pnpm --filter @saas/api <script>`.

---

## 4. High-level architecture

```
                    ┌──────────────┐
   Browser ───────► │  Next.js web │ (3000)  ──── /api/* proxied ───►┐
                    └──────────────┘                                 │
                                                                     ▼
                    ┌──────────────┐        ┌─────────────┐   ┌────────────┐
                    │ launch-page  │        │  NestJS API │◄──┤   Redis    │ (cache + BullMQ)
                    │   (6001)     │        │   (4001)    │   └────────────┘
                    └──────────────┘        └─────────────┘         │
                                              │  │  │  │             ▼
                                              │  │  │  │      ┌────────────┐
                       ┌──────────────────────┘  │  │  └────►│  worker    │ (jobs)
                       ▼                          │  ▼        └────────────┘
                ┌────────────┐            ┌────────────┐
                │ PostgreSQL │            │ Typesense  │  + Supabase Storage (files)
                │ (Supabase) │            └────────────┘
                └────────────┘
```

- The **web app proxies `/api/*`** to the API (`API_URL=http://localhost:4001`),
  so the browser talks to one origin.
- The **API** is the single writer to Postgres, Redis, Typesense, and Storage.
- The **worker** consumes BullMQ queues (OCR extraction, notifications, bill
  verification follow-ups). Queues live in Redis.

### Multi-tenancy model

- Every tenant-owned row has a `tenant_id`. Isolation is **application-scoped**:
  the API uses the Supabase **service-role key** (bypasses Postgres RLS), and
  each repository query adds `tenantId` via `BaseRepository.buildWhere()`.
- **Each business is effectively its own tenant** (a business has its own
  `tenant_id`). Customers / public users typically live in the `default` tenant.
- **Consequence (important):** entities that span two tenants (e.g. a *bill*
  uploaded by a customer for a business) cannot be found by naive tenant-scoped
  queries from the other side. Cross-tenant flows must key off a globally-unique
  id (like `businessId`) or the row's own `tenantId`. See
  [Bill submission & moderation](#123-bill-submission--moderation-cross-tenant).

---

## 5. Applications

### 5.1 `apps/api` — NestJS backend

- Bootstraps with a global `/api` prefix and URI versioning (`v1`).
- Config via `@nestjs/config`; `envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env']`
  (first match wins; PM2 `env:` overrides file values). Because PM2 runs it with
  `cwd: ./apps/api`, the effective file is the **repo-root `.env`** unless an
  `apps/api/.env` exists.
- `common/` holds cross-cutting infra:
  - `database/` — `DatabaseService` (Prisma client, `@Global`), `BaseRepository`
    (tenant-scoped CRUD), and per-model repositories.
  - `redis/` — `RedisService` (`@Global`) for cache + queue connection.
  - `storage/` — `StorageService` (Supabase buckets, signed upload/download URLs,
    on-demand bucket creation + MIME widening).
  - `supabase/`, `guards/` (JWT, Roles), `decorators/` (`@CurrentUser`, `@Public`,
    `@Roles`), `interceptors/`, `filters/`, `logger/` (JSON logger in prod).

**Feature modules** (`apps/api/src/modules/`):

`analytics`, `announcements`, `audit`, `auth`, `bills`, `bill-verifications`,
`branches`, `business-documents`, `business-intelligence`, `business-media`,
`business-onboarding`, `businesses`, `campaigns`, `categories`, `civic`,
`customer-onboarding`, `customers`, `dashboard`, `discovery`, `entity-onboarding`,
`events`, `fraud`, `government-alerts`, `health`, `launch-interests`, `media`,
`metrics`, `notifications`, `ocr`, `offers`, `onboarding-analytics`,
`onboarding-verification`, `payments`, `preferences`, `products`, `realtime`,
`reports`, `reviews`, `search`, `search-analytics`, `segmentation`,
`subscriptions`, `team`, `trending`, `trials`, `typesense`, `users`,
`verification`, `verified-purchases`.

Each module is the standard NestJS trio (controller + service + module), often
with a DTO folder. Controllers define routes; services hold business logic;
repositories (in `common/database`) do tenant-scoped data access.

### 5.2 `apps/web` — Next.js frontend

App Router. Route groups + segments under `apps/web/app/`:

- `(public)`, `(business)`, `(admin)`, `(super-admin)` — layout groups.
- `business/[id]` — public business detail (reviews, offers, bill upload).
- `dashboard/**` — business owner workspace (wrapped by `BusinessLayout`, which
  gates non-approved workspaces — see [Onboarding gate](#121-business-onboarding--verification-gate)).
- `admin/**`, `super-admin/**` — platform control panels.
- `civic`, `government`, `register`, `login`, `profile`, `notifications`,
  `report`, `support`, `terms`, `privacy-policy`.
- Services in `apps/web/lib/services/*` wrap API calls (`apiService`,
  `analyticsService`, `onboardingService`, etc.).
- Deployed with Next **standalone** output — see the
  [static-asset gotcha](#101-nextjs-standalone-static-assets-must-be-copied).

### 5.3 `apps/worker` — background jobs

Processors: `bill-verification.processor.ts`, `notification.processor.ts`.
Connects to Redis/BullMQ. The API enqueues jobs (e.g. `ocr-queue` on bill
upload); the worker (and the API's own `ocr.processor`) process them.

### 5.4 `apps/launch-page` — landing server

Standalone Express-style server (`dist/server.js`, port 6001) for the marketing
launch page and launch-interest capture.

---

## 6. Database

- **Schema:** `packages/database/prisma/schema.prisma` (~70 models).
- **Client:** generated Prisma client, wrapped by `DatabaseService`.
- **Connection:** Supabase pooler. Transaction mode `:6543` (`?pgbouncer=true`)
  for the app; session mode `:5432` (`DIRECT_URL`) for migrations.

### Model groups

- **Tenancy & identity:** `Tenant`, `User`, `Customer`, `Role`, `Permission`,
  `UserRole`, `RolePermission`, `Session`, `RefreshToken`, `DeviceLogin`.
- **Business core:** `Business`, `BusinessTag`, `BusinessBranch`,
  `BusinessDocument`, `BusinessStaff`, `BusinessVerification`, `BusinessCustomer`,
  `Category`, `ProductCategory`, `Product`.
- **Engagement:** `Offer`, `OfferRedemption`, `Coupon`, `Review`, `ReviewMedia`,
  `ReviewVote`, `Bookmark`, `Favorite`, `UserFollow`, `Event`, `EventClick`.
- **Bills / verification:** `Bill`, `BillItem`, `BillVerification`,
  `VerifiedPurchase`, `FraudFlag`.
- **Notifications:** `Notification`, `NotificationRecipient`,
  `NotificationPreference`.
- **Civic/gov:** `GovernmentAnnouncement`, and entity profiles
  (`CivicProfile`, `GovernmentProfile`, `OrganizationProfile`,
  `InfluencerProfile`, `ProfessionalProfile`, `EventOrganizerProfile`).
- **Onboarding:** `Entity`, `OnboardingProgress`, `OnboardingEvent`,
  `UploadedDocument`, `VerificationRequest`, `Plan`.
- **Media / analytics / audit:** `Media`, `AnalyticsEvent`, `BusinessMetric`,
  `UserActivity`, `SearchHistory`, `AuditLog`, `AdminAction`, `ModerationReport`,
  `FeatureFlag`.
- **Billing:** `Subscription`, `Payment`.
- **Pre-aggregated summaries (perf):** `UserSpendingSummary`,
  `ReferralAnalyticsSummary`, `BusinessAnalyticsSummary`, `BranchAnalyticsSummary`.
- **Launch capture:** `LaunchIndividualInterest`, `LaunchBusinessInterest`.

### Key enums

`UserRoleEnum`, `EntityType`, `EntityStatus`, `BusinessStatus`
(`DRAFT`, `PENDING_VERIFICATION`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`),
`BusinessProfileType`, `TrialStatus`, `OfferStatus`, `ReviewStatus`
(`PENDING`, `APPROVED`, `FLAGGED`, `REMOVED`), `BillStatus`,
`BillVerificationStatus`, `CustomerStatus`, `BusinessMemberRole`.

### Migration workflow

This project **uses `prisma migrate`** (migrated away from `db push`).

- Migrations live in `packages/database/prisma/migrations/` (tracked in git).
- Baseline `0_init` is marked applied; feature migrations layer on top.
- Apply on a server:
  ```bash
  cd packages/database
  pnpm prisma migrate deploy
  pnpm prisma generate
  ```
- **Do NOT run `prisma db push`** — it would drop partial indexes and diverge
  from migration history.
- Partial indexes (e.g. `WHERE deleted_at IS NULL`) are not expressible in the
  Prisma DSL and live in raw-SQL migration files.

---

## 7. Environment variables

Defined in the root `.env` (git-ignored). Core keys:

```
# App
NODE_ENV, APP_NAME, DOMAIN, APP_URL, FRONTEND_URL, API_URL
NEXT_PUBLIC_FRONTEND_URL, NEXT_PUBLIC_API_URL

# Database (Supabase, Mumbai / ap-south-1)
DATABASE_URL   # pooler :6543 ?pgbouncer=true  (app)
DIRECT_URL     # pooler :5432                   (migrations)

# Redis
REDIS_URL      # redis://localhost:6379

# Auth
JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN

# Supabase & Storage
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY          # backend (server only)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   # browser
SUPABASE_STORAGE_BUCKET, NEXT_PUBLIC_SUPABASE_BUCKET

# Search
TYPESENSE_HOST, TYPESENSE_PORT, TYPESENSE_PROTOCOL, TYPESENSE_API_KEY
```

**Storage buckets:** `verification-documents`, `business-media`, `civic`,
`bill-uploads`, `profile-media`, `notification-media`. Public buckets serve via
public URLs; private buckets use signed URLs.

> **Secret hygiene:** never paste a masked value from an editor (e.g. a key
> shown as `eyJhbGci••••`) back into `.env` — the bullets become literal `•`
> characters and every Supabase HTTP call throws
> `Cannot convert argument to a ByteString ... value of 8226`. Always paste the
> full real JWT.

---

## 8. Local development

```bash
pnpm install
# set up .env at repo root (DB, Redis, Supabase, Typesense, JWT)
pnpm db:generate            # prisma generate
pnpm db:migrate             # apply migrations (or db:push for a throwaway DB)
pnpm dev                    # turbo runs all apps in dev
```

Individual apps: `pnpm --filter @saas/web dev`, `pnpm --filter @saas/api start:dev`.

Local Redis + Typesense can run via the root `docker-compose.yml`.

> On Windows, prefer `git commit -F <file>` for multi-line messages (heredoc /
> here-strings misbehave in PowerShell).

---

## 9. Deployment (bare-metal VPS + PM2)

Production runs on a Mumbai VPS with PM2. Processes (see `ecosystem.config.js`):

| PM2 name          | cwd                | entry                                   | port |
|-------------------|--------------------|-----------------------------------------|------|
| `saas-api`        | `./apps/api`       | `dist/main.js`                          | 4001 |
| `saas-worker`     | `./apps/worker`    | `dist/main.js`                          | —    |
| `saas-web`        | `./apps/web`       | `node .next/standalone/apps/web/server.js` | 3000 |
| `saas-launch-page`| `./apps/launch-page`| `dist/server.js`                       | 6001 |

Backing services: PostgreSQL (Supabase, managed), Redis (local), Typesense (local).

### Standard deploy

```bash
cd /opt/saas-platform/whatzup.city
git pull origin main
pnpm install --frozen-lockfile        # only if lockfile changed

# DB (if schema/migrations changed)
cd packages/database && pnpm prisma migrate deploy && pnpm prisma generate && cd ../..

# API
pnpm --filter @saas/api build
pm2 restart saas-api --update-env

# Web (see standalone gotcha below)
cd apps/web
rm -rf .next && pnpm build
cp -r .next/static .next/standalone/apps/web/.next/
cp -r public       .next/standalone/apps/web/ 2>/dev/null || true
cd ../..
pm2 restart saas-web --update-env

pm2 logs --lines 40
```

Always pass `pm2 restart ... --update-env` so the new `.env` is reloaded into the
process (PM2 caches env in memory otherwise).

---

## 10. Deployment gotchas (hard-won)

### 10.1 Next.js standalone: static assets must be copied

`saas-web` runs the standalone server (`.next/standalone/apps/web/server.js`).
`next build` does **not** copy `.next/static` or `public` into the standalone
dir. If you skip the copy, freshly-hashed JS chunks 404 with
`ChunkLoadError: Failed to load chunk ... MIME type ('text/plain')`, and dynamic
pages (e.g. `/business/[id]`) fail to load. **Always** run after every web build:

```bash
cp -r .next/static .next/standalone/apps/web/.next/
cp -r public       .next/standalone/apps/web/ 2>/dev/null || true
```

If the domain is behind Cloudflare, also purge cache / hard-reload — cached HTML
can reference dead chunk hashes.

### 10.2 Redis cache invalidation

`businesses.findById` caches the business under `business:{id}` (and by slug) for
5 minutes. **Any write that changes fields shown from that cache must delete the
key**, or stale data (e.g. rating 0) is served after refresh. Rating recompute is
centralised in `ReviewsService.refreshBusinessRating()`, which recomputes
`averageRating`/`totalReviews` and busts the cache. To force-clear all business
caches without nuking BullMQ:

```bash
redis-cli --scan --pattern 'business:*' | xargs -r redis-cli del
```
Never `FLUSHALL` — it destroys the job queues.

### 10.3 Route ordering: literal routes before `:param`

In NestJS, first-match wins. A literal route registered *after* a param route on
the same base (e.g. `/users/referral-leaderboard` after `/users/:id`) gets
swallowed by `:id`, sending `"referral-leaderboard"` as an id →
`P2023 ... Error creating UUID`. Declare literal routes **before** param routes.

### 10.4 Env key masking

See the secret-hygiene note in [§7](#7-environment-variables).

---

## 11. Region / infrastructure migration runbook

The DB was moved Tokyo → Mumbai to colocate with the VPS (killed ~100 ms/query
latency). If migrating Supabase projects again:

1. `pg_dump` the old DB and restore into the new one (data only — **not** files).
2. **Copy storage separately** — `pg_dump` does not move Storage objects. Use
   `packages/database/scripts/migrate-storage.mjs` (env-driven: `OLD_SUPABASE_URL`,
   `OLD_KEY`, `NEW_SUPABASE_URL`, `NEW_KEY`). Run it from a dir that has
   `@supabase/supabase-js` installed (copy it into `apps/api` and run there).
   Confirm each bucket ends `failed=0`.
3. Update `.env` (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, both keys).
4. Media stored as `{"bucket","path"}` JSON resolves via `SUPABASE_URL` at render,
   so no URL rewrite is needed for those. Only rows storing a **full absolute
   URL** to the old project need a `REPLACE(...)` rewrite (detect with a scan of
   text/json columns for the old project ref).
5. Rebuild, `pm2 restart all --update-env`, verify images + uploads, then delete
   the old project.

---

## 12. Key workflows

### 12.1 Business onboarding & verification gate

- A business registers → `Business.status = DRAFT`. The owner completes a wizard
  (`/register/business`): details → documents/media → subscription plan
  (`assignPackage`) → submit (`submitForVerification` sets `PENDING_VERIFICATION`
  and creates/links an `Entity` for the admin moderation queue).
- Admin/super-admin approve or reject via `onboarding-verification`. Reject sets
  `Business.status = REJECTED`, `VerificationRequest.rejectionReason`, and marks
  the `OnboardingProgress`/documents rejected, and notifies the owner.
- **Gate (`apps/web/components/layouts/business-layout.tsx`):** any non-approved
  workspace (`DRAFT` / `PENDING_VERIFICATION` / `UNDER_REVIEW` / `REJECTED`) is
  **fully blocked** — every dashboard page shows a full-screen status modal
  instead of content. The gate keys off `business.status` (authoritative), not
  the progress row. `REJECTED` shows the admin's remark (surfaced by
  `business-onboarding.getProgress`, which pulls `rejectionReason` from the
  latest `VerificationRequest`) plus a **Resubmit** action; `DRAFT` shows
  "Complete Setup"; `PENDING` shows "Under review".
- **Plan-assign accepts `id` OR `entityId`** (`subscriptions.assignPackage`) — the
  resubmit path passes the entity id; matching only `business.id` used to throw
  "Business not found".

### 12.2 Reviews & ratings

- `POST /v1/reviews` (`ReviewsService.create`): resolves the business by `id` OR
  `entityId`, creates the review with `status = APPROVED` (auto-publish /
  moderate-after), then calls `refreshBusinessRating()` which recomputes
  `averageRating` + `totalReviews` from APPROVED reviews and **busts the business
  cache**.
- Ratings can be posted standalone or **together with a bill** — the business
  detail page's bill modal collects a star rating and posts a review after the
  bill upload (`apps/web/app/business/[id]/page.tsx`), then refetches the business
  + review list so it reflects immediately.
- Reads: `GET /v1/reviews/business/:id` is `@Public`, filters `status=APPROVED`,
  not tenant-scoped.
- Admin `PATCH /v1/reviews/:id/status` also recomputes + busts cache.

### 12.3 Bill submission & moderation (cross-tenant)

This is the canonical cross-tenant flow — read it before touching bills.

1. A customer uploads a bill on a business page → `POST /v1/bills/upload`. This
   creates a `Bill` (under the **customer's** tenant) **and** a `BillVerification`
   (`status = PENDING`, `businessId` set), dispatches an OCR job, and **notifies
   the business owner** (in the business's tenant).
2. OCR worker extracts text, keeps the verification `PENDING`, stores metadata.
3. The **business owner** moderates at `/dashboard/moderation` →
   `GET /v1/businesses/:businessId/bill-verifications`. Because the bill lives in
   the customer's tenant but the owner is in the business's tenant, this query is
   **scoped by `businessId` (globally unique), NOT by tenant**
   (`findManyByBusiness`). Actions (`approve`/`reject`/`flag`/`requestReUpload`/
   `ownerOverride`) resolve the verification by id (verifying `businessId`) and use
   the **bill's own `tenantId`** for all downstream writes, notifications,
   verified-purchase creation, and analytics — so nothing fails on the tenant
   boundary.
4. Approve → creates a `VerifiedPurchase`, notifies the customer, refreshes spend
   summaries. Reject/re-upload/flag notify the customer accordingly.
5. Admin sees platform-escalated bills via `/admin/bill-verifications/escalated`.

### 12.4 Offers, trials, subscriptions

- Businesses publish offers (`Offer`, percentage or fixed amount) with city
  targeting; customers claim/redeem (`OfferRedemption`).
- New businesses get a trial (`TrialStatus`); on expiry the dashboard shows a
  blocking "choose a plan" modal (allow-listed paths excepted).
- `Subscription`/`Payment` back the plan assignment.

### 12.5 Notifications

`NotificationsService.send({ tenantId, userId, title, body, type, channel,
metadata })` writes an in-app notification (and optionally FCM/email). **Send
under the recipient's tenant** so it appears in their feed — e.g. notify the
business owner under the business tenant, the customer under the customer/bill
tenant.

### 12.6 Analytics overview (platform vs tenant)

`GET /v1/analytics/overview` returns dashboard KPIs. For `SUPER_ADMIN` /
`MASTER_ADMIN` it counts **platform-wide** (no tenant filter) and includes
`totalTenants` + `activeOffers`; for a tenant admin it stays tenant-scoped.
Cached in Redis under `analytics:overview:{platform|tenantId}` for 5 min.

---

## 13. Search, storage, realtime

- **Search:** Typesense module indexes businesses; the API indexes on
  approve/update and removes on reject/delete.
- **Storage:** `StorageService` creates buckets on demand, widens allowed MIME
  types, and issues signed upload/download URLs. Client-side images are optimised
  (`apps/web/lib/utils/image-optimizer.ts`); bill receipts are converted to JPEG
  (some buckets reject webp).
- **Realtime:** a WebSocket gateway (`realtime` module) exposes a `ping`
  subscription; extend here for live updates.

---

## 14. Auth & authorization

- JWT access + refresh tokens (`auth` module). `JwtAuthGuard` protects routes;
  `@Public()` opts out. `RolesGuard` + `@Roles(...)` restrict by role.
- `@CurrentUser('field')` extracts fields (`id`, `tenantId`, `role`, `businessId`,
  `entity`) from the token.
- Write endpoints whitelist mutable fields (e.g. users/businesses `PATCH`) to
  prevent role/tenant injection.

---

## 15. Background jobs (BullMQ)

- Queues live in Redis. The API enqueues (e.g. `ocr-queue` on bill upload); the
  worker + `ocr.processor` consume.
- Processors: OCR extraction, notifications, bill-verification follow-ups.
- If the worker logs `ioredis ECONNREFUSED`, Redis is down — start it before the
  worker.

---

## 16. Observability & health

- `GET /api/health`, `/health/ready`, `/health/live`.
- JSON structured logs in production (`JsonLoggerService`); each request carries a
  `correlationId` — grep logs by it to trace one request end-to-end.
- `pm2 logs <name> --lines N --nostream` to inspect; filter with `grep`.

---

## 17. Common operational commands

```bash
# Tail a service, errors only
pm2 logs saas-api --lines 60 --nostream | grep -iE 'error|exception|P20|P10'

# Trace one request across logs
pm2 logs saas-api --lines 400 --nostream | grep <correlationId>

# Bust business caches (safe; keeps BullMQ)
redis-cli --scan --pattern 'business:*' | xargs -r redis-cli del

# Migration status
cd packages/database && pnpm prisma migrate status
```

---

## 18. Maintaining this document

**Update this file in the same change that alters behaviour it describes.** Only
document relevant, durable changes — not every line edit. Update when you:

- add/remove/rename an app, package, or API module;
- change the data model in a way that affects a documented workflow;
- change env vars, deploy steps, ports, or infrastructure;
- change a documented workflow (onboarding, bills, reviews, offers, auth,
  analytics, notifications);
- discover a new operational gotcha worth a runbook entry.

When you update: bump the **Last updated** line at the top (date + latest commit),
and keep entries concise and accurate. Do not restate code line-by-line —
describe intent, data flow, and the non-obvious.

### Change log (notable behavioural changes)

- login/forgot-password redesign — premium split-layout `/login` (city image at `apps/web/public/login-hero.png`, palette `#2F2C36`/`#8A6A63`); new `/forgot-password` page → `POST /v1/auth/forgot-password`. `ForgotPasswordDto.tenantId` made optional (matches by email like login). Auth-page CSS lives in `globals.css` (`.lp-*`); do NOT use inline `<style>` in client components (React 19 flags it). Reset flow needs a `/reset-password` page (not built yet; API `POST /v1/auth/reset-password` exists).
- `db863fe` — reviews: bust business cache on rating change; recompute centralised.
- `f64369f` — reviews: submit the star rating captured in the bill form.
- `70a0d25` — bills: business moderation queue scoped by `businessId` (cross-tenant); owner/customer notifications.
- `3740551` — onboarding/reviews: gate non-approved workspaces, fix plan resubmit, surface reject reason, auto-publish reviews.
- `50e40dc` — analytics: platform-wide overview for super-admin dashboard.
- `18a39e3` — api: order literal `/users` routes before `:id` param.
- `716228e` — storage-copy script for Supabase region migration.
