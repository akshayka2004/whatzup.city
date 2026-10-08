'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LifeBuoy, Plus } from 'lucide-react';
import { SectionCard } from '@/components/system/section-card';
import { Modal } from '@/components/system/modal';
import { StatusPill } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { TICKET_STATUS_LABEL, TicketThread, ticketTone, type TicketSummary } from './ticket-thread';

const CATEGORIES = [
  ['GENERAL', 'General question'],
  ['BILLING', 'Plan or payment'],
  ['LISTING', 'My public listing'],
  ['BILLS', 'Customer bills & points'],
  ['TECHNICAL', 'Something is broken'],
  ['ACCOUNT', 'Login or team access'],
] as const;

export function BusinessTickets({ businessId }: { businessId: string | null }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<string>('GENERAL');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const openId = sp.get('ticket');

  const load = useCallback(async () => {
    const res = await apiService.get<TicketSummary[]>(`/v1/support/tickets${businessId ? `?businessId=${businessId}` : ''}`);
    setTickets(!res.error && Array.isArray(res.data) ? res.data : []);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (id) next.set('ticket', id);
    else next.delete('ticket');
    router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };

  const create = async () => {
    if (subject.trim().length < 4 || body.trim().length < 10) {
      toast.error('Add a subject and a sentence or two about the problem.');
      return;
    }
    setSaving(true);
    const res = await apiService.post<{ id: string }>('/v1/support/tickets', {
      subject: subject.trim(),
      body: body.trim(),
      category,
      businessId: businessId ?? undefined,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Ticket sent. We usually reply within one working day.');
    setCreating(false);
    setSubject('');
    setBody('');
    await load();
    if (res.data?.id) setOpen(res.data.id);
  };

  const active = tickets?.find((t) => t.id === openId);

  return (
    <SectionCard
      icon={LifeBuoy}
      title="Your support tickets"
      description="Conversations with the Whtzup.city team."
      action={
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> New ticket
        </Button>
      }
      padded={false}
    >
      {tickets == null ? (
        <div className="space-y-2 px-6 pb-6">
          <div className="ui-skeleton h-12" />
          <div className="ui-skeleton h-12" />
        </div>
      ) : tickets.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No tickets yet. Open one if something needs our attention.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {tickets.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setOpen(t.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-secondary/50 sm:px-6"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t.subject}</span>
                  <span className="block text-caption text-muted-foreground">
                    Updated{' '}
                    {new Date(t.lastReplyAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    {t._count ? ` · ${t._count.messages} message${t._count.messages === 1 ? '' : 's'}` : ''}
                  </span>
                </span>
                <StatusPill tone={ticketTone(t.status)} label={TICKET_STATUS_LABEL[t.status] ?? t.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="New support ticket"
        description="Tell us what happened. Screens and amounts help us solve it faster."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={create}>
              Send
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <label htmlFor="ticket-subject" className="text-label">
              Subject
            </label>
            <Input id="ticket-subject" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Payment verified but plan still inactive" />
          </div>
          <div className="space-y-1.5">
            <span className="text-label">Topic</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Topic" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ticket-body" className="text-label">
              Details
            </label>
            <Textarea id="ticket-body" rows={5} value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
      </Modal>

      <Modal open={!!openId} onOpenChange={(o) => !o && setOpen(null)} title={active?.subject ?? 'Support ticket'} size="lg">
        {openId && <TicketThread id={openId} onChanged={load} />}
      </Modal>
    </SectionCard>
  );
}
