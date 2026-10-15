'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, LogOut, PanelLeftClose, PanelLeftOpen, Store, X } from 'lucide-react';
import { BrandLogo } from '@/components/common/brand-logo';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import { isItemActive, type NavItem, type NavSpec } from '@/lib/nav/config';

const COLLAPSE_KEY = 'sidebar_collapsed_v1';
const PROMO_DISMISSED_KEY = 'sidebar_promo_dismissed';

function NavRow({
  item,
  active,
  collapsed,
  label,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  label: string;
}) {
  const Icon = item.icon;
  const router = useRouter();
  const warm = () => router.prefetch(item.href);
  return (
    <Link
      href={item.href}
      // ~20 always-visible links each prefetched their route on load (117-142
      // requests per desktop page). Prefetch on intent instead: hover or focus.
      prefetch={false}
      onMouseEnter={warm}
      onFocus={warm}
      aria-current={active ? 'page' : undefined}
      data-tour={item.tour}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-150',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-card text-foreground shadow-e1 ring-1 ring-border/60'
          : item.highlight
            ? 'text-warning-soft-foreground hover:bg-warning-soft'
            : 'text-muted-foreground hover:bg-foreground/[0.045] hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-colors',
          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
          item.highlight && !active && 'text-warning-soft-foreground',
        )}
        aria-hidden
      />
      <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
    </Link>
  );
}

/** Desktop sidebar for every area, driven by lib/nav/config. Collapses to an icon rail. */
export function AppSidebar({ spec }: { spec: NavSpec }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { tl } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(true);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
      setPromoDismissed(localStorage.getItem(PROMO_DISMISSED_KEY) === '1');
    } catch {
      setPromoDismissed(false);
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  };

  const dismissPromo = () => {
    setPromoDismissed(true);
    try {
      localStorage.setItem(PROMO_DISMISSED_KEY, '1');
    } catch {
      /* storage unavailable */
    }
  };

  const showPromo = spec.area === 'public' && !promoDismissed && !collapsed;

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out-quint motion-reduce:transition-none',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
      aria-label="Main navigation"
    >
      {/* Workspace */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-2.5',
          collapsed ? 'justify-center px-2' : 'px-5',
        )}
      >
        <Link
          href={spec.home}
          className="flex min-w-0 items-center gap-2.5"
          title={collapsed ? spec.title : undefined}
        >
          <BrandLogo alt="Whtzup.city" className="h-8 w-auto shrink-0 object-contain" />
          {!collapsed && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                {spec.title}
              </span>
              {spec.subtitle && (
                <span className="truncate text-caption text-muted-foreground">{spec.subtitle}</span>
              )}
            </span>
          )}
        </Link>
      </div>

      <nav className={cn('flex-1 overflow-y-auto pb-4 pt-2', collapsed ? 'px-3' : 'px-3')}>
        {spec.groups.map((group, gi) => (
          <div key={group.title ?? gi} className={cn(gi > 0 && 'mt-5')}>
            {group.title &&
              (collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" aria-hidden />
              ) : (
                <p className="px-3 pb-1.5 text-overline text-subtle-foreground">
                  {tl(group.title)}
                </p>
              ))}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  label={tl(item.label)}
                  active={isItemActive(pathname, item)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {showPromo && (
        <div className="px-3 pb-3 [@media(max-height:900px)]:hidden">
          <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-brand-soft p-4 pr-11">
            <Link href="/register" className="block">
              <span className="mb-2 flex size-9 items-center justify-center rounded-xl bg-card text-primary shadow-e1">
                <Store className="size-[18px]" />
              </span>
              <span className="block text-sm font-semibold leading-tight text-foreground">
                List your business
              </span>
              <span className="mt-1 block text-caption text-muted-foreground">
                Reach customers across your city.
              </span>
              <span className="mt-2.5 inline-flex items-center gap-1 text-caption font-semibold text-brand-soft-foreground">
                Get started <ArrowRight className="size-3.5" />
              </span>
            </Link>
            <button
              type="button"
              onClick={dismissPromo}
              aria-label="Dismiss list your business"
              className="absolute right-1.5 top-1.5 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-0.5 border-t border-sidebar-border/80 px-3 py-3">
        {spec.footer.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            label={tl(item.label)}
            active={isItemActive(pathname, item)}
            collapsed={collapsed}
          />
        ))}
        {user && (
          <button
            type="button"
            onClick={() => signOut()}
            title={collapsed ? 'Sign out' : undefined}
            className={cn(
              'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger-soft-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <LogOut className="size-[18px] shrink-0" aria-hidden />
            <span className={cn(collapsed && 'sr-only')}>Sign out</span>
          </button>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-subtle-foreground transition-colors hover:bg-foreground/[0.045] hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" />
          ) : (
            <PanelLeftClose className="size-[18px]" />
          )}
          <span className={cn(collapsed && 'sr-only')}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
