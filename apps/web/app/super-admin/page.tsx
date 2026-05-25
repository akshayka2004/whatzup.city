'use client';

import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Cpu,
  HardDrive,
  Key,
  Activity,
  Database,
  ArrowUpRight,
  TrendingUp,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { apiService } from '@/lib/services/api-service';

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    apiService
      .get<any>('/v1/analytics/overview')
      .then((res) => {
        if (res.data && !res.error) setOverview(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: 'Active Tenants',
      value: overview?.totalTenants ?? overview?.activeTenants ?? '—',
      change: overview?.tenantGrowth ?? 'Loading...',
      icon: Building2,
      color: 'text-violet-500 bg-violet-500/10',
    },
    {
      label: 'Total Businesses',
      value: overview?.totalBusinesses ?? '—',
      change: overview?.businessGrowth ?? '—',
      icon: Key,
      color: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      label: 'Total Users',
      value: overview?.totalUsers ?? '—',
      change: overview?.userGrowth ?? '—',
      icon: Cpu,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: 'Active Offers',
      value: overview?.activeOffers ?? '—',
      change: overview?.offersGrowth ?? '—',
      icon: HardDrive,
      color: 'text-rose-500 bg-rose-500/10',
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Super Admin Portal
            </h1>
            <p className="text-muted-foreground text-sm">
              Tenant billing oversight, infrastructure analytics, and cluster monitoring.
            </p>
          </div>
          <Button className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Database className="h-4 w-4" />
            Infrastructure Logs
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="p-6 rounded-2xl hover:shadow-lg transition-all duration-300 border-white/5 bg-card/60 backdrop-blur-xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{stat.change}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-3xl font-extrabold text-foreground mt-1 tracking-tight">
                  {stat.value}
                </h3>
              </Card>
            );
          })}
        </div>

        {/* No time-series data available from analytics/overview — show placeholder */}
        <Card className="p-8 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl text-center">
          <TrendingUp className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">
            Tenant growth charts require a time-series analytics endpoint.
            {/* TODO: Wire to time-series endpoint when available */}
          </p>
        </Card>
        </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
