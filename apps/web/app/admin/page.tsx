'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/services/api-service';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [businessCount, setBusinessCount] = useState(0);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [successRate, setSuccessRate] = useState('—');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, bizRes, auditRes, funnelRes, overviewRes] = await Promise.allSettled([
        apiService.get<any>('/v1/admin/businesses/pending?limit=1'),
        apiService.get<any>('/v1/businesses?tenantId=default&limit=1'),
        apiService.get<any>('/v1/audit-logs?page=1'),
        apiService.get<any>('/v1/admin/onboarding/analytics/funnel'),
        apiService.get<any>('/v1/analytics/overview'),
      ]);

      if (pendingRes.status === 'fulfilled' && pendingRes.value.data) {
        setPendingCount(pendingRes.value.data.meta?.total ?? 0);
      }

      if (bizRes.status === 'fulfilled' && bizRes.value.data) {
        setBusinessCount(bizRes.value.data.meta?.total ?? 0);
      }

      if (auditRes.status === 'fulfilled' && auditRes.value.data) {
        setAuditLogs((auditRes.value.data.data || []).slice(0, 6));
      }

      if (overviewRes.status === 'fulfilled' && overviewRes.value.data) {
        setOverviewData(overviewRes.value.data);
      }

      if (funnelRes.status === 'fulfilled' && funnelRes.value.data) {
        const f = funnelRes.value.data;
        setFunnelData(f);
        // Build 2-bar chart: started vs approved/rejected for businesses
        const bf = f.businessFunnel || {};
        const started = bf.started || 0;
        const submitted = bf.submitted || 0;
        const approved = bf.approved || 0;
        const rejected = bf.rejected || 0;
        const total = approved + rejected;
        if (total > 0) {
          setSuccessRate(((approved / total) * 100).toFixed(1) + '%');
        }
        setChartData([
          { label: 'Started', approvals: started, rejections: 0 },
          { label: 'Submitted', approvals: submitted, rejections: 0 },
          { label: 'Approved', approvals: approved, rejections: 0 },
          { label: 'Rejected', approvals: 0, rejections: rejected },
        ]);
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = [
    {
      label: 'Pending Approvals',
      value: loading ? '…' : pendingCount.toLocaleString(),
      change: 'Awaiting review',
      icon: CheckSquare,
      color: 'text-blue-500 bg-blue-500/10',
      href: '/admin/approvals',
    },
    {
      label: 'Active Businesses',
      value: loading ? '…' : businessCount.toLocaleString(),
      change: 'Approved listings',
      icon: Users,
      color: 'text-purple-500 bg-purple-500/10',
      href: null,
    },
    {
      label: 'Business Onboarding',
      value: loading ? '…' : (funnelData?.businessFunnel?.started ?? 0).toLocaleString(),
      change: `${funnelData?.businessFunnel?.approved ?? 0} approved`,
      icon: Sparkles,
      color: 'text-emerald-500 bg-emerald-500/10',
      href: '/admin/approvals',
    },
    {
      label: 'Conversion Rate',
      value: loading ? '…' : successRate,
      change: 'Approve / (approve+reject)',
      icon: TrendingUp,
      color: 'text-cyan-500 bg-cyan-500/10',
      href: null,
    },
    {
      label: 'Audit Events',
      value: loading ? '…' : (auditLogs.length > 0 ? auditLogs.length + '+' : '0'),
      change: 'Recent actions',
      icon: ShieldAlert,
      color: 'text-rose-500 bg-rose-500/10',
      href: '/admin/audit',
    },
    {
      label: 'Offer Customers',
      value: loading ? '…' : (overviewData?.totalOfferCustomers ?? 0).toLocaleString(),
      change: 'Users who claimed offers',
      icon: AlertTriangle,
      color: 'text-amber-500 bg-amber-500/10',
      href: null,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Admin Overview</h1>
            <p className="text-muted-foreground text-sm">
              Platform moderation, verification queues, and system audits.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={fetchData}
              variant="outline"
              className="rounded-xl gap-2 border-white/10 hover:bg-white/5 text-muted-foreground"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href="/admin/approvals">
              <Button className="rounded-xl gap-2 font-medium bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
                Moderation Queue
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const card = (
              <Card
                key={stat.label}
                className="p-6 rounded-2xl hover:shadow-lg transition-all duration-300 border-white/5 bg-card/60 backdrop-blur-xl relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{stat.change}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-3xl font-extrabold text-foreground mt-1 tracking-tight">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    stat.value
                  )}
                </h3>
              </Card>
            );
            return stat.href ? (
              <Link key={stat.label} href={stat.href}>{card}</Link>
            ) : (
              <div key={stat.label}>{card}</div>
            );
          })}
        </div>

        {/* Main Section */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Funnel Chart */}
          <Card className="lg:col-span-8 p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Business Onboarding Funnel</h3>
                  <p className="text-xs text-muted-foreground">
                    Live conversion pipeline — started → submitted → approved / rejected.
                  </p>
                </div>
                {successRate !== '—' && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {successRate} approval rate
                  </div>
                )}
              </div>
              <div className="h-80 w-full">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No onboarding data yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.25 0 0)" />
                      <XAxis dataKey="label" stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} />
                      <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#121212', borderColor: 'oklch(0.25 0 0)', borderRadius: '12px' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="approvals" fill="oklch(0.65 0.15 280)" radius={[4, 4, 0, 0]} maxBarSize={40} name="Count" />
                      <Bar dataKey="rejections" fill="oklch(0.5 0.15 25)" radius={[4, 4, 0, 0]} maxBarSize={40} name="Rejected" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Card>

          {/* Live Audit Log */}
          <Card className="lg:col-span-4 p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Live Audit Log</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Recent moderator actions across the platform.
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No audit events yet.</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                    >
                      <div className="w-1.5 h-10 rounded-full bg-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate capitalize">
                          {log.action?.toLowerCase().replace(/_/g, ' ')}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                          <span className="truncate max-w-[100px]">
                            {log.user?.name || 'System'}
                          </span>
                          <span>{timeAgo(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link href="/admin/audit">
              <Button
                variant="outline"
                className="w-full mt-4 rounded-xl border-white/10 text-foreground hover:bg-white/5"
              >
                View All Audit Logs
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
