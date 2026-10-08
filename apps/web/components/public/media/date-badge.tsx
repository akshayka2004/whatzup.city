import { cn } from '@/lib/utils';
import { dayOf, monthOf } from './format';

/** Calendar-leaf tile (month strip + big day number) for event cards. */
export function DateBadge({ date, className }: { date?: string | null; className?: string }) {
  const day = dayOf(date);
  if (!day) return null;
  return (
    <div
      aria-hidden
      className={cn(
        'flex w-12 flex-col items-center overflow-hidden rounded-xl border border-border bg-card text-center shadow-sm',
        className,
      )}
    >
      <span className="w-full bg-primary px-1 py-0.5 text-[10px] font-bold uppercase leading-4 tracking-wide text-primary-foreground">
        {monthOf(date)}
      </span>
      <span className="py-1 text-lg font-bold leading-none text-foreground">{day}</span>
    </div>
  );
}
