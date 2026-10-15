'use client';

import type { ReactNode } from 'react';
import { Header } from '@/components/common/header';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { useNavArea, useNavSpec } from '@/hooks/use-nav';
import type { NavArea } from '@/lib/nav/config';
import { cn } from '@/lib/utils';

/**
 * The one app frame: sidebar (desktop) · header · scrolling main · bottom nav (phones).
 * Every area layout (public, business, staff, admin, super-admin) renders through this.
 */
export function AppShell({
  area,
  children,
  before,
  banner,
  wide = false,
}: {
  area: NavArea;
  children: ReactNode;
  /** Overlays mounted inside the frame (tours, gates, paywalls). */
  before?: ReactNode;
  /** Full-width strip under the header (trial reminders, notices). */
  banner?: ReactNode;
  /** Full-width content (data-heavy admin pages); default caps at 1280px. */
  wide?: boolean;
}) {
  const navArea = useNavArea(area);
  const spec = useNavSpec(navArea);

  return (
    <div className="flex h-dvh w-full bg-background">
      {before}
      {/* Sidebar vs bottom bar is decided by CSS, not useIsMobile(): the server
          can't know the viewport, and a JS switch painted the desktop sidebar on
          phones until hydration, then shifted the whole page. */}
      <div className="hidden print:hidden md:flex">
        <AppSidebar spec={spec} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="print:hidden">
          <Header />
        </div>
        {banner && <div className="print:hidden">{banner}</div>}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto focus:outline-none">
          <div
            className={cn(
              'mx-auto w-full px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8',
              wide ? 'max-w-[1600px]' : 'max-w-7xl',
              'pb-28 md:pb-10',
            )}
          >
            {children}
          </div>
        </main>
      </div>

      <div className="print:hidden md:hidden">
        <MobileNav area={navArea} />
      </div>
    </div>
  );
}

/** Frame-shaped placeholder while auth resolves, so the page doesn't flash a full-screen spinner. */
export function AppShellSkeleton() {
  return (
    <div className="flex h-dvh w-full bg-background" aria-busy="true" aria-label="Loading">
      <div className="hidden w-64 shrink-0 flex-col gap-2 border-r border-sidebar-border/80 bg-sidebar p-4 md:flex">
        <div className="ui-skeleton mb-4 h-8 w-32" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="ui-skeleton h-9 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-16 border-b border-border/80 bg-card" />
        <div className="mx-auto w-full max-w-7xl space-y-4 px-4 pt-8 sm:px-6 lg:px-8">
          <div className="ui-skeleton h-8 w-56" />
          <div className="ui-skeleton h-4 w-80 max-w-full" />
          <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ui-skeleton h-28 rounded-card" />
            ))}
          </div>
          <div className="ui-skeleton h-72 rounded-card" />
        </div>
      </div>
    </div>
  );
}
