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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const menuItems = [
  { label: 'Browse', href: '/category', icon: Grid },
  { label: 'Nearby', href: '/nearby', icon: MapPin },
  { label: 'Search', href: '/search', icon: Search },
  { label: 'Offers', href: '/offers', icon: Ticket },
  { label: 'Announcements', href: '/government', icon: FileText },
  { label: 'Favorites', href: '/favorites', icon: Heart },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Report Issue', href: '/report', icon: Flag },
];

export function PublicSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isItemActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleSignOut = () => {
    // Clear auth tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('user_session');
    }
    router.push('/login');
  };

  return (
    <aside className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-4">
        <img src="/logo.png" alt="Whtzup.city Logo" className="h-16 w-auto object-contain" />
        <span className="text-xl font-semibold text-sidebar-primary tracking-tight">whtzup.city</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={active ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 rounded-xl',
                  active && 'bg-sidebar-primary text-sidebar-primary-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-sidebar-border space-y-2 px-4 py-4">
        <Link href="/profile">
          <Button
            variant={pathname === '/profile' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3 rounded-xl',
              pathname === '/profile' && 'bg-sidebar-primary text-sidebar-primary-foreground',
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
