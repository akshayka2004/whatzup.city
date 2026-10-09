import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'danger' | 'warning' | 'info' | 'brand';

const TONE: Record<Tone, string> = {
  danger: 'bg-danger-soft text-danger-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  brand: 'bg-brand-soft text-brand-soft-foreground',
};

/**
 * Full-screen state card for workspace gates (verification pending/rejected,
 * trial expired). Light/dark aware; rendered as an overlay when `overlay`.
 */
export function StatusScreen({
  icon: Icon,
  tone,
  title,
  body,
  children,
  overlay = false,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  title: string;
  body: ReactNode;
  children?: ReactNode;
  overlay?: boolean;
}) {
  return (
    <div
      role={overlay ? 'alertdialog' : undefined}
      aria-modal={overlay || undefined}
      aria-labelledby="status-screen-title"
      className={cn(
        'flex w-full items-center justify-center p-4',
        // design-lint-ignore: blocking gate (trial expired / suspended), not a dismissible dialog
        overlay ? 'fixed inset-0 z-[var(--z-modal)] bg-background/90 backdrop-blur-md' : 'h-dvh bg-background',
      )}
    >
      <div className="ui-fade-up w-full max-w-md space-y-6 rounded-sheet border border-border/70 bg-card p-8 text-center shadow-e3">
        <div className={cn('mx-auto flex size-16 items-center justify-center rounded-2xl', TONE[tone])}>
          <Icon className="size-7" />
        </div>
        <div className="space-y-2">
          <h2 id="status-screen-title" className="text-title">
            {title}
          </h2>
          <div className="text-body text-muted-foreground">{body}</div>
        </div>
        {children}
        <p className="text-caption text-muted-foreground">
          Questions? Contact{' '}
          <a href="mailto:support@lifeartgroup.in" className="font-medium text-primary underline-offset-4 hover:underline">
            support@lifeartgroup.in
          </a>
        </p>
      </div>
    </div>
  );
}
