'use client';

import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Drop-in replacement for the old hand-built `fixed inset-0` overlays: render it while the
 * dialog should be open and pass `onClose`. Radix supplies the focus trap, Escape, scroll
 * lock, aria-modal and the close button. New screens should prefer <Modal>.
 */
export function ModalSurface({
  onClose,
  label,
  className,
  hideClose = false,
  children,
}: {
  onClose: () => void;
  /** Accessible name (visually hidden; the content usually shows its own heading). */
  label: string;
  className?: string;
  /** The content already renders its own close control. */
  hideClose?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={!hideClose}
        className={cn('block max-h-[90dvh] overflow-y-auto sm:max-w-md', className)}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
