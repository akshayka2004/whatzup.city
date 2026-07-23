'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  Tag,
  Star,
  Store,
  Image,
  Megaphone,
  FileText,
  LifeBuoy,
  Settings,
  LogOut,
  Shield,
  ShieldCheck,
  AlertTriangle,
  UserCog,
  CreditCard,
  GitBranch,
  ClipboardList,
  MessageSquare,
  Package,
  Flag,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/rbac';

// ── MENU DEFINITIONS PER ROLE TIER ───────────────────────────────────

const OWNER_MENU = [
  { label: 'Overview', href: '/dashboard', icon: BarChart3, exact: true },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Bill Moderation', href: '/dashboard/moderation', icon: ShieldCheck, badge: 'pending' },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { label: 'Offers', href: '/dashboard/offers', icon: Tag },
  { label: 'Events', href: '/dashboard/events', icon: CalendarDays },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { label: 'Branches', href: '/dashboard/branches', icon: GitBranch },
  { label: 'Media', href: '/dashboard/media', icon: Image },
  { label: 'Team', href: '/dashboard/team', icon: UserCog },
  { label: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
  { label: 'Support', href: '/dashboard/support', icon: LifeBuoy },
  { label: 'Report Issue', href: '/report', icon: Flag },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const MODERATOR_MENU = [
  { label: 'Overview', href: '/dashboard', icon: ClipboardList, exact: true },
  { label: 'Bill Queue', href: '/dashboard/moderation', icon: ShieldCheck, badge: 'pending', highlight: true },
  { label: 'Review Moderation', href: '/dashboard/reviews', icon: Star },
  { label: 'Customer Reports', href: '/dashboard/customers', icon: MessageSquare },
  // Fraud Alerts hidden — dormant module
  { label: 'Offers', href: '/dashboard/offers', icon: Tag },
  { label: 'Media', href: '/dashboard/media', icon: Image },
];

function getMenuForRole(role: string) {
  if (role === 'BUSINESS_MODERATOR') return MODERATOR_MENU;
  // BUSINESS_OWNER, BUSINESS_ADMIN, or any other business role → owner menu
  return OWNER_MENU;
}

// ── COMPONENT ─────────────────────────────────────────────────────────

export function BusinessSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [userName, setUserName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('Dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Try both 'user' and 'user_session' keys for compatibility
      const storedUser = localStorage.getItem('user_session') || localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // Prefer explicit rbacRole, then derive from legacy role
          const rbac = parsed?.rbacRole;
          const legacyRole = parsed?.role;
          if (rbac) {
            setUserRole(rbac);
          } else if (legacyRole === 'business') {
            setUserRole('BUSINESS_OWNER');
          } else {
            setUserRole(legacyRole || 'BUSINESS_OWNER');
          }
          if (parsed?.name) setUserName(parsed.name);
          if (parsed?.businessName) setBusinessName(parsed.businessName);
        } catch (_) { /* ignore */ }
      }
    }
  }, []);

  const menuItems = getMenuForRole(userRole);

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('user_session');
    }
    router.push('/login');
  };

  const isModerator = userRole === 'BUSINESS_MODERATOR';
  const isOwner = userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_ADMIN';

  const NavRow = ({
    href,
    label,
    icon: Icon,
    active,
    highlight,
    badge,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active: boolean;
    highlight?: boolean;
    badge?: boolean;
  }) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
        active
          ? 'bg-primary/10 text-primary'
          : highlight
            ? 'text-warning hover:bg-warning/10'
            : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          active
            ? 'text-primary'
            : highlight
              ? 'text-warning'
              : 'text-muted-foreground group-hover:text-foreground',
        )}
      />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground">
          !
        </span>
      )}
    </Link>
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand + workspace */}
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Whtzup.city" className="h-9 w-auto object-contain" />
          <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground">
            {businessName}
          </span>
        </Link>
        <div className="mt-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              isOwner && 'bg-primary/10 text-primary',
              isModerator && 'bg-warning/15 text-warning',
              !isOwner && !isModerator && 'bg-muted text-muted-foreground',
            )}
          >
            {isOwner && <ShieldCheck className="h-2.5 w-2.5" />}
            {isModerator && <Shield className="h-2.5 w-2.5" />}
            {getRoleLabel(userRole)}
          </span>
        </div>
      </div>

      {/* Moderator info banner */}
      {isModerator && (
        <div className="mx-3 mb-1 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] font-medium text-warning">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Moderator access — analytics & financials restricted
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {menuItems.map((item) => (
          <NavRow
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isItemActive(item.href, item.exact)}
            highlight={(item as any).highlight}
            badge={(item as any).badge === 'pending'}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-sidebar-border px-3 py-3">
        <NavRow
          href="/profile"
          label="Settings"
          icon={Settings}
          active={pathname === '/profile'}
        />
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
