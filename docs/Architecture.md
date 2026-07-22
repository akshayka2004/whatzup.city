# Architecture.md — Whtzup.city

> Deep reference lives in root `PROJECT_DOCUMENTATION.md`. This is the condensed
> architecture + folder map.

## 1. Tech stack

| Layer | Tech |
|---|---|
| Language | TypeScript (end to end) |
| Monorepo | pnpm workspaces + Turborepo |
| Backend API | NestJS (`apps/api`), REST, `/api/v1`, port 4001 |
| Worker | NestJS + BullMQ (`apps/worker`) |
| Frontend | Next.js 16 App Router, standalone output (`apps/web`), port 3000 |
| Landing | Standalone server (`apps/launch-page`), port 6001 |
| ORM / DB | Prisma + PostgreSQL (Supabase, ap-south-1 / Mumbai) |
| Cache / queues | Redis (app cache + BullMQ) |
| Search | Typesense |
| Storage | Supabase Storage (buckets) |
| Auth | JWT (access + refresh), Passport |
| UI | shadcn/ui + Tailwind v4, Geist font, lucide-react icons |
| Process mgr | PM2 (bare-metal VPS) |
| Notifications | In-app + FCM (optional) + SMTP email |

## 2. System flow

```
Browser ─► Next.js web (3000) ──/api/* proxied──► NestJS API (4001)
                                                     │  │  │  │
             Redis (cache + BullMQ) ◄────────────────┘  │  │  └──► Supabase Storage
             PostgreSQL (Supabase) ◄───────────────────┘  └──► Typesense
             Worker (BullMQ jobs) ◄── enqueue (OCR, notifications, bill verify)
```

- Web proxies `/api/*` to the API → single browser origin.
- API is the sole writer to Postgres, Redis, Typesense, Storage.
- Worker consumes BullMQ queues (queues live in Redis).

## 3. Multi-tenancy

- Every tenant-owned row has `tenant_id`. Isolation is **application-scoped**:
  API uses the Supabase **service-role key** (bypasses Postgres RLS); each repo
  query injects `tenantId` via `BaseRepository.buildWhere()`.
- Each business ≈ its own tenant. Customers/public in `default`.
- **Cross-tenant rule:** a row spanning two tenants (e.g. a bill: customer tenant
  vs business tenant) must be queried by a globally-unique id (`businessId`) or by
  the row's own `tenantId`, never by the actor's tenant.

## 4. Folder structure

```
/
├── apps/
│   ├── api/                     NestJS backend
│   │   └── src/
│   │       ├── common/          database (BaseRepository, repos), redis, storage,
│   │       │                    supabase, guards, decorators, interceptors,
│   │       │                    filters, logger, config
│   │       └── modules/         ~48 feature modules (controller+service+module+dto):
│   │                            auth, users, businesses, business-onboarding,
│   │                            bills, bill-verifications, reviews, offers, events,
│   │                            announcements, government-alerts, categories,
│   │                            subscriptions, trials, payments, notifications,
│   │                            analytics, ocr, fraud, search, typesense,
│   │                            onboarding-verification, entity-onboarding, civic,
│   │                            reports, audit, media, business-media, branches,
│   │                            team, customers, verified-purchases, … 
│   ├── web/                     Next.js frontend
│   │   ├── app/                 routes: (public)/(business)/(admin)/(super-admin)
│   │   │                        groups; business/[id], dashboard/**, admin/**,
│   │   │                        super-admin/**, login, forgot-password, register,
│   │   │                        civic, government, profile, notifications, report,
│   │   │                        support, terms; layout.tsx; globals.css
│   │   ├── components/          ui/ (shadcn primitives), common/ (header, empty-state,
│   │   │                        legal-footer), layouts/, sidebar/, navigation/,
│   │   │                        business-card, report-button, …
│   │   ├── hooks/               use-auth, use-require-auth, use-mobile
│   │   ├── lib/services/        apiService, authService, onboardingService,
│   │   │                        analyticsService, … (API wrappers)
│   │   └── public/              logo.png, login-hero.png, placeholders
│   ├── worker/                  BullMQ processors: bill-verification, notification
│   └── launch-page/             marketing/launch server
├── packages/
│   ├── database/                Prisma schema, migrations, seed, generated client
│   │   ├── prisma/schema.prisma ~70 models
│   │   └── scripts/             migrate-storage.mjs (region migration)
│   ├── types/                   @saas/types — shared TS types & enums
│   ├── auth/                    @saas/auth — shared auth helpers
│   └── ui/                      @saas/ui — shared UI
├── ecosystem.config.js          PM2 process defs (api/worker/web/launch-page)
├── docker/ , docker-compose.*   Docker assets
├── turbo.json , pnpm-workspace.yaml
├── PROJECT_DOCUMENTATION.md      full reference
├── PRODUCT.md / DESIGN.md        impeccable design system of record
└── docs/                         PRD, Architecture, Rules, Phases, Design, Memory
```

Workspace packages: `@saas/api`, `@saas/web`, `@saas/worker`, `@saas/database`,
`@saas/types`, `@saas/auth`, `@saas/ui`. Run one: `pnpm --filter <pkg> <script>`.

## 5. Data model groups (Prisma, ~70 models)

Tenancy/identity (Tenant, User, Customer, Role, Session, RefreshToken) · Business
core (Business, Branch, Document, Staff, Category, Product) · Engagement (Offer,
OfferRedemption, Review, Event, Favorite) · Bills (Bill, BillItem,
BillVerification, VerifiedPurchase, FraudFlag) · Notifications · Civic/gov
(GovernmentAnnouncement + entity profiles) · Onboarding (Entity,
OnboardingProgress, VerificationRequest, Plan) · Analytics/audit + pre-aggregated
summaries · Billing (Subscription, Payment).

## 6. Request/auth flow

JWT via `JwtAuthGuard` (opt out with `@Public()`); `RolesGuard` + `@Roles()` for
role gating; `@CurrentUser('field')` extracts id/tenantId/role/businessId/entity.
Write endpoints whitelist mutable fields to prevent role/tenant injection.

## 7. Deployment

PM2 processes: `saas-api` (dist/main.js:4001), `saas-worker` (dist/main.js),
`saas-web` (`node .next/standalone/apps/web/server.js:3000`), `saas-launch-page`
(dist/server.js:6001). Backing: managed Postgres (Supabase), local Redis + Typesense.
Full deploy steps + gotchas in `PROJECT_DOCUMENTATION.md` §9–11.
