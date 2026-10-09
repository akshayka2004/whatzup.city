import {
  Utensils,
  UtensilsCrossed,
  Shirt,
  Hotel,
  BedDouble,
  Building2,
  Stethoscope,
  Landmark,
  Dumbbell,
  CalendarDays,
  Store,
  Scissors,
  Gift,
  Car,
  Briefcase,
  LayoutGrid,
  ShoppingBag,
  GraduationCap,
  Laptop,
  Search,
  Tag,
  Shield,
  MapPin,
  Megaphone,
  Star,
  type LucideIcon,
} from 'lucide-react';

/**
 * The API wraps lists inconsistently ({success,data:[…]}, {success,data:{data:[…],meta}},
 * {items}, bare array). One tolerant unwrapper so every strip reads the same way.
 */
export function listOf(body: unknown): any[] {
  const b = body as any;
  const candidates = [b, b?.data, b?.data?.data, b?.data?.items, b?.items];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

/* ────────────── CATEGORIES ────────────── */
export type HomeCategory = {
  slug: string;
  name: string;
  icon?: string | null;
  listingsCount?: number;
};

// Slugs must match real rows in the `business_categories` table
// (packages/database/prisma/seed.ts). Used ONLY when /v1/categories returns nothing.
export const FALLBACK_CATEGORIES: HomeCategory[] = [
  { name: 'Restaurants', slug: 'restaurants' },
  { name: 'Shopping & Retail', slug: 'retail' },
  { name: 'Professional Services', slug: 'services' },
  { name: 'Medical & Health', slug: 'healthcare' },
  { name: 'Education Hubs', slug: 'education' },
  { name: 'Tech & Agency', slug: 'technology' },
  { name: 'Real Estate', slug: 'real_estate' },
  { name: 'Health & Fitness', slug: 'fitness_wellness' },
];

// First match wins, so more specific rules (buffet, staycation, retail) sit above broader ones.
const ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/buffet/, UtensilsCrossed],
  [/food|restaurant|dining|cafe|bakery|kitchen/, Utensils],
  [/fashion|cloth|apparel|boutique|textile/, Shirt],
  [/stay|resort|homestay/, BedDouble],
  [/hotel|lodg/, Hotel],
  [/real estate|property|realty/, Building2],
  [/health|medical|clinic|hospital|pharm|dental/, Stethoscope],
  [/venue|auditorium|banquet|hall/, Landmark],
  [/fitness|wellness|gym|yoga/, Dumbbell],
  [/event/, CalendarDays],
  [/personal care|salon|beauty|spa|barber/, Scissors],
  [/retail/, ShoppingBag],
  [/gift/, Gift],
  [/shop|store|mart|grocery/, Store],
  [/\bcar\b|auto|vehicle|garage|motor/, Car],
  [/educat|school|tuition|academy|coaching/, GraduationCap],
  [/tech|software|computer|\bit\b/, Laptop],
  [/business|service|consult|agency|professional/, Briefcase],
];

export function iconForCategory(c: {
  slug?: string;
  name?: string;
  icon?: string | null;
}): LucideIcon {
  const hay = `${c.slug ?? ''} ${c.name ?? ''} ${c.icon ?? ''}`
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
  for (const [re, Icon] of ICON_RULES) if (re.test(hay)) return Icon;
  return LayoutGrid;
}

/** Sum of live listings across a category tree (parents and children are counted separately by the API). */
export function sumListings(nodes: any[]): number {
  return nodes.reduce(
    (n, c) =>
      n +
      (Number(c?.listingsCount) || 0) +
      (Array.isArray(c?.children) ? sumListings(c.children) : 0),
    0,
  );
}

/* ────────────── FEATURES ────────────── */
export const FEATURES: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: Search,
    title: 'Precision Directory',
    description:
      'Find local providers instantly using refined search criteria, tags, and proximity mapping.',
  },
  {
    icon: Tag,
    title: 'Direct Consumer Offers',
    description:
      'Claim geo-targeted discounts, limited-time flash sales, and rewards from neighbourhood shops.',
  },
  {
    icon: Shield,
    title: 'Trust & Verification',
    description:
      'Every merchant undergoes business-licence and regulatory verification before going live.',
  },
  {
    icon: MapPin,
    title: 'Geographic Discovery',
    description:
      'Discover verified utility services, artisan spots, and essential shops closest to you.',
  },
  {
    icon: Megaphone,
    title: 'Civic Alert Broadcasts',
    description:
      'Keep tabs on administrative notices, utility updates, roadworks, and townhall briefs.',
  },
  {
    icon: Star,
    title: 'Invoice-Verified Reviews',
    description:
      'Reviews are backed by an uploaded transaction bill, so the feedback comes from real customers.',
  },
];

/* ────────────── FORMATTING ────────────── */
// Fixed timezone so server-rendered and client-rendered dates always agree (no hydration mismatch).
const TZ = 'Asia/Kolkata';

export function fmtShortDate(d?: string | null): string {
  if (!d) return '';
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return '';
  return t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: TZ });
}

export function fmtDay(d?: string | null): { day: string; month: string } | null {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return {
    day: t.toLocaleDateString('en-IN', { day: 'numeric', timeZone: TZ }),
    month: t.toLocaleDateString('en-IN', { month: 'short', timeZone: TZ }),
  };
}

export function rupees(n: number | string | null | undefined): string {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

/** "20% OFF" / "₹150 OFF" / '' — same precedence the offers page uses. */
export function discountText(o: {
  discountPercent?: number | null;
  discountAmount?: number | string | null;
  discount?: number;
}): string {
  const pct = Number(o.discountPercent ?? o.discount ?? 0);
  if (pct > 0) return `${pct}% OFF`;
  const amt = Number(o.discountAmount ?? 0);
  if (amt > 0) return `${rupees(amt)} OFF`;
  return '';
}

export function eventPrice(ev: {
  ticketType?: string;
  ticketTiers?: Array<{ price?: number | string }> | null;
  ticketPrice?: number | string | null;
}): string {
  if (ev.ticketType !== 'PAID') return 'Free';
  if (Array.isArray(ev.ticketTiers) && ev.ticketTiers.length) {
    return `From ${rupees(Math.min(...ev.ticketTiers.map((t) => Number(t.price) || 0)))}`;
  }
  return rupees(ev.ticketPrice);
}

export function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [];
}
