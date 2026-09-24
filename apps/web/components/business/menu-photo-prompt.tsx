'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { UtensilsCrossed, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiService } from '@/lib/services/api-service';
import { useOwnerBusiness } from '@/hooks/use-owner-business';

/**
 * Asks approved food businesses with no menu photos to add some. Shown once per
 * browser session; it comes back on the next login until at least one photo exists.
 */
export function MenuPhotoPrompt({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { business, isFood } = useOwnerBusiness(enabled);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !business || !isFood) return;
    const key = `menu_prompt_dismissed_${business.id}`;
    try {
      if (sessionStorage.getItem(key) === '1') return;
    } catch {
      // storage blocked — fall through and show once per mount
    }
    let alive = true;
    apiService.get<any[]>(`/v1/media/menu/business/${business.id}`).then((res) => {
      // On a failed lookup stay quiet rather than nag about photos they may already have.
      if (alive && !res.error && Array.isArray(res.data) && res.data.length === 0) setOpen(true);
    });
    return () => {
      alive = false;
    };
  }, [enabled, business, isFood]);

  if (!open || pathname.startsWith('/dashboard/menu')) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      if (business) sessionStorage.setItem(`menu_prompt_dismissed_${business.id}`, '1');
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden">
      <Card className="relative w-full max-w-sm p-6 rounded-2xl border-border bg-card shadow-2xl text-center">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UtensilsCrossed className="h-6 w-6" />
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">Show customers your menu</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Add photos of your food menu so people can see what you serve before they visit. They appear on your public
          profile.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={dismiss} variant="outline" className="rounded-xl border-border text-foreground cursor-pointer">
            Maybe later
          </Button>
          <Button
            onClick={() => {
              dismiss();
              router.push('/dashboard/menu');
            }}
            className="rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-primary-foreground cursor-pointer"
          >
            Add menu photos
          </Button>
        </div>
      </Card>
    </div>
  );
}
