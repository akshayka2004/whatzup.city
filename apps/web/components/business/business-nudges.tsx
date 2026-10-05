'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, X } from 'lucide-react';
import { hasOperatingHours } from '@saas/types';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/services/api-service';
import { RENEWAL_REMINDER_DAYS } from '@/lib/subscription-plans';
import { useOwnerBusiness, type OwnerBusiness } from '@/hooks/use-owner-business';
import { MenuPhotoPrompt } from '@/components/business/menu-photo-prompt';
import { BrandConversionPrompt } from '@/components/business/brand-conversion-prompt';

type NudgeKey = 'menu' | 'hours' | 'brand';

const SNOOZE_DAYS = 7;
const choiceKey = (id: string) => `biz_nudge_choice_${id}`;
// The menu prompt owns and writes its own dismiss key — keep it in sync with menu-photo-prompt.tsx.
const dismissKey = (k: NudgeKey, id: string) =>
  k === 'menu' ? `menu_prompt_dismissed_${id}` : `${k}_nudge_dismissed_${id}`;

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null; // storage blocked — behave as "nothing stored"
  }
}
function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

// SubscriptionPaywall decides its own visibility and sits above everything, so mirror its rule:
// any nudge waits until there is a paid, not-about-to-expire plan. Only a "clear" answer is cached.
const paywallClearCache = new Map<string, true>();
async function paywallIsClear(businessId: string): Promise<boolean> {
  if (paywallClearCache.has(businessId)) return true;
  const subRes = await apiService.get<any>(`/v1/subscriptions/businesses/${businessId}/active`);
  const sub = !subRes.error ? subRes.data : null;
  const hasPaidActive = !!sub && sub.status === 'ACTIVE' && Number(sub.pricing ?? 0) > 0;
  let expiringSoon = false;
  if (hasPaidActive && sub.endDate) {
    const remaining = Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86_400_000);
    expiringSoon = remaining <= RENEWAL_REMINDER_DAYS && remaining >= 0;
  }
  const clear = hasPaidActive && !expiringSoon;
  if (clear) paywallClearCache.set(businessId, true);
  return clear;
}

function brandPromptDue(b: OwnerBusiness): boolean {
  if (b.brandId || b.status !== 'APPROVED') return false;
  if (b.brandPromptStatus === 'DECLINED') return false;
  if (b.brandPromptStatus === 'SNOOZED' && b.brandPromptAt) {
    const age = Date.now() - new Date(b.brandPromptAt).getTime();
    return age > SNOOZE_DAYS * 86_400_000;
  }
  return true;
}

/**
 * Shows at most one dismissible prompt per browser session, in priority order:
 * (paywall, which renders itself and blocks all of these) > menu photos > opening hours > brand conversion.
 * The pick is remembered in sessionStorage so navigating to another page never surfaces a second prompt.
 */
export function BusinessNudges({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const { business, isFood } = useOwnerBusiness(enabled);
  const [paywallClear, setPaywallClear] = useState<boolean | null>(null);
  const [menuEmpty, setMenuEmpty] = useState<boolean | null>(null);
  const [choice, setChoice] = useState<NudgeKey | null>(null);
  const [closed, setClosed] = useState(false);

  const biz = enabled ? business : null;
  const bizId = biz?.id;
  const approved = biz?.status === 'APPROVED';

  useEffect(() => {
    if (!bizId || !approved) return;
    let alive = true;
    paywallIsClear(bizId).then((c) => alive && setPaywallClear(c));
    return () => {
      alive = false;
    };
  }, [bizId, approved]);

  // Same eligibility test the menu prompt runs (it fetches again itself once chosen).
  useEffect(() => {
    if (!bizId || !isFood || paywallClear !== true || readSession(dismissKey('menu', bizId))) return;
    let alive = true;
    apiService.get<any[]>(`/v1/media/menu/business/${bizId}`).then((res) => {
      if (alive) setMenuEmpty(!res.error && Array.isArray(res.data) && res.data.length === 0);
    });
    return () => {
      alive = false;
    };
  }, [bizId, isFood, paywallClear]);

  useEffect(() => {
    if (!biz || !approved || paywallClear !== true) return;
    const menuDismissed = !!readSession(dismissKey('menu', biz.id));
    if (isFood && !menuDismissed && menuEmpty === null) return; // still checking photos

    const eligible: Record<NudgeKey, boolean> = {
      menu: isFood && !menuDismissed && menuEmpty === true,
      hours: !hasOperatingHours(biz.operatingHours) && !readSession(dismissKey('hours', biz.id)),
      brand: brandPromptDue(biz) && !readSession(dismissKey('brand', biz.id)),
    };

    const stored = readSession(choiceKey(biz.id)) as NudgeKey | null;
    let next: NudgeKey | null = null;
    if (stored) {
      next = eligible[stored] ? stored : null;
    } else {
      next = (['menu', 'hours', 'brand'] as const).find((k) => eligible[k]) ?? null;
      if (next) writeSession(choiceKey(biz.id), next);
    }
    setChoice(next);
  }, [biz, approved, paywallClear, isFood, menuEmpty]);

  if (!biz || !choice || closed) return null;

  const dismiss = (k: NudgeKey) => {
    writeSession(dismissKey(k, biz.id), '1');
    setClosed(true);
  };

  if (choice === 'menu') return <MenuPhotoPrompt enabled />;

  if (choice === 'hours') {
    if (pathname.startsWith('/dashboard/settings')) return null;
    return (
      <div className="print:hidden container mx-auto px-4 pt-4 ui-fade-up">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Add your opening hours</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Customers see whether you are open right now. It takes a minute.
            </p>
            <Button asChild size="sm" className="mt-2.5 h-10 rounded-xl px-4 cursor-pointer ui-press">
              <Link href="/dashboard/settings#hours" onClick={() => dismiss('hours')}>
                Set opening hours
              </Link>
            </Button>
          </div>
          <button
            type="button"
            onClick={() => dismiss('hours')}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/dashboard/settings') || pathname.startsWith('/dashboard/outlets')) return null;
  return (
    <BrandConversionPrompt
      businessId={biz.id}
      businessName={biz.name}
      onDone={() => dismiss('brand')}
    />
  );
}
