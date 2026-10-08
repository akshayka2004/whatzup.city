import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Clapperboard,
  CreditCard,
  Flag,
  Gift,
  GitBranch,
  Grid2x2,
  Heart,
  Home,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Megaphone,
  MessageSquareWarning,
  Network,
  Package,
  QrCode,
  ReceiptText,
  ScrollText,
  Search,
  Settings,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
  Store,
  Tags,
  Ticket,
  TicketPercent,
  UserCog,
  UserPlus,
  Users,
  Utensils,
  BadgeIndianRupee,
  Bell,
  CircleUserRound,
} from 'lucide-react';
import { MOVIES_ENABLED } from '@/lib/feature-flags';

export type NavArea = 'public' | 'business' | 'staff' | 'admin' | 'super-admin';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Active only on an exact path match (section roots like /dashboard). */
  exact?: boolean;
  /** data-tour anchor for the onboarding tour (desktop sidebar). */
  tour?: string;
  /** data-tour anchor when the item is a mobile bottom tab. */
  mobileTour?: string;
  /** Draws attention (moderator bill queue). */
  highlight?: boolean;
};

export type NavGroup = { title?: string; items: NavItem[] };

export type NavSpec = {
  area: NavArea;
  /** Where the logo links to. */
  home: string;
  /** Workspace label under the logo. */
  title: string;
  subtitle?: string;
  groups: NavGroup[];
  /** Pinned at the sidebar bottom (profile, settings, help). */
  footer: NavItem[];
  /** hrefs shown as mobile bottom tabs (max 4; the 5th slot is "More"). */
  mobileTabs: string[];
  /** Mobile label overrides, keyed by href. */
  mobileLabels?: Record<string, string>;
};

export type NavContext = {
  signedIn?: boolean;
  /** BUSINESS_MODERATOR gets the restricted business menu. */
  moderator?: boolean;
  isFood?: boolean;
  /** Brand accounts manage outlets, so the legacy Branches page is hidden. */
  isBrand?: boolean;
  businessName?: string;
};

const movies = (item: NavItem): NavItem[] => (MOVIES_ENABLED ? [item] : []);

function publicNav(ctx: NavContext): NavSpec {
  return {
    area: 'public',
    home: '/',
    title: 'whtzup.city',
    groups: [
      {
        title: 'Discover',
        items: [
          { label: 'Home', href: '/', icon: Home, exact: true, mobileTour: 'mnav-home' },
          { label: 'Browse', href: '/category', icon: Grid2x2, tour: 'nav-browse' },
          { label: 'Nearby', href: '/nearby', icon: MapPin },
          { label: 'Search', href: '/search', icon: Search, tour: 'nav-search', mobileTour: 'mnav-search' },
          { label: 'Offers', href: '/offers', icon: TicketPercent, tour: 'nav-offers' },
          { label: 'Spin it', href: '/spin-it', icon: Sparkles },
          { label: 'Events', href: '/events', icon: CalendarDays, tour: 'nav-events' },
          ...movies({ label: 'Movies', href: '/movies', icon: Clapperboard }),
          { label: 'Announcements', href: '/government', icon: Megaphone },
        ],
      },
      {
        title: 'You',
        items: [
          { label: 'Favorites', href: '/favorites', icon: Heart, tour: 'nav-favorites', mobileTour: 'mnav-saved' },
          { label: 'Notifications', href: '/notifications', icon: Bell },
          { label: 'Report Issue', href: '/report', icon: Flag },
        ],
      },
    ],
    footer: [
      ctx.signedIn
        ? { label: 'Profile Settings', href: '/profile', icon: CircleUserRound, tour: 'nav-settings' }
        : { label: 'Sign In / Register', href: '/login', icon: UserPlus },
      { label: 'Help & Support', href: '/support', icon: LifeBuoy },
    ],
    mobileTabs: ['/', '/search', '/offers', '/favorites'],
    mobileLabels: { '/favorites': 'Saved' },
  };
}

