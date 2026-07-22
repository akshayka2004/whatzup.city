# Rules.md — Whtzup.city (AI / contributor guardrails)

Hard rules for anyone (human or AI) working in this repo. Violating these has
caused real production incidents — see the reasons.

## 1. Database

- **Use `prisma migrate`, NEVER `prisma db push`.** This project adopted migrate;
  `db push` drops partial indexes and diverges from history. Apply with
  `prisma migrate deploy` + `prisma generate`.
- **All tenant-owned queries go through the repositories** (`BaseRepository`)
  which inject `tenant_id`. Do not hand-roll un-scoped Prisma queries for
  tenant data.
- **Cross-tenant flows scope by globally-unique id, not tenant.** A bill lives in
  the customer's tenant but is moderated by the business owner (different tenant).
  Query by `businessId`; use the row's own `tenantId` for downstream writes.
  Reason: tenant-scoped queries hid customer bills from owners in prod.
- Resolve a business by `id` **or** `entityId` in onboarding/review/subscription
  paths — the resubmit flow passes `entityId`. Reason: "Business not found" bug.
- **Register routes: literal paths BEFORE `:param`.** `/users/:id` declared before
  `/users/referral-leaderboard` swallows the literal → `P2023 invalid UUID`.

## 2. Caching

- **Any write that changes a cached field must invalidate the cache key.**
  `businesses.findById` caches `business:{id}` (and slug) for 5 min. Review/rating
  writes must call the centralised recompute that busts the key. Reason: ratings
  showed 0 after refresh in prod.
- Never `redis FLUSHALL` on the VPS — it destroys BullMQ queues. Delete by pattern
  (`business:*`).

## 3. Frontend

- **No inline `<style>` in client components.** React 19 flags element-with-children
  `<style>`; put CSS in `globals.css`. Reason: crashed `/login` render.
- **Consume design tokens; do not hardcode hex.** Colors come from `globals.css`
  CSS variables / Tailwind token classes. Old hardcoded hexes (`#37353E`, `#44444E`,
  `#715A5A`, `#D3DAD9`) are debt — migrate to tokens on touch.
- **Touch targets ≥44px**; primary actions never hidden under the fixed mobile nav
  (`pb-28` on mobile content).
- **Reveals must enhance already-visible content** — never gate visibility behind a
  class-triggered transition (ships blank in headless/hidden tabs).
- Every animation needs a `@media (prefers-reduced-motion: reduce)` fallback.
- Status is never hue-only: icon + label + color.

## 4. Accessibility (WCAG AA, non-negotiable)

- Body text ≥4.5:1, large/bold ≥3:1, placeholders ≥4.5:1. Do not darken
  `--muted-foreground` "for elegance" — it is tuned to pass on bg AND card.
- Visible keyboard focus, semantic HTML, real `<label>`s, ARIA where needed.

## 5. Libraries

- **Use:** shadcn/ui + Radix primitives, Tailwind v4, lucide-react icons, Geist
  font (`next/font`), Prisma, NestJS, BullMQ, Typesense client, Supabase JS.
- **Prefer CSS keyframes** for simple motion (no new dep). If advanced motion is
  truly needed, discuss before adding `motion`/gsap.
- **Avoid:** Bootstrap, second sans-serif paired with Geist, gradient text,
  side-stripe accent borders, glassmorphism as decoration, adding a heavy dep for
  something CSS/existing libs already do.
- Do not add a dependency without a clear reason; keep the lockfile lean.

## 6. Error handling

- API: throw Nest exceptions (`NotFoundException`, `BadRequestException`, …);
  never leak stack/secret. Notifications/analytics are fire-and-forget
  (`.catch(() => {})`) — a side effect must not fail the main request.
- Security posture: do not reveal account existence (forgot-password returns a
  generic message).
- Frontend: surface real API error messages to the user; guard against undefined
  data; show empty states, not blank screens.

## 7. Secrets & config

- Never commit `.env` (gitignored). Never paste a masked editor value
  (`eyJhbGci••••`) back into `.env` — bullets become literal `•` → Supabase
  `ByteString` error.
- The API reads the repo-root `.env` (cwd is `apps/api`; no `apps/api/.env`).
  PM2 `env:` overrides file values.

## 8. Build & deploy

- **Next standalone: copy static after every web build** —
  `cp -r .next/static .next/standalone/apps/web/.next/` and `cp -r public …`.
  Skipping it 404s JS chunks (`ChunkLoadError`) and 404s images. Purge Cloudflare after.
- `pm2 restart <app> --update-env` so the new `.env` loads.
- Verify a change actually runs before claiming done (build + drive the flow).

## 9. Git & process

- Commit/push only when the user asks. Conventional Commits
  (`feat/fix/docs/chore(scope): …`).
- On Windows PowerShell use `git commit -F <file>` for multi-line messages.
- Keep `PROJECT_DOCUMENTATION.md` and `docs/Memory.md` updated after relevant
  behavioural changes (same commit).
