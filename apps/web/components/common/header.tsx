'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Bell, BellOff, CheckCheck, CircleUserRound, LogIn, LogOut, Search } from 'lucide-react';
import { BrandLogo } from '@/components/common/brand-logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { OutletSwitcher } from '@/components/business/outlet-switcher';
import { apiService } from '@/lib/services/api-service';
import { LOCALES } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/provider';
import { getRoleLabel } from '@/lib/rbac';
import { cn } from '@/lib/utils';

type Notif = {
  id: string;
  title?: string;
  type?: string;
  body?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

function profileHref(role?: string) {
  switch (role) {
    case 'business':
      return '/dashboard/settings';
    case 'admin':
      return '/admin/profile';
    case 'super-admin':
      return '/super-admin/profile';
    case 'government':
      return '/government/dashboard';
    default:
      return '/profile';
  }
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const openPalette = () => window.dispatchEvent(new Event('open-command-palette'));

  // ── Notifications ─────────────────────────────────────────────
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (!user) return;
    apiService
      .get<{ unreadCount: number }>('/v1/notifications/unread-count')
      .then((r) => r.data && setUnread(r.data.unreadCount))
      .catch(() => {});
  }, [user]);

  const openNotifs = async () => {
    setNotifOpen(true);
    if (fetched.current) return;
    fetched.current = true;
    const r = await apiService.get<any>('/v1/notifications?limit=20');
    if (r.data) setNotifs(Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.items ?? []));
  };

  const markAllRead = async () => {
    await apiService.patch('/v1/notifications/mark-all-read', {});
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markOneRead = async (id: string) => {
    await apiService.patch(`/v1/notifications/${id}/read`, {});
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  };

  const roleLabel = user ? getRoleLabel(user.rbacRole || user.role) : '';

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-card/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-card/70 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center md:hidden" aria-label="Whtzup.city home">
        <BrandLogo alt="Whtzup.city" className="h-8 w-auto object-contain" />
      </Link>

      {/* ⌘K command palette trigger */}
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search businesses, offers, events and services"
        className="group hidden h-10 w-full max-w-md items-center gap-2.5 rounded-full border border-border bg-background/70 px-4 text-left text-sm text-muted-foreground transition-[border-color,background-color] hover:border-border-strong hover:bg-background md:flex"
      >
        <Search
          className="size-4 shrink-0 transition-colors group-hover:text-foreground"
          aria-hidden
        />
        <span className="flex-1 truncate">Search everything…</span>
        <kbd className="hidden rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-caption text-muted-foreground lg:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={openPalette}
          aria-label="Search"
          className="md:hidden"
        >
          <Search className="size-5" />
        </Button>

        {user?.role === 'business' && (
          <>
            <div className="hidden sm:block">
              <OutletSwitcher />
            </div>
            <div className="sm:hidden">
              <OutletSwitcher compact />
            </div>
          </>
        )}

        {/* Notifications */}
        {user ? (
          <DropdownMenu
            open={notifOpen}
            onOpenChange={(o) => (o ? openNotifs() : setNotifOpen(false))}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              >
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-caption font-bold leading-none text-primary-foreground ring-2 ring-card">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-0"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <DropdownMenuLabel className="p-0 text-sm font-semibold">
                  Notifications
                  {unread > 0 && (
                    <span className="ml-1.5 text-caption font-medium text-brand-soft-foreground">
                      {unread} new
                    </span>
                  )}
                </DropdownMenuLabel>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-caption text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <BellOff className="size-7 opacity-40" />
                    <p className="text-caption">You are all caught up</p>
                  </div>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => !n.isRead && markOneRead(n.id)}
                      className={cn(
                        'flex w-full items-start gap-2.5 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-secondary/60',
                        n.isRead && 'opacity-60',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          n.isRead ? 'bg-transparent' : 'bg-primary',
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-foreground">
                          {n.title || n.type || 'Notification'}
                        </span>
                        {(n.body || n.message) && (
                          <span className="mt-0.5 line-clamp-2 block break-words text-caption text-muted-foreground">
                            {n.body || n.message}
                          </span>
                        )}
                        {n.createdAt && (
                          <span className="mt-1 block text-caption text-subtle-foreground">
                            {new Date(n.createdAt).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Kolkata',
                            })}
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <Link
                href="/notifications"
                className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-secondary/60"
              >
                View all
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {user ? (
              <button
                type="button"
                aria-label="Account menu"
                className="ml-1 flex size-9 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-soft-foreground ring-1 ring-primary/15 transition-shadow hover:ring-primary/40"
              >
                {initials(user.name || user.email || '?')}
              </button>
            ) : (
              <Button variant="ghost" size="icon" aria-label="Account menu">
                <CircleUserRound className="size-5" />
              </Button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {user ? (
              <>
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="truncate text-caption text-muted-foreground">{user.email}</p>
                  {roleLabel && (
                    <span className="mt-1.5 inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-caption font-medium text-brand-soft-foreground">
                      {roleLabel}
                    </span>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={profileHref(user.role)}>Profile &amp; settings</Link>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild>
                <Link href="/login" className="font-semibold text-primary">
                  <LogIn /> Sign in
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-overline text-subtle-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={mounted ? (theme ?? 'light') : 'light'}
              onValueChange={setTheme}
            >
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">Match device</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-overline text-subtle-foreground">
              {t('common.language')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(v) => setLocale(v as typeof locale)}
            >
              {LOCALES.map((l) => (
                <DropdownMenuRadioItem key={l.code} value={l.code}>
                  <span lang={l.code}>{l.native}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            {user && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {!user && (
          <Button asChild size="sm" className="ml-1">
            <Link href="/login">
              <LogIn /> Sign in
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