function businessNav(ctx: NavContext): NavSpec {
  if (ctx.moderator) {
    return {
      area: 'business',
      home: '/dashboard',
      title: ctx.businessName || 'Dashboard',
      subtitle: 'Moderator',
      groups: [
        {
          items: [
            { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, exact: true, tour: 'nav-overview', mobileTour: 'mnav-overview' },
            { label: 'Bill Queue', href: '/dashboard/moderation', icon: ReceiptText, tour: 'nav-moderation', highlight: true },
            { label: 'Review Moderation', href: '/dashboard/reviews', icon: Star },
            { label: 'Customer Reports', href: '/dashboard/customers', icon: MessageSquareWarning, tour: 'nav-customers' },
            { label: 'Offers', href: '/dashboard/offers', icon: TicketPercent, tour: 'nav-offers', mobileTour: 'mnav-offers' },
          ],
        },
      ],
      footer: [{ label: 'Profile', href: '/profile', icon: CircleUserRound, tour: 'nav-settings' }],
      mobileTabs: ['/dashboard', '/dashboard/moderation', '/dashboard/offers', '/dashboard/reviews'],
      mobileLabels: { '/dashboard/moderation': 'Bills', '/dashboard/reviews': 'Reviews' },
    };
  }

  return {
    area: 'business',
    home: '/dashboard',
    title: ctx.businessName || 'Dashboard',
    subtitle: 'Business',
    groups: [
      {
        items: [
          { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, exact: true, tour: 'nav-overview', mobileTour: 'mnav-overview' },
          { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        ],
      },
      {
        title: 'Grow',
        items: [
          { label: 'Offers', href: '/dashboard/offers', icon: TicketPercent, tour: 'nav-offers', mobileTour: 'mnav-offers' },
          { label: 'Vouchers', href: '/dashboard/vouchers', icon: Gift, tour: 'nav-vouchers' },
          { label: 'Spin wheel', href: '/dashboard/discounts', icon: Sparkles, tour: 'nav-discounts' },
          { label: 'Events', href: '/dashboard/events', icon: CalendarDays },
        ],
      },
      {
        title: 'Operate',
        items: [
          { label: 'Bill Queue', href: '/dashboard/moderation', icon: ReceiptText, tour: 'nav-moderation' },
          { label: 'Customers', href: '/dashboard/customers', icon: Users, tour: 'nav-customers' },
          { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
          { label: 'Products', href: '/dashboard/products', icon: Package },
          ...(ctx.isFood ? [{ label: 'Menu Photos', href: '/dashboard/menu', icon: Utensils, tour: 'nav-menu' }] : []),
          { label: 'QR Code', href: '/dashboard/qr-code', icon: QrCode },
        ],
      },
      {
        title: 'Business',
        items: [
          { label: 'Outlets', href: '/dashboard/outlets', icon: Network },
          ...(ctx.isBrand ? [] : [{ label: 'Branches', href: '/dashboard/branches', icon: GitBranch }]),
          { label: 'Team', href: '/dashboard/team', icon: UserCog },
          { label: 'Subscription', href: '/dashboard/subscriptions', icon: CreditCard },
          { label: 'Settings', href: '/dashboard/settings', icon: Settings },
        ],
      },
    ],
    footer: [
      { label: 'Support', href: '/dashboard/support', icon: LifeBuoy },
      { label: 'Report Issue', href: '/report', icon: Flag },
      { label: 'Profile', href: '/profile', icon: CircleUserRound, tour: 'nav-settings' },
    ],
    mobileTabs: ['/dashboard', '/dashboard/moderation', '/dashboard/offers', '/dashboard/analytics'],
    mobileLabels: { '/dashboard/moderation': 'Bills' },
  };
}

function staffNav(): NavSpec {
  return {
    area: 'staff',
    home: '/staff',
    title: 'Platform staff',
    subtitle: 'Data entry',
    groups: [
      {
        items: [
          { label: 'Overview', href: '/staff', icon: LayoutDashboard, exact: true },
          { label: 'Events', href: '/staff/events', icon: CalendarDays },
          ...movies({ label: 'Movies', href: '/staff/movies', icon: Clapperboard }),
          { label: 'Platform Offers', href: '/staff/platform-offers', icon: TicketPercent },
          { label: 'Announcements', href: '/staff/announcements', icon: Megaphone },
          { label: 'Businesses', href: '/staff/businesses', icon: Store },
        ],
      },
    ],
    footer: [],
    mobileTabs: ['/staff', '/staff/events', '/staff/platform-offers', '/staff/announcements'],
    mobileLabels: { '/staff/platform-offers': 'Offers', '/staff/announcements': 'Notices' },
  };
}

function adminNav(): NavSpec {
  return {
    area: 'admin',
    home: '/admin',
    title: 'Admin',
    subtitle: 'Platform operations',
    groups: [
      { items: [{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true }] },
      {
        title: 'Businesses',
        items: [
          { label: 'Approvals', href: '/admin/approvals', icon: ClipboardCheck },
          { label: 'Registrations', href: '/admin/registrations', icon: UserPlus },
          { label: 'Categories', href: '/admin/categories', icon: Tags },
        ],
      },
      {
        title: 'Money',
        items: [
          { label: 'Payments', href: '/admin/payments', icon: CircleDollarSign },
          { label: 'Payment Approvals', href: '/admin/payment-approvals', icon: BadgeIndianRupee },
          { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
        ],
      },
      {
        title: 'Content',
        items: [
          { label: 'Platform Offers', href: '/admin/platform-offers', icon: TicketPercent },
          { label: 'Spin wheels', href: '/admin/discounts', icon: Ticket },
          { label: 'Notices', href: '/admin/notices', icon: Megaphone },
        ],
      },
      {
        title: 'Trust & Safety',
        items: [
          { label: 'Reports', href: '/admin/reports', icon: ShieldAlert },
          { label: 'Bill escalations', href: '/admin/bills', icon: ReceiptText },
          { label: 'Audit Logs', href: '/admin/audit', icon: ScrollText },
        ],
      },
    ],
    footer: [
      { label: 'My Profile', href: '/admin/profile', icon: CircleUserRound },
    ],
    mobileTabs: ['/admin', '/admin/approvals', '/admin/payments', '/admin/reports'],
  };
}

function superAdminNav(): NavSpec {
  return {
    area: 'super-admin',
    home: '/super-admin',
    title: 'Super Admin',
    subtitle: 'Platform control',
    groups: [
      { items: [{ label: 'Overview', href: '/super-admin', icon: LayoutDashboard, exact: true }] },
      {
        title: 'People',
        items: [
          { label: 'Users', href: '/super-admin/registrations', icon: UserPlus },
          { label: 'Manage Users', href: '/super-admin/users', icon: Users },
          { label: 'Admins', href: '/super-admin/roles', icon: KeyRound },
        ],
      },
      {
        title: 'Businesses',
        items: [
          { label: 'Businesses', href: '/super-admin/businesses', icon: Store },
          { label: 'Brand accounts', href: '/super-admin/brands', icon: Building2 },
          // /admin/approvals has the first-payment popup the super-admin copy lacks.
          { label: 'Approvals', href: '/admin/approvals', icon: ClipboardCheck },
          { label: 'Categories', href: '/super-admin/categories', icon: Tags },
        ],
      },
      {
        title: 'Money',
        items: [
          { label: 'Payments', href: '/admin/payments', icon: CircleDollarSign },
          { label: 'Payment Approvals', href: '/admin/payment-approvals', icon: BadgeIndianRupee },
          { label: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
          { label: 'Platform Vouchers', href: '/super-admin/platform-vouchers', icon: Gift },
        ],
      },
      {
        title: 'Content',
        items: [
          { label: 'Platform Offers', href: '/admin/platform-offers', icon: TicketPercent },
          { label: 'Business Offers', href: '/super-admin/offers', icon: Ticket },
          { label: 'Events', href: '/super-admin/events', icon: CalendarDays },
          ...movies({ label: 'Movies', href: '/super-admin/movies', icon: Clapperboard }),
          { label: 'Notices', href: '/super-admin/notices', icon: Megaphone },
        ],
      },
      {
        title: 'Trust & Safety',
        items: [
          { label: 'Reports', href: '/super-admin/reports', icon: ShieldAlert },
          { label: 'Bill escalations', href: '/admin/bills', icon: ReceiptText },
          { label: 'Audit Logs', href: '/super-admin/audit', icon: ScrollText },
          { label: 'Referrals', href: '/super-admin/referrals', icon: Share2 },
        ],
      },
      {
        title: 'System',
        items: [
          { label: 'System Health', href: '/super-admin/health', icon: Activity },
          { label: 'Configuration', href: '/super-admin/flags', icon: Flag },
        ],
      },
    ],
    footer: [
      { label: 'My Profile', href: '/super-admin/profile', icon: CircleUserRound },
    ],
    mobileTabs: ['/super-admin', '/admin/approvals', '/super-admin/businesses', '/admin/payments'],
    mobileLabels: { '/super-admin': 'Overview', '/super-admin/businesses': 'Businesses' },
  };
}

export function getNav(area: NavArea, ctx: NavContext = {}): NavSpec {
  switch (area) {
    case 'business':
      return businessNav(ctx);
    case 'staff':
      return staffNav();
    case 'admin':
      return adminNav();
    case 'super-admin':
      return superAdminNav();
    default:
      return publicNav(ctx);
  }
}

export function allItems(spec: NavSpec): NavItem[] {
  return [...spec.groups.flatMap((g) => g.items), ...spec.footer];
}

export function isItemActive(pathname: string, item: Pick<NavItem, 'href' | 'exact'>) {
  if (item.exact || item.href === '/') return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}
