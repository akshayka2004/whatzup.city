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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { canAccess, getRoleLabel } from '@/lib/rbac';

// ── MENU DEFINITIONS PER ROLE TIER ───────────────────────────────────

const OWNER_MENU = [
  { label: 'Overview', href: '/dashboard', icon: BarChart3, exact: true },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Bill Moderation', href: '/dashboard/moderation', icon: ShieldCheck, badge: 'pending' },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { label: 'Offers', href: '/dashboard/offers', icon: Tag },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
  { label: 'Branches', href: '/dashboard/branches', icon: GitBranch },
  { label: 'Media', href: '/dashboard/media', icon: Image },
  { label: 'Team', href: '/dashboard/team', icon: UserCog },
  { label: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
  { label: 'Support', href: '/dashboard/support', icon: LifeBuoy },
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

// ── ROLE BADGE COLORS ─────────────────────────────────────────────────

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'BUSINESS_OWNER' || role === 'BUSINESS_ADMIN') return 'default';
  if (role === 'BUSINESS_MODERATOR') return 'secondary';
  return 'outline';
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

  return (
    <aside className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Header */}
      <div className="border-b border-sidebar-border px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <img src="/logo.png" alt="Whtzup.city Logo" className="h-16 w-auto object-contain" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-sidebar-primary leading-tight truncate">
              {businessName}
            </span>
          </div>
        </div>
        {/* Role badge */}
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
              isOwner && 'bg-violet-500/15 text-violet-400',
              isModerator && 'bg-amber-500/15 text-amber-400',
              !isOwner && !isModerator && 'bg-slate-500/15 text-slate-400',
            )}
          >
            {isOwner && <ShieldCheck className="h-2.5 w-2.5" />}
            {isModerator && <Shield className="h-2.5 w-2.5" />}
            {getRoleLabel(userRole)}
          </div>
        </div>
      </div>

      {/* Moderator info banner */}
      {isModerator && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Moderator access — Analytics & financials restricted
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href, item.exact);
          const isHighlighted = (item as any).highlight;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={active ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 rounded-xl h-9 px-3',
                  active && 'bg-sidebar-primary text-sidebar-primary-foreground',
                  !active && isHighlighted && 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left text-sm">{item.label}</span>
                {(item as any).badge === 'pending' && (
                  <span className="ml-auto h-4 w-4 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-sidebar-border space-y-1 px-4 py-4">
        <Link href="/profile">
          <Button
            variant={pathname === '/profile' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3 rounded-xl h-9 px-3',
              pathname === '/profile' && 'bg-sidebar-primary text-sidebar-primary-foreground',
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 rounded-xl h-9 px-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
