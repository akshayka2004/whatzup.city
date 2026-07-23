'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MapPin,
  Search,
  Grid,
  Ticket,
  FileText,
  Heart,
  Bell,
  Settings,
  LogOut,
  Flag,
  Calendar,
  Store,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Discover',
    items: [
      { label: 'Browse', href: '/category', icon: Grid },
      { label: 'Nearby', href: '/nearby', icon: MapPin },
      { label: 'Search', href: '/search', icon: Search },
      { label: 'Offers', href: '/offers', icon: Ticket },
      { label: 'Events', href: '/events', icon: Calendar },
      { label: 'Announcements', href: '/government', icon: FileText },
    ],
  },
  {
    title: 'Personal',
    items: [
      { label: 'Favorites', href: '/favorites', icon: Heart },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Report Issue', href: '/report', icon: Flag },
    ],
  },
];

export function PublicSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      ['accessToken', 'refreshToken', 'user', 'user_session'].forEach((k) =>
        localStorage.removeItem(k),
      );
    }
    router.push('/login');
  };

  const NavLink = ({ item }: { item: Item }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
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
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <img src="/logo.png" alt="Whtzup.city" className="h-9 w-auto object-contain" />
        <span className="text-lg font-semibold tracking-tight text-foreground">whtzup.city</span>
      </Link>

      {/* Grouped nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-6">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Promo card */}
      <div className="px-3 pb-3">
        <Link
          href="/register"
          className="block overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Store className="h-[18px] w-[18px]" />
          </div>
          <p className="text-sm font-semibold leading-tight">List your business</p>
          <p className="mt-1 text-xs leading-snug text-primary-foreground/80">
            Reach citizens across your city.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      {/* Footer actions */}
      <div className="space-y-1 border-t border-sidebar-border px-3 py-3">
        <NavLink item={{ label: 'Settings', href: '/profile', icon: Settings }} />
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
