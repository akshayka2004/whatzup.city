'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  Home,
  Search,
  MapPin,
  Heart,
  Menu,
  BarChart3,
  TrendingUp,
  Tag,
  Package,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  Users,
  Activity,
  LogOut,
  Settings,
  Folder,
  Share2,
  Lock,
  Flag,
  Database,
  Bell,
  FileText,
  Star,
  GitBranch,
  Image as ImageIcon,
  UserCog,
  CreditCard,
  LifeBuoy,
  CalendarDays,
  Building2,
  Megaphone,
  Grid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';

// ── NAVIGATION TYPES & CONFIGS ────────────────────────────────────────

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<string>('USER');

  useEffect(() => {
    if (user) {
      setActiveRole(user.rbacRole || user.role?.toUpperCase() || 'USER');
    } else {
      setActiveRole('USER');
    }
  }, [user]);

  // Determine Routing Context
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdmin = pathname.startsWith('/admin');
  const isSuperAdmin = pathname.startsWith('/super-admin');

  // Helper to check if a tab is active
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Bottom Tabs Generation. Primary tabs are quick-access; the Menu drawer
  // lists EVERY remaining item from the matching desktop sidebar so nothing is
  // unreachable on mobile. Kept in sync with the *-sidebar.tsx menus.
  const isModerator = activeRole === 'BUSINESS_MODERATOR';
  let primaryTabs: NavItem[] = [];
  let drawerItems: { label: string; href: string; icon: React.ElementType; action?: () => void }[] = [];

  if (isDashboard) {
    if (isModerator) {
      // BUSINESS_MODERATOR — restricted menu (mirrors MODERATOR_MENU)
      primaryTabs = [
        { label: 'Overview', href: '/dashboard', icon: Home },
        { label: 'Bill Queue', href: '/dashboard/moderation', icon: CheckCircle },
        { label: 'Offers', href: '/dashboard/offers', icon: Tag },
        { label: 'Media', href: '/dashboard/media', icon: ImageIcon },
      ];
      drawerItems = [
        { label: 'Review Moderation', href: '/dashboard/reviews', icon: Star },
        { label: 'Customer Reports', href: '/dashboard/customers', icon: Users },
        { label: 'Profile', href: '/profile', icon: UserCog },
      ];
    } else {
      // BUSINESS_OWNER / other business roles (mirrors OWNER_MENU)
      primaryTabs = [
        { label: 'Overview', href: '/dashboard', icon: Home },
        { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
        { label: 'Offers', href: '/dashboard/offers', icon: Tag },
        { label: 'Products', href: '/dashboard/products', icon: Package },
      ];
      drawerItems = [
        { label: 'Bill Moderation', href: '/dashboard/moderation', icon: CheckCircle },
        { label: 'Customers', href: '/dashboard/customers', icon: Users },
        { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
        { label: 'Events', href: '/dashboard/events', icon: CalendarDays },
        { label: 'Reviews', href: '/dashboard/reviews', icon: Star },
        { label: 'Branches', href: '/dashboard/branches', icon: GitBranch },
        { label: 'Media', href: '/dashboard/media', icon: ImageIcon },
        { label: 'Team', href: '/dashboard/team', icon: UserCog },
        { label: 'Subscriptions', href: '/dashboard/subscriptions', icon: CreditCard },
        { label: 'Support', href: '/dashboard/support', icon: LifeBuoy },
        { label: 'Report Issue', href: '/report', icon: Flag },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
        { label: 'Profile', href: '/profile', icon: UserCog },
      ];
    }
  } else if (isAdmin) {
    // mirrors admin-sidebar menuItems
    primaryTabs = [
      { label: 'Dashboard', href: '/admin', icon: BarChart3 },
      { label: 'Registrations', href: '/admin/registrations', icon: UserPlus },
      { label: 'Approvals', href: '/admin/approvals', icon: CheckCircle },
      { label: 'Reports', href: '/admin/reports', icon: AlertTriangle },
    ];

    drawerItems = [
      { label: 'Notices', href: '/admin/notices', icon: Bell },
      { label: 'Audit Logs', href: '/admin/audit', icon: FileText },
      { label: 'Categories', href: '/admin/categories', icon: Building2 },
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { label: 'My Profile', href: '/admin/profile', icon: UserCog },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ];
  } else if (isSuperAdmin) {
    // mirrors super-admin-sidebar menuItems
    primaryTabs = [
      { label: 'Tenants', href: '/super-admin', icon: Users },
      { label: 'Users', href: '/super-admin/registrations', icon: UserPlus },
      { label: 'Offers', href: '/super-admin/offers', icon: Tag },
      { label: 'Health', href: '/super-admin/health', icon: Activity },
    ];

    drawerItems = [
      { label: 'Businesses', href: '/super-admin/businesses', icon: Building2 },
      { label: 'Approvals', href: '/super-admin/approvals', icon: CheckCircle },
      { label: 'Reports', href: '/super-admin/reports', icon: AlertTriangle },
      { label: 'Notices', href: '/super-admin/notices', icon: Bell },
      { label: 'Audit Logs', href: '/super-admin/audit', icon: FileText },
      { label: 'Categories', href: '/super-admin/categories', icon: Folder },
      { label: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
      { label: 'Referrals', href: '/super-admin/referrals', icon: Share2 },
      { label: 'Events', href: '/super-admin/events', icon: CalendarDays },
      { label: 'Security', href: '/super-admin/security', icon: Lock },
      { label: 'Admins', href: '/super-admin/roles', icon: UserCog },
      { label: 'Feature Flags', href: '/super-admin/flags', icon: Flag },
      { label: 'Infrastructure', href: '/super-admin/infrastructure', icon: Database },
      { label: 'My Profile', href: '/super-admin/profile', icon: UserCog },
      { label: 'Settings', href: '/super-admin/settings', icon: Settings },
    ];
  } else {
    // Public User context (mirrors public-sidebar menuItems)
    primaryTabs = [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Search', href: '/search', icon: Search },
      { label: 'Map', href: '/nearby', icon: MapPin },
      { label: 'Saved', href: '/favorites', icon: Heart },
    ];

    drawerItems = [
      { label: 'Browse', href: '/category', icon: Grid },
      { label: 'Offers', href: '/offers', icon: Tag },
      { label: 'Events', href: '/events', icon: CalendarDays },
      { label: 'Announcements', href: '/government', icon: FileText },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Report Issue', href: '/report', icon: Flag },
      ...(user
        ? [
            { label: 'Profile Settings', href: '/profile', icon: Settings },
            { label: 'Help & Support', href: '/support', icon: LifeBuoy },
          ]
        : [
            { label: 'Sign In / Register', href: '/login', icon: UserPlus },
            { label: 'Help & Support', href: '/support', icon: LifeBuoy },
          ]),
    ];
  }

  const handleDrawerItemClick = (href: string, action?: () => void) => {
    setIsOpen(false);
    if (action) {
      action();
    } else {
      router.push(href);
    }
  };

  const handleSignOutClick = async () => {
    setIsOpen(false);
    await signOut();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-md px-2 py-1 flex items-center justify-around z-50 h-16 pb-safe">
      {primaryTabs.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.label} href={item.href} className="flex-1">
            <button
              className={`w-full flex flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </button>
          </Link>
        );
      })}

      {/* Menu Trigger Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span>Menu</span>
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-[32px] max-h-[85vh] overflow-y-auto pb-10 bg-card border-t border-border text-foreground z-50"
        >
          <SheetHeader className="text-left pb-4 border-b border-border">
            <SheetTitle className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <Menu className="h-5 w-5 text-primary" />
              Navigation Menu
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {isDashboard
                ? 'Manage your business operations and listings'
                : isAdmin
                ? 'System approvals and platform moderation'
                : isSuperAdmin
                ? 'Tenants & multi-tenant cluster management'
                : 'Browse city offers and manage your profile'}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 py-6">
            {drawerItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => handleDrawerItemClick(item.href, item.action)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-secondary/40 border border-border hover:bg-secondary/80 text-foreground transition-all text-left text-xs font-semibold cursor-pointer h-12"
                >
                  <ItemIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {/* Logout/Sign Out Option inside Drawer */}
            {user && (
              <button
                onClick={handleSignOutClick}
                className="col-span-2 flex items-center gap-3 px-4 py-3 rounded-2xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-all text-left text-xs font-semibold text-destructive cursor-pointer h-12 mt-2"
              >
                <LogOut className="h-4 w-4 shrink-0 text-destructive" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

