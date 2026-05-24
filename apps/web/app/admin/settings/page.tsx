'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Save, Shield, Hammer } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">System Configurations</h1>
            <p className="text-muted-foreground">
              Adjust security rules, OCR verification limits, and platform thresholds
            </p>
          </div>
          <Button className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-violet-400" />
              Verification Rules
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-semibold uppercase">
                  Auto-Approve OCR Score Threshold
                </label>
                <input
                  type="text"
                  defaultValue="95%"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-semibold uppercase">
                  Fraud High-Risk Score Threshold
                </label>
                <input
                  type="text"
                  defaultValue="70%"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Hammer className="h-5 w-5 text-emerald-400" />
              Rate Limiting Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-semibold uppercase">
                  Max Inbound Requests Per Minute
                </label>
                <input
                  type="text"
                  defaultValue="100 reqs/min"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-semibold uppercase">
                  Global API Ban TTL
                </label>
                <input
                  type="text"
                  defaultValue="24 Hours"
                  className="w-full bg-secondary border border-white/10 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
