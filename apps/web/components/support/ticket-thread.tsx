'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { StatusPill } from '@/components/common/status-pill';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

export type TicketSummary = {
  id: string;
  subject: string;
  category: string;
  status: string;
  lastReplyAt: string;
  lastReplyBy: 'STAFF' | 'CUSTOMER' | string;
  createdAt: string;
  _count?: { messages: number };
  business?: { id: string; name: string } | null;
  opener?: { id: string; name?: string; email?: string } | null;
};

type Message = {
  id: string;
  body: string;
  fromStaff: boolean;
  createdAt: string;
  authorName: string;
};
type Ticket = TicketSummary & { messages: Message[] };

export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Waiting on support',
  PENDING: 'Waiting on you',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

/** Colour by who needs to act: amber when it's on the viewer, blue when waiting on the other side. */
export function ticketTone(
  status: string,
  staff = false,
): 'warning' | 'info' | 'success' | 'neutral' {
  if (status === 'RESOLVED') return 'success';
  if (status === 'CLOSED') return 'neutral';
  const onViewer = staff ? status === 'OPEN' : status === 'PENDING';
  return onViewer ? 'warning' : 'info';
}

const when = (d: string) =>
  new Date(d).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

/**
 * One support conversation. `staff` switches the reply box to support-agent mode and shows
 * the resolve/close controls; customers can close or reopen their own ticket.
 */
export function TicketThread({
  id,
  staff = false,
  onChanged,
}: {
  id: string;
  staff?: boolean;
  onChanged?: () => void;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await apiService.get<Ticket>(`/v1/support/tickets/${id}`);
    if (res.error) toast.error(res.error);
    else if (Array.isArray(res.data?.messages)) setTicket(res.data);
    else toast.error('This ticket could not be loaded.');
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [ticket?.messages.length]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    const res = await apiService.post(`/v1/support/tickets/${id}/messages`, { body: body.trim() });
    setSending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setBody('');
    await load();
    onChanged?.();
  };

  const setStatus = async (status: string) => {
    const res = await apiService.patch(`/v1/support/tickets/${id}/status`, { status });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      status === 'OPEN'
        ? 'Ticket reopened'
        : `Ticket ${TICKET_STATUS_LABEL[status]?.toLowerCase() ?? status.toLowerCase()}`,
    );
    await load();
    onChanged?.();
  };

  if (!ticket) return <div className="ui-skeleton h-64 rounded-xl" />;
  const closed = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill
          tone={ticketTone(ticket.status, staff)}
          label={TICKET_STATUS_LABEL[ticket.status] ?? ticket.status}
        />
        <span className="text-caption text-muted-foreground">
          {ticket.category.toLowerCase()} · opened {when(ticket.createdAt)}
        </span>
      </div>

      <ol className="max-h-[45dvh] space-y-3 overflow-y-auto pr-1" aria-label="Conversation">
        {ticket.messages.map((m) => {
          const mine = staff ? m.fromStaff : !m.fromStaff;
          return (
            <li key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5',
                  mine
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md bg-surface-sunken text-foreground',
                )}
              >
                <p
                  className={cn(
                    'text-caption font-semibold',
                    mine ? 'text-primary-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  {m.authorName} · {when(m.createdAt)}
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm">{m.body}</p>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      {closed && !staff ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-sunken p-3 text-sm">
          <span className="text-muted-foreground">
            This ticket is {ticket.status.toLowerCase()}.
          </span>
          <Button size="sm" variant="outline" onClick={() => setStatus('OPEN')}>
            Reopen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <label htmlFor={`reply-${id}`} className="sr-only">
            Reply
          </label>
          <Textarea
            id={`reply-${id}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={staff ? 'Reply to the customer…' : 'Add details or reply to support…'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {staff ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus('RESOLVED')}
                    disabled={closed}
                  >
                    Mark resolved
                  </Button>
                  {closed && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus('OPEN')}>
                      Reopen
                    </Button>
                  )}
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setStatus('CLOSED')}>
                  Close ticket
                </Button>
              )}
            </div>
            <Button size="sm" loading={sending} disabled={!body.trim()} onClick={send}>
              <Send /> Send
            </Button>
          </div>
          <p className="text-caption text-subtle-foreground">Ctrl + Enter to send</p>
        </div>
      )}
    </div>
  );
}
