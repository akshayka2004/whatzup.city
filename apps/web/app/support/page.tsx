'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LifeBuoy, Plus, MessageSquare, Clock, CheckCircle2,
  AlertCircle, X, ChevronRight, Search, ArrowLeft,
  Tag, Send, Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketCategory = 'billing' | 'account' | 'technical' | 'offer' | 'general';

interface TicketMessage {
  id: string;
  from: 'user' | 'support';
  text: string;
  timestamp: string;
}

interface Ticket {
  id: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

const STORAGE_KEY = 'support_tickets';

const CATEGORIES: { id: TicketCategory; label: string }[] = [
  { id: 'billing', label: 'Billing' },
  { id: 'account', label: 'Account' },
  { id: 'technical', label: 'Technical' },
  { id: 'offer', label: 'Offers / Bills' },
  { id: 'general', label: 'General' },
];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: any }> = {
  open: { label: 'Open', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20', icon: MessageSquare },
  resolved: { label: 'Resolved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-slate-500/15 text-slate-400 border-slate-500/20', icon: X },
};

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'TKT-001',
    title: 'Unable to redeem offer at Bella Restaurant',
    category: 'offer',
    status: 'in_progress',
    createdAt: '19 May 2026',
    updatedAt: '21 May 2026',
    messages: [
      { id: '1', from: 'user', text: "I tried to redeem the 10% off offer at Bella Restaurant but it kept showing 'already claimed'. I haven't claimed it before.", timestamp: '19 May 2026, 2:30 PM' },
      { id: '2', from: 'support', text: "Thanks for reaching out! We're looking into this. Could you share your account email and the offer ID?", timestamp: '20 May 2026, 10:00 AM' },
    ],
  },
  {
    id: 'TKT-002',
    title: 'Bill rejected without reason',
    category: 'billing',
    status: 'open',
    createdAt: '22 May 2026',
    updatedAt: '22 May 2026',
    messages: [
      { id: '1', from: 'user', text: "I uploaded a bill for Health Plus Clinic but it was rejected. The bill is genuine and within 7 days.", timestamp: '22 May 2026, 9:00 AM' },
    ],
  },
];

function loadTickets(): Ticket[] {
  if (typeof window === 'undefined') return INITIAL_TICKETS;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : INITIAL_TICKETS;
  } catch { return INITIAL_TICKETS; }
}

function saveTickets(t: Ticket[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

// ── Component ─────────────────────────────────────────────────────────

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all');

  // New ticket form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('general');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => { setTickets(loadTickets()); }, []);

  const filtered = tickets.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const ticket: Ticket = {
      id: `TKT-${String(Date.now()).slice(-4)}`,
      title: newTitle.trim(),
      category: newCategory,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      messages: [{ id: '1', from: 'user', text: newDesc.trim(), timestamp: `${now}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` }],
    };
    const updated = [ticket, ...tickets];
    setTickets(updated);
    saveTickets(updated);
    setShowNew(false);
    setNewTitle(''); setNewCategory('general'); setNewDesc('');
    setSelected(ticket);
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selected) return;
    const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const msg: TicketMessage = {
      id: Date.now().toString(),
      from: 'user',
      text: replyText.trim(),
      timestamp: `${now}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    };
    const updated = tickets.map((t) =>
      t.id === selected.id
        ? { ...t, messages: [...t.messages, msg], updatedAt: now }
        : t
    );
    setTickets(updated);
    saveTickets(updated);
    const updatedTicket = updated.find((t) => t.id === selected.id)!;
    setSelected(updatedTicket);
    setReplyText('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-foreground cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              <span className="font-bold text-foreground">Help & Support</span>
            </div>
          </div>
          <Button
            onClick={() => { setShowNew(true); setSelected(null); }}
            size="sm"
            className="rounded-xl gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Ticket
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Ticket List ─────────────────────────────────── */}
          <div className="space-y-3">
            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tickets…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 rounded-xl border-white/10 bg-white/5 text-sm"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="h-9 rounded-xl border border-white/10 bg-card text-xs text-foreground px-2 cursor-pointer"
              >
                <option value="all">All</option>
                {Object.entries(STATUS_CONFIG).map(([id, cfg]) => (
                  <option key={id} value={id}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 && (
              <Card className="p-8 rounded-2xl border-white/5 bg-card/40 text-center">
                <LifeBuoy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tickets found.</p>
              </Card>
            )}

            {filtered.map((ticket) => {
              const cfg = STATUS_CONFIG[ticket.status];
              const StatusIcon = cfg.icon;
              const active = selected?.id === ticket.id;
              return (
                <Card
                  key={ticket.id}
                  onClick={() => { setSelected(ticket); setShowNew(false); }}
                  className={cn(
                    'p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md',
                    active ? 'border-primary/40 bg-primary/5' : 'border-white/5 bg-card/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{ticket.title}</p>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0', cfg.color)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    <span className="capitalize">{ticket.category}</span>
                    <span className="mx-1">·</span>
                    <span>{ticket.id}</span>
                    <span className="mx-1">·</span>
                    <span>{ticket.updatedAt}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ── Ticket Detail / New Ticket ─────────────────── */}
          <div className="lg:col-span-2">
            {/* New Ticket Form */}
            {showNew && (
              <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
                <h2 className="text-base font-bold text-foreground mb-5 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  New Support Ticket
                </h2>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Issue Title</label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Brief summary of your issue"
                      className="rounded-xl border-white/10 bg-white/5 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                      className="w-full h-9 rounded-xl border border-white/10 bg-card text-sm text-foreground px-3 cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Describe your issue in detail…"
                      rows={5}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 text-sm text-foreground px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setShowNew(false)}
                      variant="outline"
                      className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer"
                    >
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Ticket Thread */}
            {selected && !showNew && (
              <Card className="rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl flex flex-col" style={{ minHeight: '520px' }}>
                {/* Header */}
                <div className="p-5 border-b border-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{selected.id} · {selected.category}</p>
                      <h2 className="text-base font-bold text-foreground">{selected.title}</h2>
                    </div>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', STATUS_CONFIG[selected.status].color)}>
                      {STATUS_CONFIG[selected.status].label}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {selected.messages.map((msg) => (
                    <div key={msg.id} className={cn('flex', msg.from === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        msg.from === 'user'
                          ? 'bg-primary/20 text-foreground rounded-tr-sm'
                          : 'bg-white/5 text-foreground rounded-tl-sm',
                      )}>
                        <p className="text-xs font-semibold mb-1 text-muted-foreground">
                          {msg.from === 'user' ? 'You' : 'Support Team'}
                        </p>
                        <p className="text-sm text-foreground">{msg.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply */}
                {selected.status !== 'closed' && selected.status !== 'resolved' && (
                  <form onSubmit={handleReply} className="p-4 border-t border-white/5 flex gap-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a reply…"
                      className="flex-1 rounded-xl border-white/10 bg-white/5 text-sm"
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
            )}

            {/* Empty state */}
            {!selected && !showNew && (
              <Card className="p-12 rounded-2xl border-white/5 bg-card/40 text-center">
                <LifeBuoy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-base font-semibold text-foreground mb-1">Select a ticket to view</p>
                <p className="text-sm text-muted-foreground">Or open a new ticket for help with your issue.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
