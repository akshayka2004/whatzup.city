'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Lock, Activity, Settings, Flag, Database, LogOut, Folder, Tag, Share2, AlertTriangle, UserPlus, CheckCircle, Bell, FileText, CreditCard, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const menuItems = [
  { label: 'Tenants', href: '/super-admin', icon: Users, exact: true },
  { label: 'Users', href: '/super-admin/registrations', icon: UserPlus },
  { label: 'Approvals', href: '/super-admin/approvals', icon: CheckCircle },
  { label: 'Reports', href: '/super-admin/reports', icon: AlertTriangle },
  { label: 'Notices', href: '/super-admin/notices', icon: Bell },
  { label: 'Audit Logs', href: '/super-admin/audit', icon: FileText },
  { label: 'Categories', href: '/super-admin/categories', icon: Folder },
  { label: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
  { label: 'Referrals', href: '/super-admin/referrals', icon: Share2 },
  { label: 'Platform Offers', href: '/super-admin/offers', icon: Tag },
  { label: 'Security', href: '/super-admin/security', icon: Lock },
  { label: 'System Health', href: '/super-admin/health', icon: Activity },
  { label: 'Admins', href: '/super-admin/roles', icon: UserCog },
  { label: 'Feature Flags', href: '/super-admin/flags', icon: Flag },
  { label: 'Infrastructure', href: '/super-admin/infrastructure', icon: Database },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <aside className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-4">
        <img src="/logo.png" alt="Whtzup.city Logo" className="h-16 w-auto object-contain" />
        <span className="text-xl font-semibold text-sidebar-primary">Super Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href, (item as any).exact);
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
        <Link href="/super-admin/profile">
          <Button
            variant={pathname === '/super-admin/profile' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3 rounded-xl',
              pathname === '/super-admin/profile' &&
                'bg-sidebar-primary text-sidebar-primary-foreground',
            )}
          >
            <UserCog className="h-5 w-5" />
            <span>My Profile</span>
          </Button>
        </Link>
        <Link href="/super-admin/settings">
          <Button
            variant={pathname === '/super-admin/settings' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3 rounded-xl',
              pathname === '/super-admin/settings' &&
                'bg-sidebar-primary text-sidebar-primary-foreground',
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
