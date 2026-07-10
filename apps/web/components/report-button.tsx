'use client';

import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';

/**
 * Compact "Report" control for public cards (business / offer). Navigates to the
 * prefilled /report form; guests are bounced to sign-in there before submit.
 */
export function ReportButton({
  kind,
  targetId,
  targetName,
  className,
}: {
  kind: 'business' | 'offer';
  targetId: string;
  targetName?: string;
  className?: string;
}) {
  const router = useRouter();

  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const type = kind === 'offer' ? 'fraudulent_offer' : 'fake_business';
    const params = new URLSearchParams({ type, targetType: kind.toUpperCase(), targetId });
    if (targetName) params.set('business', targetName);
    router.push(`/report?${params.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={go}
      title="Report this listing"
      aria-label="Report this listing"
      className={
        className ??
        'inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer shrink-0'
      }
    >
      <Flag className="h-3.5 w-3.5" />
    </button>
  );
}
