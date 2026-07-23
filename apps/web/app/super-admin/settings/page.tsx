'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Settings, Shield, Server } from 'lucide-react';

export default function SuperAdminSettingsPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Global System Parameters</h1>
            <p className="text-muted-foreground">
              Adjust system-wide settings, multi-tenant limits, and automatic backup cron rules
            </p>
          </div>
          <Button className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Tenant Restrictions
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-semibold uppercase">
                  Max Allowed Listings Per Tenant
                </label>
                <input
                  type="text"
                  defaultValue="1,000 listings"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-semibold uppercase">
                  Default Allowed File Upload Size
                </label>
                <input
                  type="text"
                  defaultValue="10 MB"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Server className="h-5 w-5 text-success" />
              Database Backups & Syncs
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-semibold uppercase">
                  Automatic Backup Interval Cron
                </label>
                <input
                  type="text"
                  defaultValue="0 2 * * * (Daily at 2 AM)"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-2 font-semibold uppercase">
                  Log Retention Period
                </label>
                <input
                  type="text"
                  defaultValue="90 Days"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
