# DESIGN.md — Whtzup.city

Visual system of record. Pages consume tokens; pages do not invent color.
Source of truth in code: `apps/web/app/globals.css`.

## Theme

**Dark-first.** `ThemeProviderClient` sets `defaultTheme="dark"`, `enableSystem={false}`;
the header toggle switches and the choice persists. Light mode is supported and
must stay legible, but dark is the designed default.

Why dark: the platform is used in long moderation sessions and on phones in the
evening; the content is mostly dense text + status, not photography. The dark
neutral is violet-leaning (not blue, not warm-cream), which keeps it from reading
as "generic dark SaaS" while staying calm.

Color strategy: **restrained** — tinted neutrals carry the surface, one bronze
accent stays under ~10% of any screen and is reserved for primary action, active
nav, and focus.

## Palette

Anchor (established on `/login`, now the global token set):

| Role | Hex | OKLCH | Use |
|---|---|---|---|
| Background | `#2F2C36` | `oklch(0.300 0.018 299)` | App canvas |
| Surface | `#3B3943` | `oklch(0.350 0.017 295)` | Cards, popovers |
| Surface raised | `#46444F` | `oklch(0.393 0.019 294)` | Inputs, secondary/muted fills |
| Accent (primary) | `#8A6A63` | `oklch(0.554 0.043 32)` | Primary buttons, active state |
| Accent hover | `#A67C73` | `oklch(0.625 0.054 32)` | Hover, focus ring |
| Heading / ink | `#F4F5F7` | `oklch(0.970 0.003 265)` | Headings, body |
| Paragraph / muted ink | `#B7B8C3` | `oklch(0.785 0.015 282)` | Secondary text, labels |
| Border | `rgba(255,255,255,0.06)` | — | Hairlines |

**Contrast contract:** `--muted-foreground` is deliberately light (`0.785`) so
secondary text clears 4.5:1 on both `--background` and `--card`. Do not darken it
"for elegance" — that is the failure mode this system is guarding against.

Status hues (never hue-only — always icon or label too):
success `oklch(0.72 0.14 155)` · warning `oklch(0.78 0.13 75)` ·
danger `oklch(0.63 0.19 25)` · info `oklch(0.70 0.10 235)`.

## Typography

- Family: **Geist** (`next/font`, exposed as `font-sans`); `Geist_Mono` for
  numeric/code. One family across weights — no second sans paired against it.
- Scale: page title `text-2xl`→`text-3xl` bold; section `text-base` bold;
  body `text-sm`; meta `text-xs`. Display only on `/login` (up to ~64px).
- `text-wrap: balance` on headings; `text-wrap: pretty` on prose. Body measure
  capped ~65–75ch.
- Letter-spacing: `tracking-tight` on headings ≥`text-2xl`; never below -0.04em.

## Radius & elevation

- `--radius: 0.75rem`. Cards `rounded-2xl`, inputs/buttons `rounded-xl`,
  pills `rounded-full`, auth containers `rounded-[28px]`.
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
