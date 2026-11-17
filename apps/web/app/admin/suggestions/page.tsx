'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { fmtWhen } from '@/lib/event-booking';
import { SUGGESTION_STATUS, SUGGESTION_TOPICS, STATUS_LABEL, TOPIC_LABEL } from '@/lib/suggestions';
import { cn } from '@/lib/utils';

interface Row {
  id: string;
  topic: string;
  message: string;
  page: string | null;
  status: string;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  from: { id: string; name: string; email: string; role: string };
}
interface Listing {
  data: Row[];
  meta: { total: number; page: number; limit: number };
  summary: Record<string, number>;
}

const TONE: Record<string, string> = {
  NEW: 'bg-info-soft text-info-soft-foreground',
  REVIEWED: 'bg-muted text-muted-foreground',
  PLANNED: 'bg-success-soft text-success-soft-foreground',
  DECLINED: 'bg-warning-soft text-warning-soft-foreground',
};

function SuggestionCard({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const [note, setNote] = useState(row.adminNote ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const noteChanged = note.trim() !== (row.adminNote ?? '');

  const save = async (body: { status?: string; adminNote?: string }, key: string, ok: string) => {
    setBusy(key);
    const res = await apiService.patch<any>(`/v1/suggestions/admin/${row.id}`, body);
    setBusy(null);
    if (res.error) toast.error(res.error);
    else {
      toast.success(ok);
      onSaved();
    }
  };

  return (
    <Card className="space-y-3 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{row.from.name}</p>
          <p className="break-all text-xs text-muted-foreground">
            {row.from.email} · {row.from.role.replace(/_/g, ' ').toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {TOPIC_LABEL[row.topic] ?? row.topic}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold',
              TONE[row.status] ?? TONE.REVIEWED,
            )}
          >
            {STATUS_LABEL[row.status] ?? row.status}
          </span>
        </div>
      </div>

      <p className="whitespace-pre-wrap break-words text-sm text-foreground">{row.message}</p>

      <p className="text-xs text-muted-foreground">
        Sent {fmtWhen(row.createdAt)}
        {row.page ? ` · from ${row.page}` : ''}
        {row.reviewedAt ? ` · reviewed ${fmtWhen(row.reviewedAt)}` : ''}
      </p>

      <div className="space-y-2 border-t border-border pt-3">
        <label htmlFor={`note-${row.id}`} className="text-xs font-medium text-muted-foreground">
          Note for the team (the sender does not see this)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`note-${row.id}`}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note"
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
          {SUGGESTION_STATUS.filter((s) => s.value !== 'NEW').map((s) => (
            <Button
              key={s.value}
              size="sm"
              variant={row.status === s.value ? 'default' : 'outline'}
              className="min-h-10"
              disabled={row.status === s.value || busy !== null}
              loading={busy === s.value}
              onClick={() => save({ status: s.value }, s.value, `Marked ${s.label.toLowerCase()}.`)}
            >
              {s.value === 'REVIEWED' ? 'Mark reviewed' : s.label}
            </Button>
          ))}
          {row.status !== 'NEW' && (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-10"
              disabled={busy !== null}
              loading={busy === 'NEW'}
              onClick={() => save({ status: 'NEW' }, 'NEW', 'Moved back to new.')}
            >
              Back to new
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function AdminSuggestionsPage() {
  const [status, setStatus] = useState('NEW');
  const [topic, setTopic] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Listing | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    if (topic) qs.set('topic', topic);
    if (q) qs.set('search', q);
    const res = await apiService.get<Listing>(`/v1/suggestions/admin?${qs}`, { fresh: true });
    if (res.error || !res.data) {
      setError(res.error || 'Could not load suggestions.');
      return;
    }
    setError('');
    setData(res.data);
  }, [page, status, topic, q]);

  useEffect(() => {
    load();
  }, [load]);

  const total = data?.summary ? Object.values(data.summary).reduce((a, b) => a + b, 0) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;

  return (
    <AdminLayout>
      <div className="space-y-5">
        <PageHeader
          title="Suggestions"
          description="What people want us to add or improve. Read them, mark where each one stands, and keep a note for the team."
          meta={
            data && data.summary.NEW > 0 ? (
              <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-soft-foreground">
                {data.summary.NEW} new
              </span>
            ) : undefined
          }
        />

        <div className="space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the text, a name or an email"
            aria-label="Search suggestions"
            className="h-11 sm:max-w-sm"
          />
          <ChipRow wrap label="Status">
            <FilterChip
              selected={status === ''}
              count={total}
              onClick={() => {
                setStatus('');
                setPage(1);
              }}
            >
              All
            </FilterChip>
            {SUGGESTION_STATUS.map((s) => (
              <FilterChip
                key={s.value}
                selected={status === s.value}
                count={data?.summary[s.value] ?? 0}
                onClick={() => {
                  setStatus(s.value);
                  setPage(1);
                }}
              >
                {s.label}
              </FilterChip>
            ))}
          </ChipRow>
          <ChipRow wrap label="Topic">
            <FilterChip
              selected={topic === ''}
              onClick={() => {
                setTopic('');
                setPage(1);
              }}
            >
              Any
            </FilterChip>
            {SUGGESTION_TOPICS.map((t) => (
              <FilterChip
                key={t.value}
                selected={topic === t.value}
                onClick={() => {
                  setTopic(t.value);
                  setPage(1);
                }}
              >
                {t.label}
              </FilterChip>
            ))}
          </ChipRow>
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
            icon={Lightbulb}
            title={total === 0 ? 'No suggestions yet' : 'Nothing matches these filters'}
            description={
              total === 0
                ? 'They will appear here when people send them from the Suggestion box.'
                : 'Try another status or topic.'
            }
          />
        ) : (
          <div className="space-y-3">
            {data.data.map((r) => (
              <SuggestionCard key={r.id} row={r} onSaved={load} />
            ))}
            {pages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.meta.total} suggestions · page {page} of {pages}
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
    </AdminLayout>
  );
}
