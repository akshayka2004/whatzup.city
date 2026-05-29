'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flag, Plus } from 'lucide-react';

const flags = [
  // ── Release 1 — Billing & Trial Flags ────────────────────────────
  {
    key: 'ENABLE_SUBSCRIPTIONS',
    name: 'Subscriptions',
    description: 'Show subscription plans and upgrade flows in business dashboard',
    enabled: false,
    rollout: '0%',
    category: 'Release 1',
  },
  {
    key: 'ENABLE_PAYMENTS',
    name: 'Payments',
    description: 'Enable payment gateway and checkout flows',
    enabled: false,
    rollout: '0%',
    category: 'Release 1',
  },
  {
    key: 'ENABLE_BILLING_PORTAL',
    name: 'Billing Portal',
    description: 'Show billing portal, invoices and payment history to businesses',
    enabled: false,
    rollout: '0%',
    category: 'Release 1',
  },
  {
    key: 'ENABLE_TRIALS',
    name: 'Free Trials',
    description: '15-day free trial automatically starts on business approval',
    enabled: true,
    rollout: '100%',
    category: 'Release 1',
  },
  {
    key: 'ENABLE_INTRO_OFFER',
    name: 'Introductory Offer',
    description: '20% discount on first subscription — claimable during trial',
    enabled: true,
    rollout: '100%',
    category: 'Release 1',
  },
  // ── Platform Features ─────────────────────────────────────────────
  {
    key: 'verification-ocr-scanning',
    name: 'OCR Receipt Scanning',
    description: 'Automated OCR extraction for bill verification documents',
    enabled: true,
    rollout: '100%',
    category: 'Platform',
  },
  {
    key: 'recommendations-engine-v2',
    name: 'Vector Recommendation Fallback',
    description: 'Semantic vector similarity fallback for business recommendations',
    enabled: false,
    rollout: '15%',
    category: 'Platform',
  },
  {
    key: 'civic-notices-push-broadcast',
    name: 'Government Push Broadcasts',
    description: 'Push broadcast channel for civic alerts and government notices',
    enabled: true,
    rollout: '100%',
    category: 'Platform',
  },
];

const CATEGORY_ORDER = ['Release 1', 'Platform'];

export default function SuperAdminFlagsPage() {
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: flags.filter((f) => (f as any).category === cat),
  }));

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Feature Flags</h1>
            <p className="text-muted-foreground">
              Control feature rollout, billing activation, and experimental capabilities
            </p>
          </div>
          <Button className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Feature Flag
          </Button>
        </div>

        {grouped.map(({ category, items }) => (
          <div key={category}>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {category}
            </h2>
            <div className="space-y-3">
              {items.map((flag) => (
                <Card
                  key={flag.key}
                  className="p-5 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-2.5 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 ${
                          flag.enabled
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        <Flag className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{flag.name}</h3>
                        {(flag as any).description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{(flag as any).description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
                          {flag.key}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Rollout</p>
                        <p className="font-bold text-foreground text-sm mt-0.5">{flag.rollout}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          flag.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-white/5 text-muted-foreground border border-white/10'
                        }`}
                      >
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SuperAdminLayout>
  );
}
