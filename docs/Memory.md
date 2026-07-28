# Memory.md — Whtzup.city (working progress log)

> Living context so a new chat/tool doesn't re-read the whole codebase. Update the
> top block + change log after each meaningful change.

## Current state

- **Branch:** `main`. **HEAD:** `4d957a4` (unified registration flow), pushed to
  `github.com/akshayka2004/whatzup.city`.
- **VPS migration state:** `..._vouchers`, `..._business_registration_details`,
  `..._hotel_registration` all applied (confirmed 2026-07-28 deploy log).
  **`..._hotel_category_rows` still pending** — hotel pricing stays invisible until it runs.
- **Deploy:** VPS (Mumbai), PM2 — `saas-api` :4001, `saas-web` :3000,
  `saas-worker`, `saas-launch-page` :6001. Supabase Postgres (ap-south-1), local
  Redis + Typesense.
- **Build health:** API `nest build` clean; web `next build` clean.

## In flight

- **UI/UX overhaul** (dark + bronze, system-first, polish-not-disrupt). Phase UX-1
  (design system tokens + primitives) done + pushed. Next: UX-2 nav/shells, then
  per-role page passes. See `docs/Phases.md`.

## Recently done (newest first)

- **Registration unified** (`4d957a4`): there were **two parallel registration
  paths** — `/register` (what users actually used; hardcoded
  `assignSubscription(LISTING_BASIC)`, a retired package, so no plan choice and
  no payment) and `/register/business?id=` (the 7-step wizard where plan/KYC/
  tags/hotel/payment all lived but which the main flow never visited). Merged
  into **one flow at `/register`**, 4 steps for BUSINESS (Account Type →
  Credentials → Business Profile → Plan & Payment); other roles keep 3.
  Step 3 = description + tags + `RegistrationDetailsForm`, saves then continues.
  Step 4 = plan cards or hotel star+services, with price revealed only after
  "Proceed to Payment" (`showPayment` flag) → QR + mandatory screenshot.
  `handleBusinessFinalSubmit` assigns plan/hotel → uploads proof → records
  payment → submits for verification. **Draft resume**: `/register` loads the
  user's DRAFT business on mount and jumps to step 3/4 via `stepsCompleted`.
  `/register/business` is now a `redirect('/register')` (old `?id=` links 404'd
  with "Business not found" via `getProgress`'s tenant-scoped lookup);
  select-role + `business-layout` `getOnboardingPath` repointed to `/register`.

- **Billing: plan tiers + mandatory QR payment** (`6e8147f`): 4 plans in
  `apps/web/lib/subscription-plans.ts` (Whtzup+ 2500/5000, X 5000/10000,
  XL 7500/15000, LUXE 10000/20000 — offer price charged, MRP struck through),
  **90-day** server-controlled term. Legacy 8 packages retained in the enum for
  existing rows but excluded from `getPackages()`. Wizard is now **7 steps** —
  payment is the final step after review: price breakdown + `public/QR.jpeg` +
  mandatory screenshot upload; **hotels see no price until this step**. Tags now
  collected at registration. `SubscriptionPaywall` (mounted in `business-layout`,
  APPROVED only, hidden while trial modal shows) blocks owners without an active
  paid plan and reminds 5 days pre-expiry. Admin queue `/admin/payments` +
  `GET /v1/payments/admin/pending`, `POST /v1/payments/:id/verify|reject`;
  proofs stored in the private `verification-documents` bucket and shown via
  short-lived signed URLs. Needed a new `PAYMENT` UploadCategory — the storage
  controller `@IsEnum`-validates category and would otherwise 400 every upload.

- **Hotel reachability fix** (`5d8faee`): `508081a` shipped hotel pricing that could
  never trigger. (a) `apps/web/app/register/page.tsx` `CATEGORIES` is a **hardcoded**
  array with no API fetch — no Hotel entry meant `categorySlug` never matched, so the
  Step 4 hotel branch never rendered; (b) the Hotel category lived only in `seed.ts`,
  and `migrate deploy` doesn't run seeds, so no row reached prod — and
  `startOnboarding` **silently falls back to the first category** when a slug misses,
  hiding the failure; (c) slug collision — `hotels` was already the Staycation
  subcategory and `business_categories` has `UNIQUE (tenant_id, slug)`.
  Fix: Hotel added to `CATEGORIES` with subcategories, slug **`hotel`** (singular),
  `isHotel` updated in wizard + settings, Staycation's "Hotels" relabelled
  **"Homestays"** (slug kept `hotels` so existing businesses resolve), and migration
  `..._hotel_category_rows` inserts category+subcategory rows per tenant (idempotent).
  **Lesson: category lists here are hardcoded in the frontend AND need DB rows —
  changing one without the other silently does nothing.**

- **Hotel classification pricing** (`508081a`, pushed): new `Hotel` category (slug `hotels`, separate from `Staycation`).
  `Business.hotelStarRating Int?` (1-5) + `hotelAmenities Json` (9 top-level
  amenities from client's `details.md`, per-item flat fee, sub-choices free/
  informational only). Migration `..._hotel_registration` (ALTER only).
  Pricing: `STAR_PRICING` ₹5000(1★)-₹15000(5★) + ₹2500/selected amenity,
  **recurring yearly** (`apps/web/lib/hotel-pricing.ts`, mirrored server-side
  in `subscriptions.service.ts` — never trust client-sent price). For Hotel-
  category businesses, star classification **replaces** normal Plan/Subscription
  selection: wizard Step 4 branches on `categorySlug === 'hotels'` (hydrated via
  new `category: { slug }` include in `business-onboarding.service.getProgress`)
  to a star-picker + amenity checklist instead of the Plan cards, posts to new
  `POST /v1/subscriptions/businesses/:id/assign-hotel` (creates Subscription
  directly, `planId: null`, `packageName: HOTEL_{n}STAR`, status
  `PENDING_PAYMENT` — same manual/self-reported Payment flow as everything else,
  no gateway). Settings page gets a matching edit block; editing there updates
  the Business fields only, does NOT reprice the active Subscription (that only
  happens at registration) — by design, not yet asked for a repricing/renewal flow.
  Decisions locked via AskUserQuestion: separate category, replaces Plan pick,
  addons recurring same cycle, priced per top-level item (not sub-choice),
  manual payment kept, hotel-only (no generic category-pricing engine).


- **Business registration / KYC details** (uncommitted at write): added `Business`
  fields `brandName, companyName, companyType` + JSON `compliance` (PAN/GST),
  `ownerContact`, `billingContact`, `supportContact`, `branchHead`,
  `categoryAttributes`. Migration `..._business_registration_details` (ALTER only).
  Shared UI `components/business/registration-details.tsx` (PAN/GST Yes-No toggles
  + format validate, company type, owner contact + preference multi, billing
  [required]/support/branch-head contacts, per-category "status" attributes from
  `lib/category-attributes.ts`). Wired into onboarding wizard **Step 3** + dashboard
  **settings**. Whitelists extended in `businesses.service.update` +
  `business-onboarding.updateStep` (+ DTO). `COMPANY_TYPES`/`CONTACT_PREFERENCES`
  in constants. Store + format-validate only (no gov API, no doc upload).
- **Voucher system** (uncommitted at write): spend-gated vouchers. Models
  `Voucher` + `VoucherClaim` + migration `..._vouchers`. Module `apps/api/src/modules/vouchers`
  (owner CRUD, staff `POST /v1/vouchers/redeem`, customer `available`/`unlock`/`my`).
  Spend basis = cumulative `VerifiedPurchase` sum at the business; unique per-customer
  code generated on unlock; code hidden until spend ≥ threshold. UI:
  `/dashboard/vouchers` (publish + redeem panel) + business-detail vouchers section
  (progress + unlock + code reveal) + sidebar link. Cross-tenant safe (data in
  business tenant). **Both migrations still need `prisma migrate deploy` on VPS.**


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
9. **`next build` DOES NOT typecheck** — `apps/web/next.config` sets
   `typescript.ignoreBuildErrors: true` and the log prints `Skipping validation of
   types`. A missing import compiles clean and then crashes at runtime as
   `ReferenceError: x is not defined` → "This page couldn't load."
   **Always run `cd apps/web && npx tsc --noEmit` and check for TS2304
   ("Cannot find name") before claiming a build is clean.** This exact bug shipped
   an unimported `cn` in `/dashboard/settings`, breaking the page for hotels.

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

- **Pending VPS migrations**: `..._hotel_category_rows`, `..._payment_proof`
  (the vouchers / registration-details / hotel-registration ones are applied).
- Voucher customer wallet page (`/vouchers`) — API `GET /v1/vouchers/my` exists, no page yet.
- `/reset-password` page (API exists).
- DB perf indexes migration apply on VPS.
- Social sign-in wiring.
- Opera cross-browser check.
