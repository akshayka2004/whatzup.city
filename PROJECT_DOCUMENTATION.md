# Whtzup.city — Project Documentation

> **Purpose of this document:** a single, self-contained reference that lets any
> engineer understand, run, scale, rebuild, or rework any part of this platform
> without prior context. Keep it current — see [Maintaining this document](#18-maintaining-this-document).
>
> **Last updated:** 2026-09-13 (movie language DB-overflow fix + DTO hardening).
> See [§19 Feature history](#19-feature-history--time-taken) for everything
> shipped since the previous update, with per-feature time spans.

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
`metrics`, `movies`, `notifications`, `ocr`, `offers`, `onboarding-analytics`,
`onboarding-verification`, `payments`, `platform-offers`, `platform-vouchers`,
`preferences`, `products`, `realtime`,
`reports`, `reviews`, `search`, `search-analytics`, `segmentation`,
`subscriptions`, `team`, `trending`, `trials`, `typesense`, `users`,
`verification`, `verified-purchases`, `vouchers`.

> `movies` and `events` (admin routes) historically took `@Body() dto: any`
> with manual field-whitelisting instead of a class-validator DTO — see the
> [untyped-DTO gotcha in §10.5](#105-untyped-body-dto-any-skips-validationpipe-entirely)
> for why that's dangerous and how it was fixed.

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
- **Billing:** `Subscription`, `Payment`, `Transaction` (append-only financial
  log — one row per submit/verify/reject), `BillingProfile` (GST/PAN + invoice
  address, collected at registration Step 4, decrypted only for its own owner
  or a revealing admin — see [§12.11](#1211-invoicing)).
- **Vouchers & loyalty:** `Voucher`/`VoucherClaim` (per-business, spend-gated —
  code hidden until cumulative verified spend crosses a threshold);
  `PlatformVoucher`/`PlatformVoucherClaim` (platform-wide "Global Points" —
  same idea but the threshold is on points earned across *any* business, and
  redemption isn't scoped to one business); `PlatformOffer` (admin-curated
  Sadya/Clothing/Electronics/Staycation offers, city-targeted).
- **Events & movies (platform-published content):** `Event` (business-owned
  or platform-hosted via nullable `businessId` + `hostLabel`; JSON
  `ticketTiers` for named price tiers like Gold/Platinum), `EventClick`,
  `Movie` (admin/staff-managed listings; `languages`/`genres`/`cast` are all
  JSONB arrays — see the [movie-language gotcha](#105-untyped-body-dto-any-skips-validationpipe-entirely)
  for why none of these are VarChar).
- **Pre-aggregated summaries (perf):** `UserSpendingSummary`,
  `ReferralAnalyticsSummary`, `BusinessAnalyticsSummary`, `BranchAnalyticsSummary`.
- **Launch capture:** `LaunchIndividualInterest`, `LaunchBusinessInterest`.

### Key enums

`UserRoleEnum` (now includes `PLATFORM_STAFF` — see
[§14 Auth](#14-auth--authorization)), `EntityType`, `EntityStatus`, `BusinessStatus`
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

### 10.5 Untyped `Body() dto: any` skips ValidationPipe entirely

The global `ValidationPipe` (`main.ts`, `whitelist: true, forbidNonWhitelisted: true`)
only validates when the controller parameter has a real class-validator DTO
type. A handler typed `@Body() dto: any` gets **zero validation** — every
field, including its length, goes straight through to Prisma/Postgres.

This bit us for real: `movies.language` was a `VarChar(50)` column with no
DTO, so an admin listing multiple languages in that one field
(`"Malayalam, Hindi, Tamil, Telugu, Kannada"`) overflowed the column and
Postgres rejected the write with a raw `PrismaClientKnownRequestError P2000`,
surfaced to the admin as an opaque "Database operation failed" 500-shaped
error. Fixed two ways (2026-09-13):

1. **Root cause:** `movies.language` (`VarChar(50)`, one value) became
   `movies.languages` (`JSONB`, array — no per-value length limit), matching
   the existing `genres`/`cast` pattern. Migration
   `20260913000000_movie_languages` backfills existing comma-crammed values
   by splitting on `,`.
2. **Structural fix:** `movies` and `events` (the two modules still using
   `dto: any`) got real DTOs (`modules/movies/dto/movie.dto.ts`,
   `modules/events/dto/event.dto.ts`) with `@MaxLength` matching every
   remaining `VarChar` column (`title`, `venue`, `city`, `hostLabel`,
   `certification`, etc.), so an oversized value is now rejected with a clear
   400 instead of ever reaching Postgres. `payments`' `BillingProfileDto`/
   `CreatePaymentDto` (already typed, but missing `@MaxLength`) got the same
   treatment.
3. **Safety net for anything still missed:** `SecurityExceptionFilter` now
   special-cases Prisma `P2000` ("value too long for column") as a clean 400
   ("One of the fields you entered is too long...") instead of falling into
   the generic `Database operation failed (Pxxxx)` branch — so even a future
   unvalidated field fails soft, not as a raw DB crash.

**Takeaway:** any new admin/data-entry endpoint must use a real DTO class, not
`any`. If a field maps to a `VarChar(n)` column, give it `@MaxLength(n)`.

### 10.6 Turborepo: `pnpm --filter` skips the workspace build graph

`turbo.json`'s `build` task declares `dependsOn: ["^build"]` — that's what
makes a change to `@saas/types` or `@saas/database` trigger a rebuild of
whatever depends on them. Running `pnpm --filter @saas/api build` directly
**bypasses Turborepo entirely** and does not rebuild those dependencies'
`dist/` first.

This caused a real deploy failure: adding `PLATFORM_STAFF` to `UserRoleEnum`
in `@saas/database` compiled fine locally (fresh `dist/`), but the VPS's
`deploy.sh` ran the plain `pnpm --filter` command, so `@saas/api` built
against a **stale** `@saas/types`/`@saas/database` `dist/` still missing the
new enum value → 17 `TS2339` errors, deploy failed. Fixed (`da46f60`) by
changing `scripts/deploy.sh` to `pnpm exec turbo run build --filter=@saas/api`
/ `--filter=@saas/web`, which resolves the dependency graph correctly.

**Takeaway:** never call `pnpm --filter <pkg> build` directly for a workspace
package that depends on another workspace package — always go through
`pnpm exec turbo run build --filter=<pkg>`.

### 10.7 Next.js dev server: immutable Cache-Control poisons the browser

`next.config.mjs`'s `headers()` applied
`Cache-Control: public, max-age=31536000, immutable` on `/_next/static/*` in
**every** environment, including dev. Browsers treat `immutable` as "never
revalidate, ever" — so once a dev chunk URL was fetched under that header, no
amount of restarting the dev server fixes it for that browser; even a hard
reload keeps serving the stale cached chunk. Fixed by scoping the header to
`process.env.NODE_ENV === 'production'` only.

If a browser is already poisoned from before the fix, restarting the server
doesn't help — Turbopack's dev chunk hashes are derived from the **file path**,
not its content, so renaming the file is the reliable way to force a genuinely
new, never-cached URL.

### 10.8 Tailwind `line-clamp-N` doesn't stop horizontal overflow

`line-clamp-N` only sets `-webkit-line-clamp` + `overflow: hidden` +
`display: -webkit-box`. It does **not** set `overflow-wrap`/`word-break`, so a
single long unbroken token (a pasted URL, a run-on word) inside clamped
user-generated text can still overflow the card horizontally even though
vertical clamping "worked". Always pair `line-clamp-N` with `break-words` on
any field showing free-text/user-generated content (descriptions, review
comments, notification bodies, etc.).

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

### 12.7 First-time onboarding tour

A closable/skippable spotlight tour (`components/onboarding/platform-tour.tsx`,
originally `onboarding-tour.tsx` — renamed to dodge a poisoned dev cache, see
[§10.7](#107-nextjs-dev-server-immutable-cache-control-poisons-the-browser))
auto-shows once per role on first login, highlighting each nav section on the
real UI. Steps are defined per audience in `lib/tour-steps.ts`
(`BUSINESS_TOUR_STEPS`/`BUSINESS_MOBILE_TOUR_STEPS`, and a public/customer
set), rendered from `PublicLayout`/`BusinessLayout`. Shown to all roles
**except** super-admin/admin. Persisted per `storageKey` in `localStorage` so
it never re-shows once dismissed. `useIsMobile()` reports `false` for one
render before its effect resolves the real value — the layouts guard the
tour's mount with an extra `mounted` state so it doesn't mount-then-unmount
before its own reveal timer fires on mobile.

### 12.8 Events, movies & platform-hosted content

- **Events** (`Event`) can be business-owned (normal flow) or platform-hosted
  — omit `businessId` and set `hostLabel` (e.g. "Special Correspondent") to
  publish from the platform's own side. `ticketType` is `FREE`/`PAID`;
  `category` is an allow-listed enum (`EVENT_CATEGORIES` in
  `events.service.ts`). Paid events support either a flat `ticketPrice` or
  named `ticketTiers` (`[{ name: "Gold", price }, ...]`) — tiers take
  precedence for display when present.
- **Movies** (`Movie`) is a standalone admin/staff-managed section (not tied
  to a business) — name, poster, `languages`/`genres`/`cast` (all JSONB
  arrays), certification, status (`UPCOMING`/`NOW_SHOWING`/`ENDED`), optional
  city targeting. Public page: `/movies`.
- **Action logs:** every section (events/movies/platform-offers/announcements)
  has a collapsed-by-default `ActionLog` component
  (`components/admin/action-log.tsx`) reading `GET /v1/audit-logs?resource=X`
  (server-side filtering already existed in `AuditService.findAll`), with a
  client-side CSV export (build a comma-joined string → `Blob` → object URL →
  trigger `<a download>`).
- **Platform Staff** — see [§14](#14-auth--authorization) — is the
  data-entry-only role that publishes into all of the above without full
  admin access.

### 12.9 Global points & platform-wide vouchers ("loyalty")

Two parallel spend-gated reward systems, both hide the redemption code until
a threshold is crossed:

- **Per-business vouchers** (`Voucher`/`VoucherClaim`) — threshold is
  cumulative *verified spend at one business*; staff redeem in that
  business's dashboard.
- **Platform-wide ("Global Points")** (`PlatformVoucher`/`PlatformVoucherClaim`)
  — threshold is *points earned across any business on the platform*, and
  redemption isn't scoped to one business (any business's staff can mark a
  claim `REDEEMED`). Surfaced to the customer as a Rewards card on
  `/profile` (must render even with zero tiers — it used to be hidden
  entirely when `voucherTiers.length === 0`), and to businesses as a
  redemption-stats card scoped to redemptions *at their own business*.

### 12.10 Invoicing

Registration Step 4 (business plan/hotel pick → QR/UPI payment + proof
upload) ends by redirecting to `/dashboard/invoice/{paymentId}` instead of
straight to `/dashboard`. That page (`GET /v1/payments/:id/invoice`,
owner-only) renders a proper invoice — issuer (Lifeart Business Services Pvt.
Ltd.), Bill To (decrypted `BillingProfile`), GST-split line items, payment
method/ref — with a status badge that's honest about payment state:
**Pending Verification** (amber, the common case right after submit — the
office hasn't verified the QR payment yet), **Paid & Verified** (green), or
**Rejected** (red, shows the admin's reason). "Download" is `window.print()`
with `print:hidden` on all surrounding chrome (sidebar/header/mobile-nav) —
no PDF library dependency. Because the business is still
`PENDING_VERIFICATION` at the moment it lands here, `BusinessLayout`'s
onboarding gate (§12.1) explicitly exempts `/dashboard/invoice/*` so the page
doesn't get swallowed by the full-screen "Verification Pending" block. Also
linked from the payment-history table on `/dashboard/subscriptions` so it
stays reachable later.

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
- **`PLATFORM_STAFF`** (added 2026-09-04) is a narrow, data-entry-only role
  (publish events/movies/platform-offers, manage announcements, read-only
  businesses). Pattern used: **default-deny**, not widening an existing
  broad layout's allow-list. It has its own layout/guard
  (`components/layouts/staff-layout.tsx`, `useRequireAuth(['PLATFORM_STAFF', ...])`)
  and sidebar (`staff-sidebar.tsx`) under `/staff/*`, entirely separate from
  `AdminLayout`/`SuperAdminLayout` — so it's denied everywhere except its own
  explicit allow-list, rather than risking over-broadening an existing admin
  surface. The admin CRUD UIs it shares with super-admin (`events-manager.tsx`,
  `movies-manager.tsx`, `platform-offers-manager.tsx`, `notices-manager.tsx`
  under `components/admin/`) are exported as layout-less named components so
  `/staff/*` and `/super-admin/*` pages each supply their own layout/guard
  around the same CRUD body — role-gating stays strictly at the page/layout
  level, not duplicated in the CRUD component.

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

## 19. Feature history & time taken

Everything shipped between the previous update (2026-07-19) and this one
(2026-09-13), grouped by feature. **"Span" is the wall-clock time between a
feature's first and last commit** — it is *not* an engineering-hours
estimate; nothing in this repo tracks actual time-on-task. Read it with that
caveat: a short span often just means the feature was built and pushed in one
continuous sitting (fast iteration, not necessarily low effort — e.g. the
mobile responsive audit across four layout tiers landed in 3 minutes of
commit time), while a long span usually means work was picked back up after a
gap (e.g. the security hardening pass, or the flood-relief portal spanning
overnight).

| Feature | Date | Commit(s) | Span |
|---|---|---|---|
| Whtzup plan tiers + mandatory QR payment w/ proof | 2026-07-28 | `6e8147f` | — |
| Unified registration flow (retired standalone wizard) | 2026-07-28 | `4d957a4` | — |
| Registration resume fix + live admin data + upscaled QR | 2026-07-28 | `0b65855`→`28b001f` | 14 min |
| Mobile UI fixes (sidebar promo, viewport, overflow) | 2026-07-28 | `97f2231` | — |
| 18% GST, transaction log, invoice details, renewal approvals | 2026-07-29 | `32fa8a7` | — |
| Security hardening (PII encryption, lockout, upload verification) + tenant-scope triage | 2026-07-29 | `ec47df0`→`11dbefb` | 12 h 33 min |
| Kerala Flood Relief Portal (independent workspace app) | 2026-08-04–05 | `4c80cfa`→`d994c9c` | 20 h 51 min |
| Pricing: Whtzup entry tier, annual hotel billing | 2026-08-11 | `67e959a` | — |
| Subscription/paywall/sidebar fixes | 2026-08-11 | `dd995ce`→`7aaa403` | 11 min |
| Platform offers (Sadya/Clothing/Electronics/Staycation) + perf/security fixes | 2026-08-12 | `8cf5a71`→`a244b49` | 47 min |
| Platform offers: Payasam category, itemized rates | 2026-08-12 | `fd35666` | — |
| Live per-offer click tracking | 2026-08-13 | `b36e5a2` | — |
| Mobile responsive audit (public/business/admin/super-admin) | 2026-08-13 | `90d3e6b`→`56ce5bb` | 3 min |
| Misc fixes + business soft-delete | 2026-08-15 | `96b363a`→`198e976` | 12 min |
| Bill series prefix (auto-flag matching bills) | 2026-08-30 | `c0d67e9` | — |
| Mobile touch feedback (kill tap lag) | 2026-08-30 | `8558180` | — |
| **Global Points & platform-wide vouchers** ([§12.9](#129-global-points--platform-wide-vouchers-loyalty)) | 2026-09-02 | `457f226` | — |
| Rewards card fix + business redemption stats | 2026-09-03 | `60c2bad` | — |
| **First-time onboarding tour**, desktop + mobile ([§12.7](#127-first-time-onboarding-tour)) | 2026-09-03 | `6b66ee8`→`e3eeb32` | 14 min |
| Super-admin sidebar fix (Phase 1) | 2026-09-04 | `f7e95a8` | — |
| **Events/Movies/Platform-Staff/Audit-log 5-phase build** — Special Correspondent host + ticket types/categories (Phase 2), Movies section (Phase 3), Platform Staff role (Phase 4), per-section action logs + CSV export (Phase 5) ([§12.8](#128-events-movies--platform-hosted-content), [§14](#14-auth--authorization)) | 2026-09-04 | `d716f48`→`b1d695c` | 3 h 15 min (incl. Phase 1 above) |
| Deploy pipeline fix — build through Turborepo ([§10.6](#106-turborepo-pnpm---filter-skips-the-workspace-build-graph)) | 2026-09-04 | `da46f60` | — |
| UX batch — movie/event detail views, ticket tiers, registration Back button + cost summary, AC/Non-AC toggle, card text-overflow fix ([§10.8](#108-tailwind-line-clamp-n-doesnt-stop-horizontal-overflow)) | 2026-09-06 | `33661a5` | — |
| **Invoice page** at end of registration ([§12.10](#1210-invoicing)) | 2026-09-08 | `a0be7af` | — |
| Movie multi-language support + DB-overflow fix + DTO hardening ([§10.5](#105-untyped-body-dto-any-skips-validationpipe-entirely)) | 2026-09-13 | *pending push* | — |

---

### Change log (notable behavioural changes)

- hotel classification pricing (UNCOMMITTED, hold for push approval) — new `Hotel` category; star rating (1-5) sets base listing charge, priced amenity checklist adds recurring ₹2500/item; replaces normal Plan/Subscription pick for this category via `POST /v1/subscriptions/businesses/:id/assign-hotel`.

- vouchers — spend-gated `Voucher` + `VoucherClaim`; customer unlocks a unique code once cumulative verified spend ≥ threshold, staff redeem in dashboard. Module `modules/vouchers`; UI `/dashboard/vouchers` + business-detail section.
- business registration/KYC — `Business` gains `brandName/companyName/companyType` + JSON `compliance`(PAN/GST)/`ownerContact`/`billingContact`/`supportContact`/`branchHead`/`categoryAttributes`; collected in onboarding Step 3 + editable in settings via `components/business/registration-details.tsx`; per-category attributes in `lib/category-attributes.ts`.
- City Experience Platform redesign (light warm-neutral + terracotta) — see `9414a32`.

- login/forgot-password redesign — premium split-layout `/login` (city image at `apps/web/public/login-hero.png`, palette `#2F2C36`/`#8A6A63`); new `/forgot-password` page → `POST /v1/auth/forgot-password`. `ForgotPasswordDto.tenantId` made optional (matches by email like login). Auth-page CSS lives in `globals.css` (`.lp-*`); do NOT use inline `<style>` in client components (React 19 flags it). Reset flow needs a `/reset-password` page (not built yet; API `POST /v1/auth/reset-password` exists).
- `db863fe` — reviews: bust business cache on rating change; recompute centralised.
- `f64369f` — reviews: submit the star rating captured in the bill form.
- `70a0d25` — bills: business moderation queue scoped by `businessId` (cross-tenant); owner/customer notifications.
- `3740551` — onboarding/reviews: gate non-approved workspaces, fix plan resubmit, surface reject reason, auto-publish reviews.
- `50e40dc` — analytics: platform-wide overview for super-admin dashboard.
- `18a39e3` — api: order literal `/users` routes before `:id` param.
- `716228e` — storage-copy script for Supabase region migration.
