'use client';

import { Loader2, RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Slides up when a form has unsaved edits, so the Save button is always in reach on a
 * long page. It sits above the mobile bottom nav (h-16 + safe area) and over the
 * content on desktop. Render it unconditionally; it hides itself when not dirty.
 */
export function StickySaveBar({
  dirty,
  saving = false,
  onSave,
  onReset,
  message,
  saveLabel = 'Save changes',
  className,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onReset?: () => void;
  /** Result of the last save ("Saved." / an error). Shown even when not dirty, briefly, by the caller. */
  message?: string | null;
  saveLabel?: string;
  className?: string;
}) {
  const visible = dirty || saving || !!message;
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-3 transition-[transform,opacity] duration-300 ease-out md:bottom-4 md:pl-64',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-card/95 p-2 pl-4 shadow-[var(--shadow-3)] backdrop-blur"
      >
        <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {message ? message : dirty ? 'You have unsaved changes' : ' '}
        </p>
        {onReset && dirty && (
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="ui-press inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !dirty}
          className="ui-press inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
