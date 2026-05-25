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
  Users,
  Building2,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ── MASTER_ADMIN navigation
// Bill verification removed — moved to business dashboard
// Added: Fraud Escalations (read-only monitoring)
// ─────────────────────────────────────────────────────────────

const menuItems = [
  { label: 'Dashboard', href: '/admin', icon: BarChart3, exact: true },
  { label: 'Approvals', href: '/admin/approvals', icon: CheckCircle,
    tooltip: 'Business onboarding verification' },
  { label: 'Reports', href: '/admin/reports', icon: AlertTriangle },
  { label: 'Notices', href: '/admin/notices', icon: Bell },
  { label: 'Audit Logs', href: '/admin/audit', icon: FileText },
  { label: 'Categories', href: '/admin/categories', icon: Building2 },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
];
// Note: Moderation (/admin/moderation) and Fraud Escalations (/admin/fraud-escalations)
// pages are kept but hidden from navigation until activation criteria are met.

export function AdminSidebar() {
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
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-4">
        <img src="/logo.png" alt="Whtzup.city Logo" className="h-16 w-auto object-contain" />
        <div>
          <span className="text-base font-semibold text-sidebar-primary block leading-tight">
            Admin Panel
          </span>
          <span className="text-xs text-muted-foreground">Master Admin</span>
        </div>
      </div>

      {/* Info banner — bill verification removed */}
      <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <p className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Bill verification is now managed by businesses
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href, (item as any).exact);
          const isHighlighted = (item as any).highlight;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={active ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 rounded-xl h-9 px-3',
                  active && 'bg-sidebar-primary text-sidebar-primary-foreground',
                  !active && isHighlighted && 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left text-sm">{item.label}</span>
                {isHighlighted && !active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-sidebar-border space-y-1 px-4 py-4">
        <Link href="/admin/settings">
          <Button
            variant={pathname === '/admin/settings' ? 'default' : 'ghost'}
            className={cn(
              'w-full justify-start gap-3 rounded-xl h-9 px-3',
              pathname === '/admin/settings' && 'bg-sidebar-primary text-sidebar-primary-foreground',
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
