'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert,
  Eye,
  ArrowUpRight,
  Building2,
  User,
  Clock,
  AlertTriangle,
  TrendingUp,
  Info,
  CheckCircle2,
  Flag,
  Search,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── MOCK DATA — Platform-escalated bills only ─────────────────────────

const ESCALATED_BILLS = [
  {
    id: 'esc-001',
    business: 'Luxe Salon & Spa',
    customer: { name: 'Ananya Patel', email: 'ananya@example.com' },
    amount: 8500,
    billNumber: 'INV-10293',
    fraudScore: 0.72,
    escalatedBy: 'Business Owner',
    escalatedAt: '2026-05-21T08:30:00Z',
    reason: 'OCR confidence too low (51%), suspicious pattern detected',
    previousAttempts: 3,
    status: 'ESCALATED',
  },
  {
    id: 'esc-002',
    business: 'Urban Mart Grocery',
    customer: { name: 'Ravi Shankar', email: 'ravi@example.com' },
    amount: 18200,
    billNumber: 'INV-55932',
    fraudScore: 0.88,
    escalatedBy: 'Auto-Fraud Detector',
    escalatedAt: '2026-05-20T15:45:00Z',
    reason: 'Duplicate invoice hash detected. Same bill submitted 3 times in 48 hours',
    previousAttempts: 3,
    status: 'ESCALATED',
  },
  {
    id: 'esc-003',
    business: 'CloudBurst Electronics',
    customer: { name: 'Meena Iyer', email: 'meena@example.com' },
    amount: 95000,
    billNumber: 'INV-90001',
    fraudScore: 0.81,
    escalatedBy: 'Business Moderator',
    escalatedAt: '2026-05-19T12:00:00Z',
    reason: 'Unusually high amount for product category. Customer has no purchase history',
    previousAttempts: 1,
    status: 'ESCALATED',
  },
];

function FraudBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Fraud Score</span>
        <span className={cn('text-xs font-bold', pct >= 80 ? 'text-destructive' : pct >= 60 ? 'text-warning' : 'text-warning')}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div
          className={cn('h-1.5 rounded-full', pct >= 80 ? 'bg-destructive' : pct >= 60 ? 'bg-warning' : 'bg-warning')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function FraudEscalationsPage() {
  const [bills, setBills] = useState(ESCALATED_BILLS);
  const [reviewingItem, setReviewingItem] = useState<(typeof ESCALATED_BILLS)[0] | null>(null);
  const [search, setSearch] = useState('');

  const filtered = bills.filter(
    (b) =>
      !search ||
      b.business.toLowerCase().includes(search.toLowerCase()) ||
      b.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      b.billNumber.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Fraud Escalation Queue</h1>
            <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">
              {bills.length} Escalated
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Platform-level fraud escalations. Bills here have been escalated by businesses or auto-detected.
          </p>
        </div>

        {/* ── ARCHITECTURE NOTE ───────────────────────────────── */}
        <Card className="p-4 rounded-2xl border-info/20 bg-info/5">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-info/15 flex items-center justify-center shrink-0">
              <Info className="h-4 w-4 text-info" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-info mb-1">Admin Role — Read-Only Monitoring</h4>
              <p className="text-xs text-info/80 leading-relaxed">
                As Master Admin, you monitor fraud escalations raised by businesses. Bill verification is now
                managed by Business Owners and Business Moderators within each business. You may intervene
                via Super Admin override if platform policy requires it.
              </p>
            </div>
          </div>
        </Card>

        {/* ── STATS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Escalated', value: bills.length, icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'High Risk (>80%)', value: bills.filter((b) => b.fraudScore >= 0.8).length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Avg Fraud Score', value: `${Math.round((bills.reduce((a, b) => a + b.fraudScore, 0) / bills.length) * 100)}%`, icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', stat.bg)}>
                  <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
                </div>
              </div>
              <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* ── SEARCH ─────────────────────────────────────────── */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by business or bill #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 rounded-xl border-input bg-background text-sm"
          />
        </div>

        {/* ── ESCALATED BILL LIST ─────────────────────────────── */}
        {filtered.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary/20 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">No Escalations</h3>
            <p className="text-sm text-muted-foreground">Platform fraud queue is clear.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const fraudPct = Math.round(item.fraudScore * 100);
              return (
                <Card
                  key={item.id}
                  className={cn(
                    'p-5 rounded-2xl border-border bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all',
                    fraudPct >= 80 && 'border-l-2 border-l-destructive/60',
                    fraudPct >= 60 && fraudPct < 80 && 'border-l-2 border-l-warning/50',
                  )}
                >
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="flex-1 space-y-3">
                      {/* Bill header */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground">{item.business}</h3>
                            <span className="px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold flex items-center gap-0.5">
                              <ArrowUpRight className="h-3 w-3" />
                              Platform Escalated
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{item.customer.name}</span>
                            <span>·</span>
                            <span className="font-mono">{item.billNumber}</span>
                            <span>·</span>
                            <span>₹{item.amount.toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {new Date(item.escalatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      {/* Escalation reason */}
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/5 border border-destructive/10">
                        <Flag className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-destructive font-semibold mb-0.5">
                            Escalated by: {item.escalatedBy} • {item.previousAttempts} submission attempt{item.previousAttempts > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-foreground/80">{item.reason}</p>
                        </div>
                      </div>

                      {/* Fraud bar */}
                      <FraudBar score={item.fraudScore} />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col items-center justify-end gap-2 shrink-0">
                      <Button
                        onClick={() => setReviewingItem(item)}
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-border text-foreground hover:bg-muted gap-1.5 text-xs h-8 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 gap-1.5 text-xs h-8"
                        disabled
                        title="Super Admin action only"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" /> Intervene
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── DETAIL MODAL ─────────────────────────────────────── */}
        {reviewingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg p-6 rounded-2xl border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Escalation Detail
                </h3>
                <button onClick={() => setReviewingItem(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none cursor-pointer">×</button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Business</p>
                    <p className="font-semibold text-foreground">{reviewingItem.business}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Bill Amount</p>
                    <p className="font-bold text-foreground">₹{reviewingItem.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Customer</p>
                    <p className="text-foreground">{reviewingItem.customer.name}</p>
                    <p className="text-[10px] text-muted-foreground">{reviewingItem.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Bill Number</p>
                    <p className="font-mono text-foreground">{reviewingItem.billNumber}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-2">Fraud Score</p>
                  <FraudBar score={reviewingItem.fraudScore} />
                </div>

                <div className="px-3 py-3 rounded-xl bg-destructive/5 border border-destructive/10">
                  <p className="text-[10px] text-destructive font-semibold mb-1 flex items-center gap-1">
                    <Flag className="h-3 w-3" /> Escalation Reason
                  </p>
                  <p className="text-xs text-foreground/80">{reviewingItem.reason}</p>
                </div>

                <div className="px-3 py-3 rounded-xl bg-info/5 border border-info/10">
                  <p className="text-xs text-info flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    Intervention requires Super Admin authority. Contact your Super Admin or use the Super Admin panel.
                  </p>
                </div>

                <Button
                  onClick={() => setReviewingItem(null)}
                  className="w-full rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
