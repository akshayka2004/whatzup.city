import {
  Utensils,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  GraduationCap,
  Laptop,
  Building2,
  Dumbbell,
  Scissors,
  Hotel,
  Car,
  Wrench,
  Store,
  Plane,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

/**
 * Picks an icon for a category from its slug / name. A small explicit map (not
 * `import * as icons`) so the page doesn't ship the whole lucide set.
 */
const RULES: [RegExp, LucideIcon][] = [
  [/food|restaurant|cafe|bakery|dining|catering|kitchen|sadya|biryani/i, Utensils],
  [/hotel|resort|stay|lodg|homestay/i, Hotel],
  [/salon|beauty|parlou?r|spa|barber/i, Scissors],
  [/health|medical|clinic|hospital|doctor|pharma|diagnos/i, Stethoscope],
  [/educat|school|college|tuition|coaching|training/i, GraduationCap],
  [/tech|software|computer|\bit\b/i, Laptop],
  [/real.?estate|property|builder|construction/i, Building2],
  [/fitness|gym|yoga|wellness|sport/i, Dumbbell],
  [/auto|\bcars?\b|vehicle|tyre|tire|garage|puncture/i, Car],
  [/professional|consult|legal|account|finance|agency/i, Briefcase],
  [/repair|service|plumb|electric|mechanic|home.?care/i, Wrench],
  [/travel|tour|holiday|trip/i, Plane],
  [/retail|shop|store|gift|cloth|fashion|electronics|market/i, ShoppingBag],
];

export function categoryIconFor(slugOrName?: string | null): LucideIcon {
  const s = slugOrName || '';
  for (const [re, Icon] of RULES) if (re.test(s)) return Icon;
  return s ? Store : Sparkles;
}
