# DESIGN.md — Whtzup.city

Visual system of record (design system v3, "soft modern"). Pages consume tokens and
shared components; pages do not invent colour, size or chrome.

- Tokens: `apps/web/app/globals.css` (+ motion/elevation helpers in `foundation.css`)
- Living style guide: `/design` (dev / preview only — `NEXT_PUBLIC_SHOW_DESIGN=1` to expose)
- Guard: `pnpm lint:design` (`scripts/check-design.js`, add `--strict` once at zero)

## Direction

Warm, calm, trustworthy (Airbnb / Linear / Stripe register): warm-neutral canvas,
white cards, one terracotta accent reserved for the primary action, active nav and
focus. Soft rounded shapes, generous whitespace, quiet motion. Never playful.

Light is the default; users can choose Light, Dark or Match device from the account
menu (`ThemeProviderClient`: `defaultTheme="light"`, `enableSystem`).

## Colour tokens

Use the semantic utilities, never raw Tailwind palette classes or hex.

| Token (utility) | Use |
|---|---|
| `bg-background` / `bg-card` / `bg-surface-sunken` | Canvas / surfaces / insets |
| `text-foreground` / `text-muted-foreground` / `text-subtle-foreground` | Ink ramp |
| `border-border` / `border-border-strong` | Hairlines / emphasised edges |
| `bg-primary` (+ `text-primary-foreground`) | Primary action only |
| `bg-brand-soft` + `text-brand-soft-foreground` | Brand tints, selected tiles, icon chips |
| `bg-{success,warning,danger,info}-soft` + `text-…-soft-foreground` | Status (always with icon or label) |
| `bg-success` / `bg-warning` / `bg-destructive` / `bg-info` | Solid status (rare) |
| `text-delta-up` / `text-delta-down` | KPI deltas (good / bad direction) |
| `--chart-1 … --chart-8`, `--chart-grid`, `--chart-axis` | Data-viz only |

Charts: categorical palette validated for colour-blind separation in light and dark
(adjacent CVD ΔE ≥ 8, normal-vision ΔE ≥ 15). Assign in fixed order, never cycle; fold
a 9th series into "Other". Single-series charts use `--primary`. Slots 3–5 are < 3:1
on white, so every chart ships tooltips and a table/CSV view.

Contrast: ink/bg 14.2:1 · muted/bg 4.6:1 (do not lighten) · white-on-terracotta ≈ 3.9:1
→ bold/large labels only.

## Shape & elevation

| Utility | Size | Use |
|---|---|---|
| `rounded-xs` | 6 | table chips, kbd |
| `rounded-sm` | 10 | small controls |
| `rounded-md` | 12 | menus, tooltips |
| `rounded-control` (`lg`) | 14 | buttons, inputs |
| `rounded-xl` | 16 | nav rows, list tiles |
| `rounded-card` (`2xl`) | 20 | cards, sections |
| `rounded-sheet` (`3xl`) | 28 | dialogs, bottom sheets, hero |
| `rounded-full` | — | pills, avatars, chips |

Nested radius = outer − padding. Elevation is border-first: `shadow-e1` (cards),
`shadow-e2` (popovers, selected tiles), `shadow-e3` (modals). Glass/blur only on
sticky chrome and overlays.

## Typography

Geist (UI) · Geist Mono (codes) · Noto Sans Malayalam (loaded on demand).
Type utilities: `text-display`, `text-title`, `text-heading`, `text-body`, `text-label`,
`text-caption` (12px minimum anywhere), `text-overline`, `text-metric` (tabular).
`cn()` knows these are font sizes, so they merge correctly.

## Layout

- One `AppShell` for every area (`components/layouts/app-shell.tsx`): collapsible
  sidebar (icon rail, persisted) · header · scrolling main (max 1280, 1600 for admin)
  · mobile bottom bar. Auth-loading shows `AppShellSkeleton`, never a spinner.
- Navigation for every role comes from `lib/nav/config.ts` — sidebar, mobile tabs and
  the "More" sheet all read it. Add pages there, nowhere else.
- Z-index scale: dropdown 10 · sticky 20 · nav 30 · backdrop 40 · modal 50 · toast 60 · tooltip 70.

## Components (use these first)

| Need | Component |
|---|---|
| Page title, breadcrumbs, actions, tabs slot | `components/system/page-header.tsx` |
| Titled block / settings group / panel | `components/system/section-card.tsx` |
| Modal (dialog on desktop, bottom sheet on phones) | `components/system/modal.tsx` |
| Legacy overlay drop-in (focus trap, Escape) | `components/system/modal-surface.tsx` |
| Table with sort, sticky header, mobile cards, paging, CSV | `components/system/data-table.tsx` |
| Search + filters + actions row | `components/system/toolbar.tsx` |
| Quick filters / segment chips | `components/system/filter-chip.tsx` |
| Wizard progress | `components/system/stepper.tsx` |
| Status | `components/common/status-pill.tsx` (`statusTone()` map) |
| Empty / skeleton | `components/common/empty-state.tsx`, `common/skeletons.tsx` |
| Feedback | `toast` from `components/ui/sonner`, `useConfirm()` — never `alert/confirm` |
| Concept icons | `lib/icons.ts` (one lucide icon per product concept) |
| Analytics | `components/analytics/*` (KpiCard, RangePicker, TimeSeriesChart, BarList, Funnel, Heatmap) |
| Business listing card | `components/business-card.tsx` (one card everywhere) |
| Auth screens | `components/auth/auth-shell.tsx` (`AuthShell`, `AuthField`, `FormAlert`) |

Buttons: `primary` (one per view) · `tonal` · `secondary` · `outline` · `ghost` · `danger`
· `destructive` · `link`; sizes `sm 36 / default 40 / lg 48 / xl 56`; `shape="pill"`;
`loading` keeps width and sets `aria-busy`.

## Motion

120–320 ms, `ease-out-quint`; press = slight scale (primary buttons also tighten their
radius). Reveal already-visible content only. Everything respects
`prefers-reduced-motion`. No decorative drifting blobs.

## Known debt

- 13 legacy overlays remain (already have dialog roles or are full-screen states).
- Register wizard is restyled on tokens but still one long component; split into
  `register/(wizard)/[step]` with RHF+zod when the signup flow can be tested end-to-end.
