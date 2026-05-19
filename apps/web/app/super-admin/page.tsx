'use client';

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

const tenantGrowthData = [
  { month: 'Jan', tenants: 45, apiCalls: 12000 },
  { month: 'Feb', tenants: 58, apiCalls: 18000 },
  { month: 'Mar', tenants: 72, apiCalls: 22000 },
  { month: 'Apr', tenants: 94, apiCalls: 31000 },
  { month: 'May', tenants: 120, apiCalls: 45000 },
];

const recentIncidents = [
  {
    id: 1,
    event: 'Backup completed successfully',
    type: 'info',
    server: 'AWS-DB-Primary',
    time: '15 mins ago',
  },
  {
    id: 2,
    event: 'API keys regenerated for Tenant "RetailCorp"',
    type: 'warning',
    server: 'Auth-Node-4',
    time: '2 hours ago',
  },
  {
    id: 3,
    event: 'Spike in API requests (>98% threshold)',
    type: 'error',
    server: 'Gateway-LB-1',
    time: '4 hours ago',
  },
  {
    id: 4,
    event: 'Provisioned new tenant "F&B Solutions"',
    type: 'success',
    server: 'Tenant-Provision-Manager',
    time: '6 hours ago',
  },
];

export default function SuperAdminDashboardPage() {
  const stats = [
    {
      label: 'Active Tenants',
      value: '120',
      change: '+22% growth this Q',
      icon: Building2,
      color: 'text-violet-500 bg-violet-500/10',
    },
    {
      label: 'API Key Registrations',
      value: '840',
      change: '+64 active keys today',
      icon: Key,
      color: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      label: 'System CPU Load',
      value: '24.2%',
      change: 'Normal limits',
      icon: Cpu,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: 'Disk Utilization',
      value: '42.8 GB',
      change: '54.6 GB available',
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
          {/* Tenant Chart Card */}
          <Card className="lg:col-span-8 p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    SaaS Tenant Growth & Traffic
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Monthly active tenants mapped alongside overall API Gateway requests.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-500 bg-violet-500/10 px-3 py-1 rounded-full">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Scalability is nominal
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={tenantGrowthData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.65 0.15 280)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="oklch(0.65 0.15 280)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="oklch(0.25 0 0)"
                    />
                    <XAxis
                      dataKey="month"
                      stroke="oklch(0.65 0 0)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="oklch(0.65 0 0)" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: '#121212',
                        borderColor: 'oklch(0.25 0 0)',
                        borderRadius: '12px',
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tenants"
                      stroke="oklch(0.65 0.15 280)"
                      fillOpacity={1}
                      fill="url(#colorTenants)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Infrastructure Health */}
          <Card className="lg:col-span-4 p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Incident & Events Feed</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Real-time infrastructure system logging.
              </p>

              <div className="space-y-4">
                {recentIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                  >
                    <div className="w-1.5 h-10 rounded-full bg-violet-600 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {incident.event}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono text-[10px] bg-white/5 px-1.5 py-0.5 rounded">
                          {incident.server}
                        </span>
                        <span>{incident.time}</span>
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
              Launch AWS Control Center
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
