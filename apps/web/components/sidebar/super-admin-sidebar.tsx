'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  Lock,
  Activity,
  Settings,
  Flag,
  Database,
  LogOut,
  Folder,
  Tag,
  Share2,
  AlertTriangle,
  UserPlus,
  CheckCircle,
  Bell,
  FileText,
  CreditCard,
  UserCog,
  Building2,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Overview',
    items: [{ label: 'Tenants', href: '/super-admin', icon: Users, exact: true }],
  },
  {
    title: 'People',
    items: [
      { label: 'Users', href: '/super-admin/registrations', icon: UserPlus },
      { label: 'Manage Users', href: '/super-admin/users', icon: UserCog },
      { label: 'Admins', href: '/super-admin/roles', icon: Lock },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Businesses', href: '/super-admin/businesses', icon: Building2 },
      { label: 'Approvals', href: '/super-admin/approvals', icon: CheckCircle },
      { label: 'Categories', href: '/super-admin/categories', icon: Folder },
      { label: 'Platform Offers', href: '/super-admin/offers', icon: Tag },
      { label: 'Events', href: '/super-admin/events', icon: CalendarDays },
      { label: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
    ],
  },
  {
    title: 'Moderation',
    items: [
      { label: 'Reports', href: '/super-admin/reports', icon: AlertTriangle },
      { label: 'Notices', href: '/super-admin/notices', icon: Bell },
      { label: 'Audit Logs', href: '/super-admin/audit', icon: FileText },
      { label: 'Referrals', href: '/super-admin/referrals', icon: Share2 },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Security', href: '/super-admin/security', icon: Lock },
      { label: 'System Health', href: '/super-admin/health', icon: Activity },
      { label: 'Feature Flags', href: '/super-admin/flags', icon: Flag },
      { label: 'Infrastructure', href: '/super-admin/infrastructure', icon: Database },
    ],
  },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      ['accessToken', 'refreshToken', 'user', 'user_session'].forEach((k) =>
        localStorage.removeItem(k),
      );
    }
    router.push('/login');
  };

  const NavRow = ({ item }: { item: Item }) => {
    const Icon = item.icon;
    const active = isActive(item.href, item.exact);
    return (
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
        )}
      >
        <Icon
          className={cn(
            'h-[18px] w-[18px] shrink-0 transition-colors',
            active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
          )}
        />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="px-5 py-5">
        <Link href="/super-admin" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Whtzup.city" className="h-9 w-auto object-contain" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-foreground">Super Admin</span>
            <span className="text-[11px] text-muted-foreground">Platform control</span>
          </span>
        </Link>
      </div>

      {/* Grouped nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavRow key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="space-y-1 border-t border-sidebar-border px-3 py-3">
        <NavRow item={{ label: 'My Profile', href: '/super-admin/profile', icon: UserCog }} />
        <NavRow item={{ label: 'Settings', href: '/super-admin/settings', icon: Settings }} />
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
