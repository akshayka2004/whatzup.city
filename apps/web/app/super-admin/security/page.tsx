'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Eye, Settings } from 'lucide-react';

const tenantThreats = [
  {
    id: 1,
    tenant: 'Acme Corp',
    issue: 'Repeated unauthorized access attempts',
    severity: 'HIGH',
    resolved: false,
  },
  {
    id: 2,
    tenant: 'Global Inc',
    issue: 'Suspicious IP address range request',
    severity: 'LOW',
    resolved: true,
  },
];

export default function SuperAdminSecurityPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Cross-Tenant Security Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor platform security issues, track threat logs, and enforce network bounds
          </p>
        </div>

        <div className="space-y-4">
          {tenantThreats.map((item) => (
            <Card
              key={item.id}
              className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl h-11 w-11 flex items-center justify-center ${
                      item.severity === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">{item.tenant}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.issue}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm border-t sm:border-t-0 pt-4 sm:pt-0 border-white/5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.severity === 'HIGH'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-white/5 text-muted-foreground border border-white/10'
                    }`}
                  >
                    {item.severity} Risk
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-lg border-white/10 text-slate-300"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-lg h-8 px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs"
                    >
                      Block Tenant
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
