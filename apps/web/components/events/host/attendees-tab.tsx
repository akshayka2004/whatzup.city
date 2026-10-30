'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { FilterChip } from '@/components/system/filter-chip';
import { apiService } from '@/lib/services/api-service';
import { fmtClock, fmtWhen, prettyCode } from '@/lib/event-booking';
import { SOURCE_LABEL, type AttendeeRow } from '@/lib/event-host';

const STATUSES = [
  { value: '', label: 'Everyone' },
  { value: 'ISSUED', label: 'Not arrived' },
  { value: 'CHECKED_IN', label: 'Arrived' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function AttendeesTab({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 50;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) qs.set('status', status);
    if (debounced.trim()) qs.set('search', debounced.trim());
    const res = await apiService.get<{ data: AttendeeRow[]; meta: { total: number } }>(
      `/v1/events/${eventId}/host/attendees?${qs}`,
      { fresh: true },
    );
    if (res.error) setError(res.error);
    else {
      setError('');
      setRows(res.data.data);
      setTotal(res.data.meta.total);
    }
    setLoading(false);
  }, [eventId, page, status, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or ticket code"
          aria-label="Search attendees"
          className="h-11 max-w-xs flex-1"
        />
        {STATUSES.map((s) => (
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
        <Button asChild variant="outline" className="ml-auto">
          <a href={`/api/v1/events/${eventId}/host/attendees.csv`}>
            <Download /> Download list
          </a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Downloads include contact details, so each one is logged. Use them only to run this event.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Card className="overflow-hidden rounded-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Registered by</th>
                <th className="px-3 py-2 font-medium">From</th>
                <th className="px-3 py-2 font-medium">RSVP</th>
                <th className="px-3 py-2 font-medium">Arrived</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <Loader2
                      className="mx-auto size-5 animate-spin text-muted-foreground"
                      aria-label="Loading"
                    />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    No one matches.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">
                      {r.holderName}
                      {r.isGuest && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          guest
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{prettyCode(r.code)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === 'CHECKED_IN'
                            ? 'bg-success-soft text-success-soft-foreground'
                            : r.status === 'CANCELLED'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-info-soft text-info-soft-foreground'
                        }`}
                      >
                        {r.status === 'CHECKED_IN'
                          ? 'Arrived'
                          : r.status === 'CANCELLED'
                            ? 'Cancelled'
                            : 'Expected'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="block truncate">{r.registrant.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.registrant.email}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {SOURCE_LABEL[r.source ?? 'direct'] ?? r.source}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {fmtWhen(r.issuedAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {r.checkedInAt ? fmtClock(r.checkedInAt) : '–'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} people · page {page} of {pages}
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

      <MessageBox eventId={eventId} />
    </div>
  );
}

function MessageBox({ eventId }: { eventId: string }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await apiService.post<{ sentTo: number }>(`/v1/events/${eventId}/host/message`, {
      title,
      body,
    });
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Sent to ${res.data.sentTo} people.`);
    setTitle('');
    setBody('');
  };

  return (
    <Card className="rounded-card p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <Megaphone className="size-4 text-primary" aria-hidden /> Message everyone with a ticket
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        For changes people need to know about, such as a new entry gate. Up to 3 messages a day.
        They see it in their notifications.
      </p>
      <form onSubmit={send} className="space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Subject, e.g. Entry is through Gate 2"
          aria-label="Message subject"
          className="h-11"
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Message"
          aria-label="Message"
          required
          className="w-full rounded-control border border-input bg-background p-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        />
        <Button type="submit" loading={busy} disabled={!title.trim() || !body.trim()}>
          Send message
        </Button>
      </form>
    </Card>
  );
}
