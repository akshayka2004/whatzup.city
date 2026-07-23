'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  Search,
  Bell,
  Settings,
  LogIn,
  Sparkles,
  CheckCheck,
  BellOff,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import Link from 'next/link';

export function Header() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const openPalette = () =>
    typeof window !== 'undefined' && window.dispatchEvent(new Event('open-command-palette'));

  // ── Notifications ─────────────────────────────────────────────
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifFetched = useRef(false);

  // Fetch unread count on mount (authenticated users only)
  useEffect(() => {
    if (!user) return;
    apiService.get<{ unreadCount: number }>('/v1/notifications/unread-count')
      .then((r) => { if (r.data) setUnreadCount(r.data.unreadCount); })
      .catch(() => {});
  }, [user]);

  const openNotifDropdown = async () => {
    setNotifOpen(true);
    if (notifFetched.current) return;
    notifFetched.current = true;
    const r = await apiService.get<any>('/v1/notifications?limit=20');
    if (r.data) {
      const list = Array.isArray(r.data) ? r.data : r.data?.data ?? r.data?.items ?? [];
      setNotifs(list);
    }
  };

  const markAllRead = async () => {
    await apiService.patch('/v1/notifications/mark-all-read', {});
    setUnreadCount(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markOneRead = async (id: string) => {
    await apiService.patch(`/v1/notifications/${id}/read`, {});
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const roleColors: Record<string, string> = {
    user: 'bg-blue-600/20 text-blue-400 border-blue-500/20',
    business: 'bg-purple-600/20 text-purple-400 border-purple-500/20',
    admin: 'bg-amber-600/20 text-amber-400 border-amber-500/20',
    'super-admin': 'bg-rose-600/20 text-rose-400 border-rose-500/20',
    government: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20',
  };

  const roleLabels: Record<string, string> = {
    user: 'Public User',
    business: 'Business Owner',
    admin: 'Admin Moderator',
    'super-admin': 'Super Admin',
    government: 'Government',
  };

  // Profile destination based on role
  const getProfileHref = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'business': return '/dashboard/settings';
      case 'admin': return '/admin';
      case 'super-admin': return '/super-admin/tenants';
      case 'government': return '/government/dashboard';
      default: return '/profile';
    }
  };
  const profileHref = getProfileHref();

  return (
    <header className="border-b border-border bg-card px-4 py-3 md:px-6 md:py-4 shadow-sm flex items-center justify-between h-16">
      {/* Mobile Logo Fallback */}
      <div className="flex items-center gap-2 md:hidden">
        <Link href="/">
          <img src="/logo.png" alt="Whtzup.city Logo" className="h-8 w-auto object-contain cursor-pointer" />
        </Link>
      </div>

      {/* Desktop command-bar trigger — opens the ⌘K palette (Spotlight) */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-lg">
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search businesses, offers, events, and services"
          className="group flex h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground cursor-pointer"
        >
          <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
          <span className="flex-1">Search everything…</span>
          <kbd className="hidden items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold lg:inline-flex">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile search trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={openPalette}
          aria-label="Search"
          className="md:hidden rounded-lg h-11 w-11 flex items-center justify-center"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Active Role Indicator */}
        {user && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${roleColors[user.role]}`}
          >
            <Sparkles className="h-3 w-3" />
            {roleLabels[user.role]}
          </div>
        )}

        {/* Theme toggle — mounted guard prevents hydration mismatch */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg h-11 w-11 md:h-9 md:w-9 flex items-center justify-center cursor-pointer"
          suppressHydrationWarning
        >
          {mounted && resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        {user ? (
          <DropdownMenu open={notifOpen} onOpenChange={(open) => { if (open) openNotifDropdown(); else setNotifOpen(false); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-lg h-11 w-11 md:h-9 md:w-9 flex items-center justify-center cursor-pointer">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 md:top-0.5 md:right-0.5 h-4 w-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl border-border bg-card/95 backdrop-blur-xl p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <DropdownMenuLabel className="font-semibold text-sm text-foreground p-0">
                  Notifications {unreadCount > 0 && <span className="ml-1.5 text-xs text-rose-400">({unreadCount} new)</span>}
                </DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <BellOff className="h-7 w-7 opacity-30" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.isRead) markOneRead(n.id); }}
                      className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer ${n.isRead ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                        <div className={`flex-1 ${n.isRead ? 'ml-3.5' : ''}`}>
                          <p className="text-xs font-semibold text-foreground leading-snug">{n.title || n.type || 'Notification'}</p>
                          {(n.body || n.message) && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.body || n.message}</p>
                          )}
                          {n.createdAt && (
                            <p className="text-[10px] text-muted-foreground/50 mt-1">
                              {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon" className="rounded-lg h-11 w-11 md:h-9 md:w-9 flex items-center justify-center cursor-pointer" onClick={() => router.push('/login')}>
            <Bell className="h-5 w-5" />
          </Button>
        )}

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg h-11 w-11 md:h-9 md:w-9 flex items-center justify-center cursor-pointer">
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-xl border-border bg-card/95 backdrop-blur-xl"
          >
            <DropdownMenuLabel className="font-semibold text-xs text-muted-foreground">
              Account Actions
            </DropdownMenuLabel>
            {user ? (
              <>
                <Link href={profileHref}>
                  <DropdownMenuItem className="cursor-pointer rounded-lg">
                    Profile Settings
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive cursor-pointer rounded-lg"
                >
                  Sign Out
                </DropdownMenuItem>
              </>
            ) : (
              <Link href="/login">
                <DropdownMenuItem className="text-primary font-semibold cursor-pointer rounded-lg gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </DropdownMenuItem>
              </Link>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User avatar */}
        {user ? (
          <Link href={profileHref}>
            <div className="h-10 w-10 md:h-9 md:w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md cursor-pointer hover:opacity-80 transition-opacity">
              {getInitials(user.name)}
            </div>
          </Link>
        ) : (
          <Link href="/login">
            <Button
              size="sm"
              className="gap-2 font-semibold shadow-sm h-10 px-4 md:h-9 md:px-3"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
