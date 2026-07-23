'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CheckCircle,
  FileText,
  Shield,
  AlertTriangle,
  BarChart3,
  Bell,
  LogOut,
  Settings,
  Building2,
  CreditCard,
  UserPlus,
  User,
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
    title: 'Operate',
    items: [
      { label: 'Dashboard', href: '/admin', icon: BarChart3, exact: true },
      { label: 'Registrations', href: '/admin/registrations', icon: UserPlus },
      { label: 'Approvals', href: '/admin/approvals', icon: CheckCircle },
      { label: 'Reports', href: '/admin/reports', icon: AlertTriangle },
      { label: 'Notices', href: '/admin/notices', icon: Bell },
    ],
  },
  {
    title: 'Manage',
    items: [
      { label: 'Categories', href: '/admin/categories', icon: Building2 },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'Audit Logs', href: '/admin/audit', icon: FileText },
      { label: 'My Profile', href: '/admin/profile', icon: User },
    ],
  },
];

export function AdminSidebar() {
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
        <Link href="/admin" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Whtzup.city" className="h-9 w-auto object-contain" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-foreground">Admin Panel</span>
            <span className="text-[11px] text-muted-foreground">Master Admin</span>
          </span>
        </Link>
      </div>

      {/* Info banner */}
      <div className="mx-3 mb-2 rounded-xl border border-info/20 bg-info/10 px-3 py-2">
        <p className="flex items-center gap-1 text-[10px] font-medium text-info">
          <Shield className="h-3 w-3 shrink-0" />
          Bill verification is managed by businesses
        </p>
      </div>

      {/* Grouped nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-6">
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
        <NavRow item={{ label: 'Settings', href: '/admin/settings', icon: Settings }} />
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
