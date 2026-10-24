'use client';
// design-lint-disable-file: window.confirm is the deliberate fallback when no ConfirmProvider is mounted.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

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

// The dialog (Radix AlertDialog) loads on the first confirm, not with every page.
const ConfirmDialogView = dynamic(() => import('./confirm-dialog-view'), { ssr: false });

/**
 * Promise-based replacement for window.confirm():
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Delete offer?', tone: 'danger' }))) return;
 * Mounted once in the root layout.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // Stays true after the first confirm so the dialog can animate closed.
  const [mounted, setMounted] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      // A second call while one is open cancels the first.
      resolver.current?.(false);
      resolver.current = resolve;
      setMounted(true);
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
      {mounted && <ConfirmDialogView options={options} onSettle={settle} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  // Outside the provider fall back to the browser dialog so nothing ever breaks.
  return (
    ctx ??
    ((opts) =>
      Promise.resolve(
        typeof window !== 'undefined'
          ? window.confirm(opts.description ? `${opts.title}\n\n${opts.description}` : opts.title)
          : false,
      ))
  );
}
