'use client';

import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Server, Cpu, HardDrive } from 'lucide-react';

const clusters = [
  { name: 'Gateway Node 1', zone: 'US-East-1', cpu: '22%', ram: '1.4 / 4.0 GB', active: true },
  {
    name: 'Queue Background Worker 1',
    zone: 'US-East-1',
    cpu: '45%',
    ram: '2.1 / 4.0 GB',
    active: true,
  },
  {
    name: 'Analytics Precomputation Worker',
    zone: 'US-East-1',
    cpu: '8%',
    ram: '0.8 / 2.0 GB',
    active: true,
  },
];

export default function SuperAdminInfrastructurePage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Cluster Infrastructure Nodes</h1>
          <p className="text-muted-foreground">
            Monitor system compute capacities, container usages, and cloud region status
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {clusters.map((node) => (
            <Card
              key={node.name}
              className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
                  <Server className="h-5 w-5" />
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    node.active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/5 text-muted-foreground border border-white/10'
                  }`}
                >
                  {node.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-bold text-foreground text-lg mb-1">{node.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">Zone: {node.zone}</p>

              <div className="space-y-2 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3.5 w-3.5" /> CPU Usage
                  </span>
                  <span className="font-semibold text-foreground">{node.cpu}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" /> RAM Util
                  </span>
                  <span className="font-semibold text-foreground">{node.ram}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
