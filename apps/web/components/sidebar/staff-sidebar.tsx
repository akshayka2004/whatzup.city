'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  Clapperboard,
  Tag,
  Megaphone,
  Building2,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const ITEMS: Item[] = [
  { label: 'Overview', href: '/staff', icon: LayoutDashboard, exact: true },
  { label: 'Events', href: '/staff/events', icon: CalendarDays },
  { label: 'Movies', href: '/staff/movies', icon: Clapperboard },
  { label: 'Platform Offers', href: '/staff/platform-offers', icon: Tag },
  { label: 'Announcements', href: '/staff/announcements', icon: Megaphone },
  { label: 'Businesses', href: '/staff/businesses', icon: Building2 },
];

export function StaffSidebar() {
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

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5">
        <Link href="/staff" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Whtzup.city" className="h-9 w-auto object-contain" />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-foreground">Platform Staff</span>
            <span className="text-[11px] text-muted-foreground">Data entry</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
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
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
