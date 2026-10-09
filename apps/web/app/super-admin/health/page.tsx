'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Database, RefreshCw, Search, Server, Zap } from 'lucide-react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { StatusPill } from '@/components/common/status-pill';
import { Sparkline } from '@/components/common/sparkline';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/services/api-service';

type Check = string | { status: string; latencyMs?: number };
type Health = {
  status: string;
  timestamp: string;
  uptime: number;
  totalLatencyMs: number;
  memory?: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
  checks: Record<string, Check>;
};

const POLL_MS = 30_000;
const HISTORY = 20;

const SERVICES: { key: string; label: string; icon: typeof Server; note: string }[] = [
  { key: 'api', label: 'API server', icon: Server, note: 'NestJS process answering requests' },
  { key: 'database', label: 'Database', icon: Database, note: 'Postgres round-trip (SELECT 1)' },
  { key: 'redis', label: 'Cache & queues', icon: Zap, note: 'Redis write/read' },
  {
    key: 'typesense',
    label: 'Search engine',
    icon: Search,
    note: 'Typesense; "degraded" falls back to database search',
  },
];

const statusOf = (c?: Check) => (typeof c === 'string' ? c : c?.status) ?? 'unknown';
const latencyOf = (c?: Check) => (typeof c === 'object' ? c.latencyMs : undefined);
const tone = (s: string) =>
  s === 'healthy'
    ? 'success'
    : s === 'healthy_degraded' || s === 'degraded'
      ? 'warning'
      : s === 'unknown'
        ? 'neutral'
        : 'danger';
const label = (s: string) =>
  s === 'healthy_degraded' ? 'Degraded (fallback active)' : s.charAt(0).toUpperCase() + s.slice(1);

function formatUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const history = useRef<Record<string, number[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiService.get<Health>('/v1/health');
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error || 'Health endpoint did not respond');
      return;
    }
    setError(null);
    for (const s of SERVICES) {
      const ms = latencyOf(res.data.checks?.[s.key]);
      if (ms != null)
        history.current[s.key] = [...(history.current[s.key] ?? []), ms].slice(-HISTORY);
    }
    history.current.total = [...(history.current.total ?? []), res.data.totalLatencyMs].slice(
      -HISTORY,
    );
    setHealth(res.data);
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const overall = error ? 'unhealthy' : (health?.status ?? 'unknown');

  return (
    <SuperAdminLayout>
      <PageHeader
        title="System health"
        description="Live checks from the API, refreshed every 30 seconds while this page is open."
        meta={
          <StatusPill
            tone={tone(overall)}
            label={error ? 'Unreachable' : label(overall)}
            live={overall === 'healthy'}
          />
        }
        actions={
          <Button variant="outline" onClick={load} loading={loading}>
            <RefreshCw /> Check now
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-card bg-danger-soft p-4 text-sm text-danger-soft-foreground"
        >
          {error}. The API may be down or restarting.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SERVICES.map((s) => {
          const c = health?.checks?.[s.key];
          const st = health ? statusOf(c) : 'unknown';
          const ms = latencyOf(c);
          return (
            <SectionCard key={s.key} icon={s.icon} title={s.label} description={s.note}>
              <div className="flex items-end justify-between gap-3">
                <div className="space-y-2">
                  <StatusPill tone={tone(st)} label={health ? label(st) : 'Checking…'} />
                  <p className="text-metric">{ms != null ? `${ms} ms` : '—'}</p>
                </div>
                <Sparkline
                  data={history.current[s.key] ?? []}
                  width={84}
                  height={32}
                  className="text-chart-axis"
                />
              </div>
            </SectionCard>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SectionCard icon={Activity} title="Round trip">
          <p className="text-metric">{health ? `${health.totalLatencyMs} ms` : '—'}</p>
          <p className="mt-1 text-caption text-muted-foreground">All checks, measured by the API</p>
        </SectionCard>
        <SectionCard icon={Server} title="API uptime">
          <p className="text-metric">{health ? formatUptime(health.uptime) : '—'}</p>
          <p className="mt-1 text-caption text-muted-foreground">Since the process last started</p>
        </SectionCard>
        <SectionCard icon={Database} title="API memory">
          <p className="text-metric">{health?.memory ? `${health.memory.rssMb} MB` : '—'}</p>
          <p className="mt-1 text-caption text-muted-foreground">
            {health?.memory
              ? `Heap ${health.memory.heapUsedMb} / ${health.memory.heapTotalMb} MB`
              : 'Resident memory'}
          </p>
        </SectionCard>
      </div>

      {health && (
        <p className="mt-6 text-caption text-subtle-foreground">
          Last checked{' '}
          {new Date(health.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
          IST.
        </p>
      )}
    </SuperAdminLayout>
  );
}
