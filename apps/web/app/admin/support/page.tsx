'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LifeBuoy } from 'lucide-react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { PageHeader } from '@/components/system/page-header';
import { DataTable, type Column } from '@/components/system/data-table';
import { FilterChip, ChipRow } from '@/components/system/filter-chip';
import { Modal } from '@/components/system/modal';
import { StatusPill } from '@/components/common/status-pill';
import { apiService } from '@/lib/services/api-service';
import { TicketThread, ticketTone, type TicketSummary } from '@/components/support/ticket-thread';

const STAFF_LABEL: Record<string, string> = {
  OPEN: 'Needs reply',
  PENDING: 'Waiting on customer',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

function Inbox() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED' | ''>('OPEN');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TicketSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const openId = sp.get('ticket');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiService.get<any>(
      `/v1/support/tickets/admin/all?page=${page}${status ? `&status=${status}` : ''}`,
    );
    setLoading(false);
    setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    setTotal(res.data?.total ?? 0);
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (id) next.set('ticket', id);
    else next.delete('ticket');
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };

  const columns: Column<TicketSummary>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      cell: (t) => <span className="font-medium">{t.subject}</span>,
    },
    {
      key: 'business',
      header: 'Business',
      value: (t) => t.business?.name ?? '',
      cell: (t) => t.business?.name ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'opener',
      header: 'From',
      value: (t) => t.opener?.name ?? '',
      cell: (t) => t.opener?.name ?? t.opener?.email ?? '—',
      hideOnMobile: true,
    },
    { key: 'category', header: 'Topic', cell: (t) => t.category.toLowerCase(), hideOnMobile: true },
    {
      key: 'status',
      header: 'Status',
      cell: (t) => (
        <StatusPill tone={ticketTone(t.status, true)} label={STAFF_LABEL[t.status] ?? t.status} />
      ),
    },
    {
      key: 'lastReplyAt',
      header: 'Last activity',
      sortable: true,
      value: (t) => t.lastReplyAt,
      cell: (t) =>
        new Date(t.lastReplyAt).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        }),
    },
  ];

  const active = rows.find((t) => t.id === openId);

  return (
    <>
      <PageHeader
        title="Support inbox"
        description="Tickets from businesses and customers. Replying moves a ticket to “waiting on customer”."
      />
      <ChipRow label="Status" className="mb-4">
        {(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED', ''] as const).map((s) => (
          <FilterChip
            key={s || 'all'}
            selected={status === s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s ? STAFF_LABEL[s] : 'All'}
          </FilterChip>
        ))}
      </ChipRow>
      <DataTable
        caption="Support tickets"
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        loading={loading}
        onRowClick={(t) => setOpen(t.id)}
        page={page}
        pageSize={25}
        total={total}
        onPageChange={setPage}
        empty={{
          icon: LifeBuoy,
          title: status === 'OPEN' ? 'Inbox zero' : 'No tickets here',
          description: 'New tickets from businesses appear here.',
        }}
        mobileCard={(t) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{t.subject}</p>
              <p className="truncate text-caption text-muted-foreground">
                {t.business?.name ?? t.opener?.name ?? ''}
              </p>
            </div>
            <StatusPill
              tone={ticketTone(t.status, true)}
              label={STAFF_LABEL[t.status] ?? t.status}
            />
          </div>
        )}
      />
      <Modal
        open={!!openId}
        onOpenChange={(o) => !o && setOpen(null)}
        title={active?.subject ?? 'Support ticket'}
        description={active?.business?.name ?? active?.opener?.email ?? undefined}
        size="lg"
      >
        {openId && <TicketThread id={openId} staff onChanged={load} />}
      </Modal>
    </>
  );
}

export default function SupportInboxPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="ui-skeleton h-96 rounded-card" />}>
        <Inbox />
      </Suspense>
    </AdminLayout>
  );
}
