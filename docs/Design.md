# Design.md — Whtzup.city (visual system)

> Source of truth in code: `apps/web/app/globals.css`. Full design register in
> root `DESIGN.md` (impeccable). This is the color/type/theme summary.

## Theme

**Dark-first.** `ThemeProviderClient`: `defaultTheme="dark"`, `enableSystem={false}`;
header toggle switches + persists. Light mode supported and must stay legible.
Neutral is **violet-leaning** (not blue, not warm-cream) so it reads considered,
not "generic dark SaaS". Color strategy: **restrained** — tinted neutrals carry
the surface; one bronze accent stays <10% (primary action, active nav, focus).

## Color palette (anchor)

| Role | Hex | OKLCH (dark) |
|---|---|---|
| Background | `#2F2C36` | `oklch(0.300 0.018 299)` |
| Surface (card) | `#3B3943` | `oklch(0.350 0.017 295)` |
| Surface raised (input) | `#46444F` | `oklch(0.393 0.019 294)` |
| Accent / primary | `#8A6A63` | `oklch(0.554 0.043 32)` |
| Accent hover / ring | `#A67C73` | `oklch(0.625 0.054 32)` |
| Heading / ink | `#F4F5F7` | `oklch(0.970 0.003 265)` |
| Muted ink | `#B7B8C3` | `oklch(0.785 0.015 282)` |
| Border | `rgba(255,255,255,0.06)` | — |

**Contrast contract (verified):** ink/bg ≈ 12.5:1, muted/bg ≈ 6.9:1,
muted/card ≈ 5.7:1, white/primary ≈ 4.8:1 — all pass WCAG AA. `--muted-foreground`
is deliberately light; do not darken it.

Status (icon/label always, never hue-only):
success `oklch(0.72 0.14 155)` · warning `oklch(0.78 0.13 75)` ·
danger `oklch(0.63 0.19 25)` · info `oklch(0.70 0.10 235)`.
Light-mode variants defined alongside; both themes tuned to AA.

Tokens exposed to Tailwind: `bg-*`, `text-*`, `border-*` for
background/foreground/card/popover/primary/secondary/muted/accent/destructive/
border/input/ring/sidebar-* and `success/warning/info`.

## Typography

- Family: **Geist** (`font-sans`), `Geist_Mono` for numerics/code. One family,
  multiple weights — no second sans paired against it.
- Scale: page title `text-2xl`→`text-3xl` bold · section `text-base` bold ·
  body `text-sm` · meta `text-xs`. Display only on `/login` (≤64px).
- `text-wrap: balance` on headings, `pretty` on prose; measure ≤65–75ch.
- `tracking-tight` on headings ≥`text-2xl`; never below -0.04em.

## Radius, elevation, motion

- `--radius: 0.75rem`. Cards `rounded-2xl`, inputs/buttons `rounded-xl`,
  pills `rounded-full`, auth `rounded-[28px]`.
- Elevation border-first (hairline + soft shadow only where something floats).
  No glow borders. Glass/backdrop-blur reserved for true overlays.
- Motion 150–250ms, ease-out; no bounce. Reduced-motion fallback required.
  Auth animation utilities `.lp-*` in `globals.css`. **No inline `<style>`** in
  client components (React 19 flags it).

## Z-index scale (semantic)

`--z-dropdown:10 · sticky:20 · nav:30 · backdrop:40 · modal:50 · toast:60 · tooltip:70`.

## Components

shadcn/ui primitives in `apps/web/components/ui`. One primary button per view
(bronze); secondary = surface-raised + hairline; ghost tertiary; min 44px on
touch. Cards are containers, never nested. Inputs 44–54px, bronze focus ring,
labelled. Admin tables: sticky header, tabular figures, row hover, no zebra.
Status via `Badge` (icon+label). Empty states via `components/common/empty-state.tsx`.

## Known debt

- Some pages still hardcode old hexes (`#37353E/#44444E/#715A5A/#D3DAD9`) → migrate
  to tokens on touch.
- `/reset-password` page missing.
