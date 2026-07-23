'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LifeBuoy, MessageSquare, Search, Send, Clock,
  CheckCircle2, X, User, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketMessage {
  id: string;
  from: 'user' | 'support';
  text: string;
  timestamp: string;
}

interface Ticket {
  id: string;
  title: string;
  category: string;
  status: TicketStatus;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-warning/15 text-warning border-warning/20' },
  in_progress: { label: 'In Progress', color: 'bg-info/15 text-info border-info/20' },
  resolved: { label: 'Resolved', color: 'bg-success/15 text-success border-success/20' },
  closed: { label: 'Closed', color: 'bg-muted text-muted-foreground border-border' },
};

const STORAGE_KEY = 'business_tickets';

function loadTickets(): Ticket[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

// ── Component ─────────────────────────────────────────────────────────

export default function BusinessSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all');

  useEffect(() => {
    const t = loadTickets();
    setTickets(t);
    if (t.length > 0) setSelected(t[0]);
  }, []);

  const filtered = tickets.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search &&
      !t.title.toLowerCase().includes(search.toLowerCase()) &&
      !t.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const open = tickets.filter((t) => t.status === 'open').length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const resolved = tickets.filter((t) => t.status === 'resolved').length;

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selected) return;
    const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const msg: TicketMessage = {
      id: Date.now().toString(),
      from: 'support',
      text: replyText.trim(),
      timestamp: `${now}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    };
    const updated = tickets.map((t) =>
      t.id === selected.id
        ? { ...t, messages: [...t.messages, msg], status: 'in_progress' as TicketStatus, updatedAt: now }
        : t
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTickets(updated);
    setSelected(updated.find((t) => t.id === selected.id)!);
    setReplyText('');
  };

  const handleStatusChange = (status: TicketStatus) => {
    if (!selected) return;
    const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const updated = tickets.map((t) =>
      t.id === selected.id ? { ...t, status, updatedAt: now } : t
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTickets(updated);
    setSelected(updated.find((t) => t.id === selected.id)!);
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Customer Support</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Respond to customer queries and issues.</p>
        </div>

        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Open', value: open, color: 'text-warning bg-warning/10' },
            { label: 'In Progress', value: inProgress, color: 'text-info bg-info/10' },
            { label: 'Resolved', value: resolved, color: 'text-success bg-success/10' },
          ].map((s) => (
            <Card key={s.label} className="p-4 rounded-2xl border-border bg-card/60 backdrop-blur-xl flex items-center gap-3">
              <div className={`p-2 rounded-xl ${s.color}`}>
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-extrabold text-foreground">{s.value}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6" style={{ minHeight: '540px' }}>
          {/* Ticket list */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 rounded-xl border-border bg-secondary text-sm"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="h-9 rounded-xl border border-border bg-card text-xs text-foreground px-2 cursor-pointer"
              >
                <option value="all">All</option>
                {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
                  <option key={id} value={id}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">No tickets found.</p>
            )}

            {filtered.map((ticket) => {
              const cfg = STATUS_CONFIG[ticket.status];
              const active = selected?.id === ticket.id;
              return (
                <Card
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all',
                    active ? 'border-primary/40 bg-primary/5' : 'border-border bg-card/60 hover:bg-secondary',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{ticket.title}</p>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0', cfg.color)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{ticket.customerName}</span>
                    <span className="mx-1">·</span>
                    <span>{ticket.updatedAt}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Thread */}
          <div className="lg:col-span-2">
            {selected ? (
              <Card className="rounded-2xl border-border bg-card/60 backdrop-blur-xl flex flex-col h-full">
                {/* Header */}
                <div className="p-5 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">{selected.id} · {selected.customerName}</p>
                      <h2 className="text-base font-bold text-foreground">{selected.title}</h2>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(selected.status === 'open' || selected.status === 'in_progress') && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange('resolved')}
                          className="h-7 rounded-lg bg-success hover:bg-success text-white cursor-pointer text-xs px-3 gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Resolve
                        </Button>
                      )}
                      {selected.status !== 'closed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange('closed')}
                          className="h-7 rounded-lg border-border text-muted-foreground hover:bg-secondary cursor-pointer text-xs px-2"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {selected.messages.map((msg) => (
                    <div key={msg.id} className={cn('flex', msg.from === 'support' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        msg.from === 'support'
                          ? 'bg-primary/20 text-foreground rounded-tr-sm'
                          : 'bg-secondary text-foreground rounded-tl-sm',
                      )}>
                        <p className="text-xs font-semibold mb-1 text-muted-foreground">
                          {msg.from === 'support' ? 'You (Business)' : selected.customerName}
                        </p>
                        <p className="text-sm text-foreground">{msg.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply */}
                {selected.status !== 'closed' && (
                  <form onSubmit={handleReply} className="p-4 border-t border-border flex gap-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Reply to customer…"
                      className="flex-1 rounded-xl border-border bg-secondary text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!replyText.trim()}
                      className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer px-4 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
              </Card>
            ) : (
              <Card className="p-12 rounded-2xl border-border bg-card/40 text-center flex flex-col items-center justify-center h-full">
                <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-base font-semibold text-foreground">Select a ticket</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}
