'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/system/page-header';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  visitDate: string;
  guests: number;
  note: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  buffet: { id: string; title: string; city: string | null; phone: string | null };
};
type Listing = {
  data: Row[];
  meta: { total: number; page: number; limit: number };
  pending: number;
};

const STATUS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Waiting' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const TONE: Record<string, string> = {
  PENDING: 'bg-info-soft text-info-soft-foreground',
  CONFIRMED: 'bg-success-soft text-success-soft-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
};
const niceDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** A spreadsheet cell: values that start with = + - @ are made text so they never run as formulas. */
const cell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function RsvpCard({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [note, setNote] = useState(row.adminNote ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const noteChanged = note.trim() !== (row.adminNote ?? '');

  const save = async (body: { status?: string; adminNote?: string }, key: string, ok: string) => {
    setBusy(key);
    const res = await apiService.patch<any>(`/v1/platform-offers/admin/rsvps/${row.id}`, body);
    setBusy(null);
    if (res.error) toast.error(res.error);
    else {
      toast.success(ok);
      onSaved();
    }
  };

  return (
    <Card className="space-y-3 rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{row.buffet.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.buffet.city ?? 'Kerala'}
            {row.buffet.phone ? ` · hotel ${row.buffet.phone}` : ''}
          </p>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', TONE[row.status])}>
          {STATUS.find((s) => s.value === row.status)?.label ?? row.status}
        </span>
      </div>
      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Day: </span>
          <span className="font-medium text-foreground">{niceDay(row.visitDate)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Guests: </span>
          <span className="font-medium text-foreground">{row.guests}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Name: </span>
          <span className="text-foreground">{row.name}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Phone: </span>
          <a className="text-primary underline" href={`tel:${row.phone}`}>
            {row.phone}
          </a>
        </p>
      </div>
      {row.note && (
        <p className="whitespace-pre-wrap break-words rounded-xl bg-secondary p-3 text-sm text-foreground">
          {row.note}
        </p>
      )}
      <div className="space-y-2 border-t border-border pt-3">
        <label htmlFor={`rn-${row.id}`} className="text-xs font-medium text-muted-foreground">
          Note for the team
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`rn-${row.id}`}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Hotel confirmed table 7"
            className="h-11"
          />
          <Button
            variant="outline"
            className="min-h-11 shrink-0"
            disabled={!noteChanged || busy !== null}
            loading={busy === 'note'}
            onClick={() => save({ adminNote: note }, 'note', 'Note saved.')}
          >
            Save note
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {row.status !== 'CONFIRMED' && (
            <Button
              size="sm"
              className="min-h-10"
              disabled={busy !== null}
              loading={busy === 'CONFIRMED'}
              onClick={() => save({ status: 'CONFIRMED' }, 'CONFIRMED', 'Marked confirmed.')}
            >
              Mark confirmed
            </Button>
          )}
          {row.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="outline"
              className="min-h-10"
              disabled={busy !== null}
              loading={busy === 'CANCELLED'}
              onClick={() => save({ status: 'CANCELLED' }, 'CANCELLED', 'Marked cancelled.')}
            >
              Cancel RSVP
            </Button>
          )}
          {row.status !== 'PENDING' && (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-10"
              disabled={busy !== null}
              loading={busy === 'PENDING'}
              onClick={() => save({ status: 'PENDING' }, 'PENDING', 'Moved back to waiting.')}
            >
              Back to waiting
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/** The buffet RSVP queue for admins and staff. */
export function BuffetRsvpsManager() {
  const [status, setStatus] = useState('PENDING');
  const [upcoming, setUpcoming] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    if (upcoming) qs.set('upcoming', 'true');
    const res = await apiService.get<Listing>(`/v1/platform-offers/admin/rsvps?${qs}`, {
      fresh: true,
    });
    if (res.error || !res.data) {
      setError(res.error || 'Could not load RSVPs.');
      return;
    }
    setError('');
    setData(res.data);
  }, [page, status, upcoming]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;

  const download = () => {
    if (!data?.data.length) return;
    const head = ['Buffet', 'City', 'Day', 'Guests', 'Name', 'Phone', 'Email', 'Status', 'Note'];
    const lines = [head.map(cell).join(',')];
    for (const r of data.data) {
      lines.push(
        [
          r.buffet.title,
          r.buffet.city,
          r.visitDate,
          r.guests,
          r.name,
          r.phone,
          r.email,
          r.status,
          r.note,
        ]
          .map(cell)
          .join(','),
      );
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buffet-rsvps.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Buffet RSVPs"
        description="Table requests from the Buffets page. Call the hotel, then mark each one confirmed or cancelled."
        meta={
          data && data.pending > 0 ? (
            <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-soft-foreground">
              {data.pending} waiting
            </span>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChipRow wrap label="Status">
          {STATUS.map((s) => (
            <FilterChip
              key={s.value}
              selected={status === s.value}
              onClick={() => {
                setStatus(s.value);
                setPage(1);
              }}
            >
              {s.label}
            </FilterChip>
          ))}
        </ChipRow>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={upcoming}
              onChange={(e) => {
                setUpcoming(e.target.checked);
                setPage(1);
              }}
              className="h-5 w-5"
            />
            Upcoming days only
          </label>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 gap-1.5"
            onClick={download}
            disabled={!data?.data.length}
          >
            <Download className="size-4" aria-hidden /> CSV
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="rounded-2xl p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" className="mt-3 min-h-11" onClick={load}>
            Try again
          </Button>
        </Card>
      ) : !data ? (
        <Loader2
          className="mx-auto my-12 size-6 animate-spin text-muted-foreground"
          aria-label="Loading"
        />
      ) : data.data.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No RSVPs here"
          description="They appear when people send one from the Buffets page."
        />
      ) : (
        <div className="space-y-3">
          {data.data.map((r) => (
            <RsvpCard key={r.id} row={r} onSaved={load} />
          ))}
          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {data.meta.total} RSVPs · page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
