import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Wizard progress. Horizontal with labels from sm up; on phones a compact
 * "Step 2 of 5 · Contacts" line plus a thin progress bar.
 */
export function Stepper({
  steps,
  current,
  onStepClick,
  className,
}: {
  steps: string[];
  /** 0-based index of the active step. */
  current: number;
  /** Lets users jump back to completed steps. */
  onStepClick?: (index: number) => void;
  className?: string;
}) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
  return (
    <nav aria-label="Progress" className={className}>
      <div className="sm:hidden">
        <p className="text-label text-muted-foreground">
          Step {current + 1} of {steps.length} ·{' '}
          <span className="text-foreground">{steps[current]}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out-quint"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-center sm:flex">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = done && !!onStepClick;
          const Dot = (
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border text-label tabular-nums transition-colors',
                done && 'border-primary bg-primary text-primary-foreground',
                active &&
                  'border-primary bg-brand-soft text-brand-soft-foreground ring-4 ring-primary/10',
                !done && !active && 'border-border-strong bg-card text-muted-foreground',
              )}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
          );
          return (
            <li key={label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(i)}
                  className="flex items-center gap-2 rounded-full pr-2"
                >
                  {Dot}
                  <span className="text-label text-foreground">{label}</span>
                </button>
              ) : (
                <span
                  className="flex items-center gap-2 pr-2"
                  aria-current={active ? 'step' : undefined}
                >
                  {Dot}
                  <span
                    className={cn(
                      'text-label',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                </span>
              )}
              {i < steps.length - 1 && (
                <span
                  className={cn('mx-2 h-px flex-1', done ? 'bg-primary' : 'bg-border-strong/70')}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
