'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flag, Plus, SwitchCamera } from 'lucide-react';

const flags = [
  {
    key: 'verification-ocr-scanning',
    name: 'OCR Receipt Scanning',
    enabled: true,
    rollout: '100%',
  },
  {
    key: 'recommendations-engine-v2',
    name: 'Vector Recommendation Fallback',
    enabled: false,
    rollout: '15%',
  },
  {
    key: 'civic-notices-push-broadcast',
    name: 'Government Push Broadcasts',
    enabled: true,
    rollout: '100%',
  },
];

export default function SuperAdminFlagsPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Feature Flags</h1>
            <p className="text-muted-foreground">
              Enable experimental features, target specific tenants, or configure rollout fractions
            </p>
          </div>
          <Button className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Plus className="h-4 w-4" />
            Add Feature Flag
          </Button>
        </div>

        <div className="space-y-4">
          {flags.map((flag) => (
            <Card
              key={flag.key}
              className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl h-11 w-11 flex items-center justify-center ${
                      flag.enabled
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    <Flag className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">{flag.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      key: {flag.key}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm border-t sm:border-t-0 pt-4 sm:pt-0 border-white/5">
                  <div>
                    <p className="text-xs text-muted-foreground">Rollout</p>
                    <p className="font-bold text-foreground text-base mt-0.5">{flag.rollout}</p>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-lg h-8 text-xs font-semibold hover:bg-white/5"
                  >
                    Modify Rollout
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
