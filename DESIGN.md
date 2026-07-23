# DESIGN.md — Whtzup.city

Visual system of record. Pages consume tokens; pages do not invent color.
Source of truth in code: `apps/web/app/globals.css`.

## Theme

**Light-first** (the "City Experience Platform" direction): warm neutral canvas,
white surfaces, muted terracotta accent. `ThemeProviderClient` sets
`defaultTheme="light"`, `enableSystem={false}`; the header toggle switches to a
warm-charcoal dark variant and the choice persists.

Why light warm-neutral: the product is a civic front-door — citizens, businesses,
and government should feel it's calm, trustworthy, and "official but human"
(Apple / Stripe / Airbnb / gov-digital-services register), not a dark admin tool.
The neutral is warm (not cool-grey, not stark white) so it reads considered.

Color strategy: **restrained** — warm neutrals carry the surface; the terracotta
accent stays reserved for primary action, active nav, and focus. Green = trust /
verified. Blue = information only. Accent never overpowers content.

## Palette (light — the default)

| Role | Hex | OKLCH | Use |
|---|---|---|---|
| Background | `#F7F5F2` | `oklch(0.971 0.005 78)` | App canvas |
| Surface | `#FFFFFF` | `oklch(1 0 0)` | Cards, popovers |
| Sidebar | `#FBFAF8` | `oklch(0.985 0.003 85)` | Sidebar |
| Border | `#EAE5DE` | `oklch(0.924 0.011 77)` | Hairlines |
| Primary (terracotta) | `#B86F50` | `oklch(0.615 0.103 43)` | Primary action, active, focus |
| Primary hover | `#A56045` | `oklch(0.561 0.099 42)` | Hover |
| Ink | `#20242F` | `oklch(0.261 0.022 269)` | Headings, body |
| Muted ink | `#667085` | `oklch(0.544 0.035 265)` | Secondary text, labels |
| Verified / success | `#35C48B` | `oklch(0.732 0.146 162)` | Verified, success |
| Warning | `#E6A03C` | `oklch(0.757 0.139 72)` | Warning |
| Danger | `#E75A5A` | `oklch(0.651 0.176 23)` | Destructive, error |

**Contrast contract (verified):** ink/bg 14.2:1 · muted/bg 4.6:1 · muted/surface
5.0:1 · ink/verified 7.0:1 — all pass AA. White-on-terracotta ≈ 3.9:1 → valid for
**bold/large button labels only** (never small body text on terracotta). Do not
darken `--muted-foreground` further; it only just clears 4.5:1.

Dark mode: same terracotta + status hues on a warm-charcoal neutral, all text
pairs ≥4.5:1 — kept coherent for the toggle, but light is the designed default.

Status (never hue-only — icon or label always): success `#35C48B` ·
warning `#E6A03C` · danger `#E75A5A` · info reserved blue `oklch(0.560 0.110 235)`.

## Typography

- Family: **Geist** (`next/font`, exposed as `font-sans`); `Geist_Mono` for
  numeric/code. One family across weights — no second sans paired against it.
- Scale: page title `text-2xl`→`text-3xl` bold; section `text-base` bold;
  body `text-sm`; meta `text-xs`. Display only on `/login` (up to ~64px).
- `text-wrap: balance` on headings; `text-wrap: pretty` on prose. Body measure
  capped ~65–75ch.
- Letter-spacing: `tracking-tight` on headings ≥`text-2xl`; never below -0.04em.

## Radius & elevation

- `--radius: 1rem` (16px). Buttons/inputs `rounded-xl` (16), cards `rounded-2xl`
  (`--radius-card` 20), hero/large sections `rounded-3xl` (`--radius-hero` 32),
  pills `rounded-full`. 8-point spacing system.
- Elevation is border-first: hairline `--border` + a soft shadow only where
  something genuinely floats (modal, popover, sticky bar). No glow borders.
- Glass/backdrop-blur is reserved for true overlays (modals, gates). Not decoration.

## Layout

- App shell: sidebar (desktop) + header; mobile uses `MobileNav` bottom bar.
  Content container `container mx-auto px-4`, bottom padding `pb-28` on mobile so
  the fixed nav never covers actions.
- Responsive grids: `repeat(auto-fit, minmax(280px, 1fr))` over breakpoint soup.
- Z-index scale (semantic, no 9999): dropdown 10 · sticky 20 · nav 30 ·
  backdrop 40 · modal 50 · toast 60 · tooltip 70.

## Components

shadcn/ui primitives in `apps/web/components/ui` are the base layer. Rules:

- **Buttons**: one primary per view. Primary = bronze; secondary = surface-raised
  + hairline; ghost for tertiary. Min height 44px on touch surfaces.
- **Cards**: containers, not decoration. Never nest cards.
- **Inputs**: 44–54px tall, hairline border, bronze focus ring
  (`0 0 0 3px rgba(138,106,99,.25)`), real `<label>`, placeholder ≥4.5:1.
- **Tables** (admin): sticky header, aligned numerics (tabular figures),
  row hover, zebra never — hierarchy comes from alignment and weight.
- **Status**: `Badge` with icon + label. Shared status map, not per-page strings.
- **Empty states**: `components/common/empty-state.tsx` — icon, one line of what's
  missing, one action. Every list/queue must use it rather than rendering nothing.

## Motion

- Durations 150–250ms; ease-out (quart/expo). No bounce, no elastic.
- Reveals enhance already-visible content — never gate visibility behind a
  transition (it ships blank in headless renderers).
- Auth-page animation utilities live in `globals.css` as `.lp-*`.
  **Do not use inline `<style>` in client components** — React 19 flags
  element-with-children style tags; put CSS in `globals.css`.
- Every animation needs a `@media (prefers-reduced-motion: reduce)` fallback.

## Known debt

- Some pages still hardcode old hexes (`#37353E`, `#44444E`, `#715A5A`,
  `#D3DAD9`) instead of tokens — migrate to tokens on touch.
- `/reset-password` page does not exist yet (API endpoint does).
