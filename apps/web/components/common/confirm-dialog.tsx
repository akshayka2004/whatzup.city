'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
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

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" paints the confirm button destructive. */
  tone?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based replacement for window.confirm():
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete offer?', tone: 'danger' }))) return;
 * Mounted once in the root layout.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      // A second call while one is open cancels the first.
      resolver.current?.(false);
      resolver.current = resolve;
      setOptions(opts);
    });
  }, []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!options} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent className="ui-pop max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="min-h-11" onClick={() => settle(false)}>
              {options?.cancelLabel ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'min-h-11',
                options?.tone === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  // Outside the provider fall back to the browser dialog so nothing ever breaks.
  return (
    ctx ??
    ((opts) =>
      Promise.resolve(typeof window !== 'undefined' ? window.confirm(opts.description ? `${opts.title}\n\n${opts.description}` : opts.title) : false))
  );
}
