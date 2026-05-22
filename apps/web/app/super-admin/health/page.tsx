'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, Cpu, Database, Server } from 'lucide-react';

const healthIndicators = [
  { name: 'Primary database (Postgres)', type: 'DATABASE', status: 'HEALTHY', latency: '4ms' },
  { name: 'In-Memory cache (Redis)', type: 'CACHE', status: 'HEALTHY', latency: '1ms' },
  { name: 'Search Engine (Typesense)', type: 'SEARCH', status: 'DEGRADED', latency: '12ms' },
];

export default function SuperAdminHealthPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Platform Health & Status</h1>
            <p className="text-muted-foreground">
              Monitor real-time network latency, database status, and search cluster nodes
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-white/10 text-foreground hover:bg-white/5 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {healthIndicators.map((srv) => (
            <Card
              key={srv.name}
              className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
                  {srv.type === 'DATABASE' ? (
                    <Database className="h-5 w-5" />
                  ) : (
                    <Server className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    srv.status === 'HEALTHY'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {srv.status}
                </span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-1">{srv.name}</h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-4">
                <span>Latency</span>
                <span className="font-mono text-foreground font-semibold">{srv.latency}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
