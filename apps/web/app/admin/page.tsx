'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const approvalTrends = [
  { day: 'Mon', approvals: 12, rejections: 2 },
  { day: 'Tue', approvals: 19, rejections: 4 },
  { day: 'Wed', approvals: 15, rejections: 1 },
  { day: 'Thu', approvals: 25, rejections: 5 },
  { day: 'Fri', approvals: 32, rejections: 8 },
  { day: 'Sat', approvals: 10, rejections: 2 },
  { day: 'Sun', approvals: 14, rejections: 3 },
];

const recentLogs = [
  {
    id: 1,
    action: 'Approved "Gourmet Deli"',
    admin: 'Alex Moderator',
    time: '10 mins ago',
    status: 'success',
  },
  {
    id: 2,
    action: 'Flagged review id #12455',
    admin: 'Automated Bot',
    time: '45 mins ago',
    status: 'warning',
  },
  {
    id: 3,
    action: 'Rejected "Fake Spa Outlet"',
    admin: 'Alex Moderator',
    time: '2 hours ago',
    status: 'error',
  },
  {
    id: 4,
    action: 'Updated category listing settings',
    admin: 'Alex Moderator',
    time: '4 hours ago',
    status: 'info',
  },
];

export default function AdminDashboardPage() {
  const stats = [
    {
      label: 'Pending Approvals',
      value: '24',
      change: '+12% from yesterday',
      icon: CheckSquare,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      label: 'Flagged Reports',
      value: '18',
      change: '-5% since last week',
      icon: AlertTriangle,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      label: 'Active Businesses',
      value: '1,420',
      change: '+38 new this month',
      icon: Users,
      color: 'text-purple-500 bg-purple-500/10',
    },
    {
      label: 'Fraud Warnings',
      value: '2',
      change: 'Critical severity',
      icon: ShieldAlert,
      color: 'text-rose-500 bg-rose-500/10',
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
          <Button className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground">
            <Activity className="h-4 w-4" />
            Live Audit Stream
          </Button>
        </div>

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

        {/* Main Section */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Chart Card */}
          <Card className="lg:col-span-8 p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Verification Activity</h3>
                  <p className="text-xs text-muted-foreground">
                    Approval and rejection metrics for this week.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                  <TrendingUp className="h-3.5 w-3.5" />
                  92.4% success rate
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={approvalTrends}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="oklch(0.25 0 0)"
                    />
                    <XAxis dataKey="day" stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} />
                    <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#121212',
                        borderColor: 'oklch(0.25 0 0)',
                        borderRadius: '12px',
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Bar
                      dataKey="approvals"
                      fill="oklch(0.65 0.15 280)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="rejections"
                      fill="oklch(0.5 0.15 25)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Activity Logs */}
          <Card className="lg:col-span-4 p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Moderator Audit Log</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Real-time moderator actions across the platform.
              </p>

              <div className="space-y-4">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                  >
                    <div className="w-1.5 h-10 rounded-full bg-primary flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{log.action}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                        <span>{log.admin}</span>
                        <span>{log.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-6 rounded-xl border-white/10 text-foreground hover:bg-white/5"
            >
              View Complete Audit Logs
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
