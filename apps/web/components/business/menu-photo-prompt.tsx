'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/system/modal';
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
    <Modal
      open
      onOpenChange={(o) => !o && dismiss()}
      title="Show customers your menu"
      description="Add photos of your food menu so people see what you serve before they visit. They appear on your public profile."
      size="sm"
      className="print:hidden"
      footer={
        <>
          <Button variant="outline" onClick={dismiss}>
            Maybe later
          </Button>
          <Button
            onClick={() => {
              dismiss();
              router.push('/dashboard/menu');
            }}
          >
            <UtensilsCrossed /> Add menu photos
          </Button>
        </>
      }
    />
  );
}
