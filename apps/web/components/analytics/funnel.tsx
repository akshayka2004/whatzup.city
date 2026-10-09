import { ChevronRight } from 'lucide-react';
import { formatNumber, formatPct } from './format';

/** Horizontal funnel: each stage's bar relative to the first, with step conversion between stages. */
export function Funnel({ stages }: { stages: { stage: string; value: number }[] }) {
  const top = Math.max(stages[0]?.value ?? 0, 1);
  return (
    <ol className="space-y-3">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const step = prev ? (s.value / prev) * 100 : null;
        return (
          <li key={s.stage}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-label text-foreground">{s.stage}</span>
              <span className="flex items-baseline gap-2">
                {step != null && (
                  <span className="flex items-center text-caption text-muted-foreground">
                    <ChevronRight className="size-3" aria-hidden />
                    {formatPct(step)}
                  </span>
                )}
                <span className="text-sm font-semibold tabular-nums">{formatNumber(s.value)}</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out-quint"
                style={{
                  width: `${Math.max(s.value > 0 ? 2 : 0, (s.value / top) * 100)}%`,
                  opacity: 1 - i * 0.15,
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
