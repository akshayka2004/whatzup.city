# PRODUCT.md — Whtzup.city

## Register

**Product.** Design serves the product. The bulk of the surface area is app UI:
business dashboards, moderation queues, admin/super-admin oversight tables, and
multi-step onboarding. Public discovery pages (home, category, nearby, business
detail, offers, events, government notices) exist and lean more expressive, but
they are still utility-first — people arrive to *find something*, not to admire a
landing page. The one deliberately brand-register surface is `/login`.

## What it is

A multi-tenant civic + local-business platform for Kerala. It connects three
constituencies that normally never share a system: verified local businesses,
citizens/customers, and government/civic bodies.

## Users & context

| Role | Context | Primary job on screen |
|---|---|---|
| **Customer / citizen** | Phone, on the move, often one-handed, patchy data | Find a business or offer, submit a bill, leave a rating |
| **Business owner** | Desk or phone, between serving customers, low patience | Check what needs action (bills to moderate, offers expiring), publish an offer/event |
| **Business moderator/staff** | Repetitive queue work, many items in a row | Approve/reject bills fast, without misclicking |
| **Government / civic** | Occasional, formal, accuracy matters | Publish an announcement that reaches the right city |
| **Admin / super-admin** | Long sessions, dense data, cross-tenant | Scan queues and tables, spot anomalies, act decisively |

The common thread: **most screens are "what needs my attention, and what do I do
about it."** Not exploration. Not delight-for-its-own-sake.

## Brand personality

**Trustworthy · Grounded · Quietly premium.**

This is quasi-civic infrastructure — it must feel like it will still be here in
five years and that a government body would be comfortable publishing on it. It
should feel considered and calm, never playful, never startup-loud.

## Anti-references

- **Consumer super-app maximalism** (Swiggy/Zomato energy): saturated gradients,
  confetti, aggressive promo badges. Wrong for a platform carrying government
  notices.
- **Generic dark SaaS template**: neon-violet-on-near-black, glowing borders on
  everything, glassmorphism as decoration.
- **Government-portal drab**: dense grey tables, no hierarchy, 1998 forms. We are
  civic-adjacent, not bureaucratic.
- **Hero-metric dashboards**: four big-number cards with gradient accents at the
  top of every screen regardless of whether the numbers matter.

## Strategic design principles

1. **Action before ornament.** Every screen answers "what needs doing" in the
   first viewport. Decoration never delays that answer.
2. **One identity, everywhere.** A business owner and a super-admin should feel
   they're in the same system. Tokens are the contract; pages don't invent color.
3. **Density with air.** Admin surfaces are data-dense by necessity — earn
   legibility through hierarchy, alignment and spacing rhythm, not by shrinking text.
4. **Status must be unmistakable.** Pending / approved / rejected / expired drive
   real money and real moderation decisions. Status is never conveyed by hue alone
   (icon + label + color), and never in low contrast.
5. **Mobile is not the compact case, it's the common case.** Customers are on
   phones. Touch targets ≥44px; primary actions never hidden behind the fold or
   under a fixed bottom nav.
6. **Motion clarifies state changes.** Entrances and transitions explain what
   happened (item left the queue, status changed). No ambient animation.

## Accessibility

WCAG AA is the floor: body text ≥4.5:1, large/bold ≥3:1, visible keyboard focus
on every interactive element, semantic HTML, real `<label>`s, and a
`prefers-reduced-motion` path for every animation. Status colors always pair with
text or an icon.
