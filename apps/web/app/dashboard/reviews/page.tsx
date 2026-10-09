'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Flag, MessageSquareText, Star } from 'lucide-react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { PageHeader } from '@/components/system/page-header';
import { SectionCard } from '@/components/system/section-card';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Modal } from '@/components/system/modal';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { useActiveBusiness } from '@/hooks/use-active-business';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

type Review = {
  id: string;
  author: string;
  rating: number;
  text: string;
  createdAt: string | null;
  verified: boolean;
  reply: string | null;
  replyAt: string | null;
};

function Stars({ value, size = 'size-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(size, i <= value ? 'fill-warning text-warning' : 'text-border-strong')}
          aria-hidden
        />
      ))}
    </span>
  );
}

/**
 * Owner view of reviews. Owners can't delete reviews (that would let anyone bury
 * criticism); they report suspicious ones and the platform team decides.
 */
export default function ReviewsPage() {
  const { activeBusinessId } = useActiveBusiness();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [reporting, setReporting] = useState<Review | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const saveReply = async (id: string, text: string) => {
    setSavingReply(true);
    const res = await apiService.put<any>(`/v1/reviews/${id}/reply`, { reply: text });
    setSavingReply(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setReviews((list) =>
      (list ?? []).map((r) =>
        r.id === id
          ? { ...r, reply: res.data?.ownerReply ?? null, replyAt: res.data?.ownerReplyAt ?? null }
          : r,
      ),
    );
    setEditing(null);
    setDraft('');
    toast.success(text.trim() ? 'Reply published' : 'Reply removed');
  };

  useEffect(() => {
    if (!activeBusinessId) return;
    apiService.get<any>(`/v1/reviews/business/${activeBusinessId}?page=1`).then((res) => {
      const list = res.error
        ? []
        : Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? res.data?.reviews ?? []);
      setReviews(
        list.map((r: any) => ({
          id: r.id,
          author: r.user?.name || r.customerName || r.author || 'Customer',
          rating: Number(r.rating) || 0,
          text: r.comment || r.text || r.body || '',
          createdAt: r.createdAt ?? null,
          verified: !!r.isVerifiedPurchase,
          reply: r.ownerReply ?? null,
          replyAt: r.ownerReplyAt ?? null,
        })),
      );
    });
  }, [activeBusinessId]);

  const stats = useMemo(() => {
    const list = reviews ?? [];
    const dist = [5, 4, 3, 2, 1].map((s) => ({
      star: s,
      count: list.filter((r) => r.rating === s).length,
    }));
    const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
    return { dist, avg, total: list.length, verified: list.filter((r) => r.verified).length };
  }, [reviews]);

  const shown = (reviews ?? []).filter((r) => filter === 'all' || r.rating === filter);

  const submitReport = async () => {
    if (!reporting) return;
    if (reason.trim().length < 10) {
      toast.error('Tell us briefly why this review breaks the rules (at least 10 characters).');
      return;
    }
    setSending(true);
    const res = await apiService.post('/v1/reports', {
      type: 'fake_review',
      subject: 'Review reported by the business',
      description: reason.trim(),
      targetType: 'REVIEW',
      targetId: reporting.id,
    });
    setSending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setReported((s) => new Set(s).add(reporting.id));
    toast.success('Reported. Our team will review it and keep you posted.');
    setReporting(null);
    setReason('');
  };

  return (
    <BusinessLayout>
      <PageHeader
        title="Reviews"
        description="What customers say about you. Reply publicly to thank them or address concerns."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <SectionCard title="Rating" className="h-fit">
          {reviews == null ? (
            <div className="ui-skeleton h-40" />
          ) : (
            <>
              <div className="flex items-end gap-3">
                <span className="text-metric text-[2.5rem]">
                  {stats.total ? stats.avg.toFixed(1) : '—'}
                </span>
                <div className="pb-1.5">
                  <Stars value={Math.round(stats.avg)} />
                  <p className="text-caption text-muted-foreground">
                    {stats.total} review{stats.total === 1 ? '' : 's'} · {stats.verified} verified
                  </p>
                </div>
              </div>
              <ul className="mt-5 space-y-2">
                {stats.dist.map((d) => (
                  <li key={d.star} className="flex items-center gap-2 text-sm">
                    <span className="w-3 tabular-nums text-muted-foreground">{d.star}</span>
                    <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <span
                        className="block h-full rounded-full bg-warning"
                        style={{ width: stats.total ? `${(d.count / stats.total) * 100}%` : 0 }}
                      />
                    </span>
                    <span className="w-6 text-right tabular-nums text-muted-foreground">
                      {d.count}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>

        <div className="space-y-4">
          <ChipRow label="Filter by rating">
            <FilterChip
              selected={filter === 'all'}
              onClick={() => setFilter('all')}
              count={stats.total}
            >
              All
            </FilterChip>
            {[5, 4, 3, 2, 1].map((s) => (
              <FilterChip key={s} selected={filter === s} onClick={() => setFilter(s)} icon={Star}>
                {s}
              </FilterChip>
            ))}
          </ChipRow>

          {reviews == null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="ui-skeleton h-28 rounded-card" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title={stats.total ? 'No reviews with this rating' : 'No reviews yet'}
              description={
                stats.total
                  ? 'Try another filter.'
                  : 'Share your storefront QR so customers can upload a bill and leave a verified review.'
              }
              action={
                stats.total ? undefined : { label: 'Get your QR code', href: '/dashboard/qr-code' }
              }
              compact
            />
          ) : (
            <ul className="space-y-3">
              {shown.map((r) => (
                <li
                  key={r.id}
                  className="rounded-card border border-border/70 bg-card p-5 shadow-e1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-soft-foreground">
                        {r.author.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium">
                          {r.author}
                          {r.verified && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-caption font-semibold text-success-soft-foreground">
                              <BadgeCheck className="size-3" aria-hidden /> Verified bill
                            </span>
                          )}
                        </p>
                        <p className="flex items-center gap-2 text-caption text-muted-foreground">
                          <Stars value={r.rating} size="size-3.5" />
                          {r.createdAt &&
                            new Date(r.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={reported.has(r.id)}
                      onClick={() => setReporting(r)}
                      className="shrink-0 text-muted-foreground"
                    >
                      <Flag /> {reported.has(r.id) ? 'Reported' : 'Report'}
                    </Button>
                  </div>
                  {r.text && (
                    <p className="mt-3 whitespace-pre-line text-body text-foreground">{r.text}</p>
                  )}

                  {editing === r.id ? (
                    <div className="mt-4 space-y-2 rounded-xl bg-surface-sunken p-3">
                      <label htmlFor={`reply-${r.id}`} className="text-label">
                        Your public reply
                      </label>
                      <Textarea
                        id={`reply-${r.id}`}
                        value={draft}
                        maxLength={1000}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Thank them, answer their point, or explain what you've changed."
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-caption text-muted-foreground">
                          {draft.length}/1000 · shown on your public page
                        </span>
                        <div className="flex gap-2">
                          {r.reply && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => saveReply(r.id, '')}
                              disabled={savingReply}
                            >
                              Remove
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            loading={savingReply}
                            disabled={!draft.trim()}
                            onClick={() => saveReply(r.id, draft)}
                          >
                            Publish reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : r.reply ? (
                    <div className="mt-4 rounded-xl border-l-2 border-primary bg-brand-soft/60 px-4 py-3">
                      <p className="flex items-center justify-between gap-2 text-caption font-semibold text-brand-soft-foreground">
                        Your reply
                        {r.replyAt
                          ? ` · ${new Date(r.replyAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                          : ''}
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => {
                            setEditing(r.id);
                            setDraft(r.reply ?? '');
                          }}
                        >
                          Edit
                        </button>
                      </p>
                      <p className="mt-1 whitespace-pre-line text-body">{r.reply}</p>
                    </div>
                  ) : (
                    <Button
                      variant="tonal"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setEditing(r.id);
                        setDraft('');
                      }}
                    >
                      <MessageSquareText /> Reply
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        open={!!reporting}
        onOpenChange={(o) => {
          if (!o) {
            setReporting(null);
            setReason('');
          }
        }}
        title="Report this review"
        description="Use this for fake, abusive or off-topic reviews. Honest criticism stays up."
        footer={
          <>
            <Button variant="outline" onClick={() => setReporting(null)}>
              Cancel
            </Button>
            <Button onClick={submitReport} loading={sending}>
              Send report
            </Button>
          </>
        }
      >
        <label htmlFor="report-reason" className="text-label">
          What&apos;s wrong with it?
        </label>
        <Textarea
          id="report-reason"
          className="mt-1.5"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. This person never visited — no bill on record, posted the same text on other businesses."
        />
      </Modal>
    </BusinessLayout>
  );
}
