'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useNavArea, useNavSpec } from '@/hooks/use-nav';
import { useI18n } from '@/lib/i18n/provider';
import { allItems, isItemActive, type NavArea } from '@/lib/nav/config';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const SHEET_COPY: Record<NavArea, string> = {
  public: 'Browse your city and manage your account',
  business: 'Run your business',
  staff: 'Platform data-entry workspace',
  admin: 'Approvals, payments and moderation',
  'super-admin': 'Platform control',
  civic: 'Publish to your community',
  government: 'Official notices',
};

/**
 * Phone navigation: four primary tabs + "More". The sheet lists every other item from the
 * same nav config as the desktop sidebar, grouped the same way, so the two can never drift.
 */
export function MobileNav({ area: layoutArea }: { area?: NavArea }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { t, tl } = useI18n();
  const [open, setOpen] = useState(false);
  const area = useNavArea(layoutArea);
  const spec = useNavSpec(area);

  const items = allItems(spec);
  const tabs = spec.mobileTabs
    .map((href) => items.find((i) => i.href === href))
    .filter(Boolean) as typeof items;
  const tabHrefs = new Set(spec.mobileTabs);
  const moreActive =
    !tabs.some((tab) => isItemActive(pathname, tab)) &&
    items.some((i) => isItemActive(pathname, i));

  const sheetGroups = [
    ...spec.groups.map((g) => ({
      title: g.title,
      items: g.items.filter((i) => !tabHrefs.has(i.href)),
    })),
    { title: undefined, items: spec.footer.filter((i) => !tabHrefs.has(i.href)) },
  ].filter((g) => g.items.length);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex h-16 items-stretch border-t border-border/80 bg-card/92 px-1.5 pb-safe backdrop-blur-md supports-[backdrop-filter]:bg-card/80"
    >
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(pathname, item);
        const label = tl(spec.mobileLabels?.[item.href] ?? item.label);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.mobileTour}
            aria-current={active ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 active:scale-95 motion-reduce:active:scale-100"
          >
            <span
              className={cn(
                'flex h-7 w-14 items-center justify-center rounded-full transition-[background-color] duration-200',
                active ? 'bg-brand-soft text-brand-soft-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            <span
              className={cn(
                'max-w-full truncate text-caption',
                active ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}

      <Sheet open={open} onOpenChange={setOpen}>
        <button
          type="button"
          data-tour="mnav-menu"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 active:scale-95 motion-reduce:active:scale-100"
        >
          <span
            className={cn(
              'flex h-7 w-14 items-center justify-center rounded-full',
              moreActive ? 'bg-brand-soft text-brand-soft-foreground' : 'text-muted-foreground',
            )}
          >
            <Menu className="size-5" aria-hidden />
          </span>
          <span
            className={cn(
              'text-caption',
              moreActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            {t('nav.menu')}
          </span>
        </button>

        <SheetContent side="bottom" className="overflow-y-auto px-4 pb-8 pt-2">
          <SheetHeader className="px-1 pb-2 text-left">
            <SheetTitle className="text-heading">{spec.title}</SheetTitle>
            <SheetDescription>{SHEET_COPY[spec.area]}</SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {sheetGroups.map((group, gi) => (
              <div key={group.title ?? `g${gi}`}>
                {group.title && (
                  <p className="px-1 pb-2 text-overline text-subtle-foreground">
                    {tl(group.title)}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex h-12 items-center gap-2.5 rounded-xl border px-3 text-sm font-medium transition-colors active:scale-[0.98]',
                          active
                            ? 'border-primary/25 bg-brand-soft text-brand-soft-foreground'
                            : 'border-border/70 bg-card text-foreground hover:bg-secondary',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-[18px] shrink-0',
                            active ? 'text-primary' : 'text-muted-foreground',
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{tl(item.label)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {user && (
              <button
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await signOut();
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-danger-soft text-sm font-semibold text-danger-soft-foreground active:scale-[0.98]"
              >
                <LogOut className="size-[18px]" aria-hidden />
                {t('nav.signOut')}
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
