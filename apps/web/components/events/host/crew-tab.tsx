'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Loader2, Printer, ScanLine, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useConfirm } from '@/components/common/confirm-dialog';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import { SITE_URL } from '@/lib/site-url';
import type { CrewPass } from '@/lib/event-host';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<CrewPass['status'], string> = {
  ACTIVE: 'bg-success-soft text-success-soft-foreground',
  UPCOMING: 'bg-info-soft text-info-soft-foreground',
  EXPIRED: 'bg-muted text-muted-foreground',
  REVOKED: 'bg-danger-soft text-danger-soft-foreground',
};

export function CrewTab({ eventId }: { eventId: string }) {
  const confirm = useConfirm();
  const [passes, setPasses] = useState<CrewPass[] | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'count' | 'names'>('count');
  const [count, setCount] = useState('3');
  const [prefix, setPrefix] = useState('Gate');
  const [names, setNames] = useState('');
  const [level, setLevel] = useState<'SCAN' | 'DESK'>('SCAN');
  const [devices, setDevices] = useState('2');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    const res = await apiService.get<CrewPass[]>(`/v1/events/${eventId}/host/crew`, {
      fresh: true,
    });
    if (res.error) setError(res.error);
    else {
      setError('');
      setPasses(res.data);
    }
  }, [eventId]);

  useEffect(() => {
    load();
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 15_000);
    return () => window.clearInterval(t);
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const labels = names
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const res = await apiService.post<CrewPass[]>(`/v1/events/${eventId}/host/crew`, {
      ...(mode === 'names' ? { labels } : { count: Number(count) || 1, prefix }),
      level,
      maxDevices: Number(devices) || 2,
    });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`${res.data.length} pass${res.data.length === 1 ? '' : 'es'} created.`);
    setNames('');
    load();
  };

  const revoke = async (p: CrewPass) => {
    const ok = await confirm({
      title: `Revoke ${p.label}?`,
      description:
        'The phone using this pass is signed out within seconds and the code stops working.',
      confirmLabel: 'Revoke',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await apiService.post(`/v1/events/${eventId}/host/crew/${p.id}/revoke`, {});
    if (res.error) toast.error(res.error);
    else {
      toast.success(`${p.label} revoked.`);
      load();
    }
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.');
    }
  };

  const link = (p: CrewPass) => `${SITE_URL}/scan?c=${p.code}`;
  const live = (passes ?? []).filter((p) => p.status === 'ACTIVE' || p.status === 'UPCOMING');

  return (
    <div className="space-y-6">
      <Card className="rounded-card p-5">
        <h3 className="mb-1 flex items-center gap-2 font-semibold">
          <ScanLine className="size-4 text-primary" aria-hidden /> Crew passes
        </h3>
        <p className="text-sm text-muted-foreground">
          A pass lets one helper scan tickets on their own phone for this event only, with no
          account to create. It stops working when the check-in window ends, or when you revoke it.
          Create as many as you need.
        </p>
        <form onSubmit={create} className="mt-4 space-y-4">
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="How to name the passes"
          >
            {(['count', 'names'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'min-h-9 cursor-pointer rounded-full border px-3.5 text-sm',
                  mode === m
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'border-input text-muted-foreground',
                )}
              >
                {m === 'count' ? 'A number of passes' : 'Name each pass'}
              </button>
            ))}
          </div>
          {mode === 'count' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="crew-count" className="text-sm font-medium">
                  How many
                </label>
                <Input
                  id="crew-count"
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="crew-prefix" className="text-sm font-medium">
                  Name them
                </label>
                <Input
                  id="crew-prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  maxLength={60}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Gives {prefix || 'Gate'} 1, {prefix || 'Gate'} 2 and so on.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="crew-names" className="text-sm font-medium">
                One name per line
              </label>
              <textarea
                id="crew-names"
                value={names}
                onChange={(e) => setNames(e.target.value)}
                rows={4}
                placeholder={'Ravi, front gate\nAsha, help desk'}
                className="w-full rounded-control border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
              />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="crew-level" className="text-sm font-medium">
                What they can do
              </label>
              <select
                id="crew-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as 'SCAN' | 'DESK')}
                className="h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
              >
                <option value="SCAN">Scan only</option>
                <option value="DESK">Desk: also find names and check people in by hand</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="crew-devices" className="text-sm font-medium">
                Phones per pass
              </label>
              <Input
                id="crew-devices"
                type="number"
                min={1}
                max={5}
                value={devices}
                onChange={(e) => setDevices(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
          <Button type="submit" loading={busy} disabled={mode === 'names' && !names.trim()}>
            Create passes
          </Button>
        </form>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {passes === null ? (
        <Loader2
          className="mx-auto size-6 animate-spin text-muted-foreground"
          aria-label="Loading"
        />
      ) : passes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No passes yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">
              {passes.length} pass{passes.length === 1 ? '' : 'es'}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/scan" target="_blank">
                  <ScanLine /> Open scanner
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" disabled={live.length === 0}>
                <Link href={`/crew-sheet/${eventId}`} target="_blank">
                  <Printer /> Print pass sheet
                </Link>
              </Button>
            </div>
          </div>
          <ul className="space-y-2">
            {passes.map((p) => (
              <li key={p.id} className="rounded-card border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.label}
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          STATUS_STYLE[p.status],
                        )}
                      >
                        {p.status === 'ACTIVE'
                          ? 'Active'
                          : p.status === 'UPCOMING'
                            ? 'Not started'
                            : p.status === 'EXPIRED'
                              ? 'Expired'
                              : 'Revoked'}
                      </span>
                      {p.level === 'DESK' && (
                        <span className="text-xs font-normal text-muted-foreground">desk</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.checkedIn} checked in · {p.devicesInUse} of {p.maxDevices} phones · valid
                      until {fmtWhen(p.validUntil)}
                    </p>
                  </div>
                  {p.status !== 'REVOKED' && p.status !== 'EXPIRED' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copy(`code-${p.id}`, p.code)}
                        className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 font-mono text-base font-semibold tracking-widest"
                        aria-label={`Copy code ${p.codeDisplay}`}
                      >
                        {p.codeDisplay}
                        {copied === `code-${p.id}` ? (
                          <Check className="size-4 text-success-soft-foreground" />
                        ) : (
                          <Copy className="size-4 text-muted-foreground" />
                        )}
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copy(`link-${p.id}`, link(p))}
                      >
                        {copied === `link-${p.id}` ? <Check /> : <Copy />} Link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => revoke(p)}>
                        <ShieldOff /> Revoke
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Give each helper their code or link. They open{' '}
            <span className="font-mono">{SITE_URL}/scan</span> on their phone and type it in.
          </p>
        </div>
      )}
    </div>
  );
}
