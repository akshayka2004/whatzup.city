import { cn } from '@/lib/utils';

export type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

const TONE: Record<PillTone, string> = {
  success: 'bg-success/15 text-success-foreground dark:text-success border-success/30',
  warning: 'bg-warning/15 text-warning-foreground dark:text-warning border-warning/30',
  danger: 'bg-destructive/10 text-destructive border-destructive/25',
  info: 'bg-info/10 text-info border-info/25',
  primary: 'bg-primary/10 text-primary border-primary/25',
  neutral: 'bg-muted text-muted-foreground border-border',
};

const DOT: Record<PillTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  primary: 'bg-primary',
  neutral: 'bg-muted-foreground',
};

/** Maps the platform's status strings to a tone so every screen colours them the same way. */
export function statusTone(status?: string | null): PillTone {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'VERIFIED':
    case 'PAID':
    case 'COMPLETED':
    case 'OPEN':
    case 'LIVE':
      return 'success';
    case 'PENDING':
    case 'PENDING_VERIFICATION':
    case 'PENDING_PAYMENT':
    case 'UNDER_REVIEW':
    case 'SNOOZED':
    case 'FLAGGED':
    case 'DRAFT':
      return 'warning';
    case 'REJECTED':
    case 'FAILED':
    case 'EXPIRED':
    case 'SUSPENDED':
    case 'CANCELLED':
    case 'ESCALATED':
      return 'danger';
    case 'ARCHIVED':
    case 'CLOSED':
    case 'INACTIVE':
      return 'neutral';
    default:
      return 'info';
  }
}

export function humanizeStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function StatusPill({
  status,
  tone,
  label,
  dot = true,
  live = false,
  className,
}: {
  status?: string | null;
  tone?: PillTone;
  label?: string;
  dot?: boolean;
  /** Pulsing dot, for "open now" / "live" states. */
  live?: boolean;
  className?: string;
}) {
  const t = tone ?? statusTone(status);
  const text = label ?? (status ? humanizeStatus(status) : '');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 whitespace-nowrap',
        TONE[t],
        className,
      )}
    >
      {dot &&
        (live ? (
          <span className="ui-live-dot" aria-hidden />
        ) : (
          <span className={cn('h-1.5 w-1.5 rounded-full', DOT[t])} aria-hidden />
        ))}
      {text}
    </span>
  );
}
