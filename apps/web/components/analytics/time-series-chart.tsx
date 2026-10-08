'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateKey, formatValue, todayIst, type ValueFormat } from './format';

type Point = { date: string; value: number };

/**
 * Single-measure trend (one axis, always). The bucket containing today is incomplete,
 * so it is drawn dashed and labelled "so far" in the tooltip.
 */
export function TimeSeriesChart({
  points,
  label,
  format = 'number',
  granularity = 'day',
  height = 280,
  color = 'var(--primary)',
}: {
  points: Point[];
  label: string;
  format?: ValueFormat;
  granularity?: 'day' | 'week' | 'month';
  height?: number;
  color?: string;
}) {
  const gid = useId().replace(/:/g, '');
  const today = todayIst();

  const data = useMemo(() => {
    const lastIdx = points.length - 1;
    const lastBucketHasToday =
      lastIdx >= 0 &&
      (granularity === 'day'
        ? points[lastIdx].date === today
        : granularity === 'month'
          ? points[lastIdx].date.slice(0, 7) === today.slice(0, 7)
          : points[lastIdx].date <= today);
    return points.map((p, i) => ({
      date: p.date,
      solid: lastBucketHasToday && i === lastIdx ? null : p.value,
      partial: lastBucketHasToday && i >= lastIdx - 1 ? p.value : null,
      value: p.value,
      isPartial: lastBucketHasToday && i === lastIdx,
    }));
  }, [points, granularity, today]);

  const tickEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`${label} over time`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
            tickFormatter={(d: string) => formatDateKey(d, granularity)}
            interval={tickEvery - 1}
            minTickGap={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
            tick={{ fill: 'var(--chart-axis)', fontSize: 12 }}
            tickFormatter={(v: number) => formatValue(v, format, true)}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as (typeof data)[number];
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-e2">
                  <p className="text-caption text-muted-foreground">
                    {granularity === 'week' ? 'Week of ' : ''}
                    {formatDateKey(p.date, granularity)}
                    {p.isPartial ? ' · so far' : ''}
                  </p>
                  <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                    {formatValue(p.value, format)} <span className="font-normal text-muted-foreground">{label.toLowerCase()}</span>
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="solid"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gid})`}
            connectNulls={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="partial"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="transparent"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
