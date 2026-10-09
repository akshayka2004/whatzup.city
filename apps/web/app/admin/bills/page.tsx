'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Eye, ShieldAlert, X } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, type Column } from '@/components/system/data-table';
import { Modal } from '@/components/system/modal';
import { StatusPill } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { formatINR } from '@/components/analytics/format';

type Escalation = {
  id: string;
  status: string;
  fraudScore: string | number | null;
  createdAt: string;
  rejectionReason?: string | null;
  bill?: {
    id: string;
    amount: string | number;
    billNumber?: string | null;
    billDate?: string;
    billImage?: string;
    user?: { id: string; name?: string; email?: string } | null;
    business?: { id: string; name: string } | null;
  } | null;
};

const PAGE_SIZE = 20;

function risk(score: Escalation['fraudScore']) {
  const n = score == null ? null : Number(score);
  if (n == null || !Number.isFinite(n)) return { label: 'Not scored', tone: 'neutral' as const };
  const pct = Math.round(n * 100);
  return {
    label: `${pct}% risk`,
    tone: pct >= 70 ? ('danger' as const) : pct >= 40 ? ('warning' as const) : ('success' as const),
  };
}

/**
 * Platform escalation queue: bills a business could not settle (owner/moderator escalated or
 * auto-flagged). Super admins decide; master admins see the queue read-only.
 */
export default function EscalatedBillsPage() {
  const { user } = useAuth();
  const canDecide = user?.rbacRole === 'SUPER_ADMIN' || user?.role === 'super-admin';
  const [rows, setRows] = useState<Escalation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Escalation | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiService.get<any>(`/v1/admin/bill-verifications/escalated?page=${page}`);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setError(null);
    setRows(res.data?.data ?? []);
    setTotal(res.data?.total ?? 0);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async () => {
    if (!active || !decision) return;
    if (decision === 'REJECTED' && reason.trim().length < 5) {
      toast.error('Add a short reason so the customer and business know why.');
      return;
    }
    setSaving(true);
    const res = await apiService.post(
      `/v1/admin/bill-verifications/${active.id}/platform-intervene`,
      {
        decision,
        reason: reason.trim() || undefined,
      },
    );
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(decision === 'APPROVED' ? 'Bill approved' : 'Bill rejected');
    setActive(null);
    setDecision(null);
    setReason('');
    load();
  };

  const columns: Column<Escalation>[] = [
    {
      key: 'business',
      header: 'Business',
      sortable: true,
      value: (r) => r.bill?.business?.name ?? '',
      cell: (r) =>
        r.bill?.business ? (
          <Link href={`/business/${r.bill.business.id}`} className="font-medium hover:underline">
            {r.bill.business.name}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'customer',
      header: 'Customer',
      value: (r) => r.bill?.user?.name ?? '',
      cell: (r) => r.bill?.user?.name ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      value: (r) => Number(r.bill?.amount ?? 0),
      cell: (r) => formatINR(Number(r.bill?.amount ?? 0)),
    },
    {
      key: 'fraudScore',
      header: 'Risk',
      sortable: true,
      value: (r) => (r.fraudScore == null ? -1 : Number(r.fraudScore)),
      cell: (r) => {
        const k = risk(r.fraudScore);
        return <StatusPill tone={k.tone} label={k.label} />;
      },
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
    {
      key: 'createdAt',
      header: 'Raised',
      sortable: true,
      value: (r) => r.createdAt,
      hideOnMobile: true,
      cell: (r) =>
        new Date(r.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          timeZone: 'Asia/Kolkata',
        }),
    },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title="Bill escalations"
        description={
          canDecide
            ? 'Bills a business could not settle. Review the receipt and decide; the customer and business are notified.'
            : 'Bills escalated to the platform. Super admins make the final decision; you have read-only access.'
        }
        meta={
          <StatusPill
            tone={total > 0 ? 'warning' : 'success'}
            label={`${total} open`}
            dot={false}
          />
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-card bg-danger-soft p-4 text-sm text-danger-soft-foreground"
        >
          {error}
        </div>
      ) : (
        <DataTable
          caption="Escalated bills"
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          onRowClick={(r) => setActive(r)}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          defaultSort={{ key: 'fraudScore', dir: 'desc' }}
          empty={{
            icon: ShieldAlert,
            title: 'No escalations',
            description:
              'Businesses are handling their own bill queues. Nothing needs the platform right now.',
          }}
          mobileCard={(r) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {r.bill?.business?.name ?? 'Unknown business'}
                </p>
                <p className="text-caption text-muted-foreground">
                  {formatINR(Number(r.bill?.amount ?? 0))} · {r.bill?.user?.name ?? 'Customer'}
                </p>
              </div>
              <StatusPill tone={risk(r.fraudScore).tone} label={risk(r.fraudScore).label} />
            </div>
          )}
        />
      )}

      <Modal
        open={!!active}
        onOpenChange={(o) => {
          if (!o) {
            setActive(null);
            setDecision(null);
            setReason('');
          }
        }}
        title={active?.bill?.business?.name ?? 'Escalated bill'}
        description={
          active
            ? `Raised ${new Date(active.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
            : undefined
        }
        size="lg"
        footer={
          canDecide ? (
            decision ? (
              <>
                <Button variant="outline" onClick={() => setDecision(null)}>
                  Back
                </Button>
                <Button
                  variant={decision === 'REJECTED' ? 'destructive' : 'default'}
                  loading={saving}
                  onClick={decide}
                >
                  {decision === 'APPROVED' ? 'Approve bill' : 'Reject bill'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="danger" onClick={() => setDecision('REJECTED')}>
                  <X /> Reject
                </Button>
                <Button onClick={() => setDecision('APPROVED')}>
                  <Check /> Approve
                </Button>
              </>
            )
          ) : undefined
        }
      >
        {active && (
          <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
            <div className="overflow-hidden rounded-xl border border-border bg-surface-sunken">
              {active.bill?.billImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.bill.billImage}
                  alt="Uploaded bill"
                  className="max-h-[50dvh] w-full object-contain"
                />
              ) : (
                <p className="p-6 text-center text-caption text-muted-foreground">
                  No image attached
                </p>
              )}
            </div>
            <dl className="grid content-start grid-cols-2 gap-4 text-sm">
              {[
                ['Amount', formatINR(Number(active.bill?.amount ?? 0))],
                ['Bill number', active.bill?.billNumber || '—'],
                [
                  'Bill date',
                  active.bill?.billDate
                    ? new Date(active.bill.billDate).toLocaleDateString('en-IN')
                    : '—',
                ],
                ['Customer', active.bill?.user?.name || '—'],
                ['Email', active.bill?.user?.email || (canDecide ? '—' : 'Hidden')],
                ['Risk', risk(active.fraudScore).label],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-caption text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
              {active.bill?.billImage && (
                <div className="col-span-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={active.bill.billImage} target="_blank" rel="noreferrer">
                      <Eye /> Open full image
                    </a>
                  </Button>
                </div>
              )}
              {decision && (
                <div className="col-span-2 space-y-1.5">
                  <label htmlFor="decision-reason" className="text-label">
                    {decision === 'REJECTED'
                      ? 'Reason (shared with customer and business)'
                      : 'Note (optional)'}
                  </label>
                  <Textarea
                    id="decision-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      decision === 'REJECTED'
                        ? 'e.g. Amount on receipt does not match the claim'
                        : 'Anything worth recording'
                    }
                  />
                </div>
              )}
            </dl>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
