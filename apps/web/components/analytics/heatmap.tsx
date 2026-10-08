'use client';

import { useMemo } from 'react';
import { formatNumber } from './format';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_LABEL = (h: number) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);

/** Weekday × hour (IST) grid, one sequential hue. Each cell has a title for exact values. */
export function Heatmap({ cells, label = 'views' }: { cells: { dow: number; hour: number; views: number }[]; label?: string }) {
  const { grid, max, peak } = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
    let m = 0;
    let pk = { dow: 1, hour: 0, views: 0 };
    for (const c of cells) {
      if (c.dow >= 1 && c.dow <= 7 && c.hour >= 0 && c.hour < 24) {
        g[c.dow - 1][c.hour] += c.views;
        if (g[c.dow - 1][c.hour] > m) {
          m = g[c.dow - 1][c.hour];
          pk = { dow: c.dow, hour: c.hour, views: m };
        }
      }
    }
    return { grid: g, max: m, peak: pk };
  }, [cells]);

  if (max === 0) return <p className="py-6 text-center text-caption text-muted-foreground">No visits in this period yet</p>;

  return (
    <div>
      <p className="mb-3 text-caption text-muted-foreground">
        Busiest: <span className="font-semibold text-foreground">{DAYS[peak.dow - 1]} {HOUR_LABEL(peak.hour)}–{HOUR_LABEL((peak.hour + 1) % 24)}</span> ({formatNumber(peak.views)} {label})
      </p>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-[3px]">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center text-caption text-subtle-foreground">
              {h % 3 === 0 ? HOUR_LABEL(h) : ''}
            </span>
          ))}
          {grid.map((row, d) => (
            <div key={d} className="contents">
              <span className="self-center text-caption text-muted-foreground">{DAYS[d]}</span>
              {row.map((v, h) => (
                <span
                  key={h}
                  title={`${DAYS[d]} ${HOUR_LABEL(h)}: ${formatNumber(v)} ${label}`}
                  className="aspect-square rounded-[4px]"
                  style={{
                    background:
                      v === 0
                        ? 'var(--surface-sunken)'
                        : `color-mix(in oklch, var(--chart-1) ${Math.round(18 + (v / max) * 82)}%, var(--card))`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
