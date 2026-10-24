'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { ConfirmOptions } from './confirm-dialog';

export default function ConfirmDialogView({
  options,
  onSettle,
}: {
  options: ConfirmOptions | null;
  onSettle: (ok: boolean) => void;
}) {
  return (
    <AlertDialog open={!!options} onOpenChange={(open) => !open && onSettle(false)}>
      <AlertDialogContent className="ui-pop max-w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && (
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="min-h-11" onClick={() => onSettle(false)}>
            {options?.cancelLabel ?? 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              'min-h-11',
              options?.tone === 'danger' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
            onClick={() => onSettle(true)}
          >
            {options?.confirmLabel ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
