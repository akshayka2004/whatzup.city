'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Users, Receipt, Tag, Star, TrendingUp,
  ChevronUp, ChevronDown, Minus, Building2, Clock,
  BarChart3, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// ── Mock data generators ──────────────────────────────────────────────

const TRAFFIC_DATA = [
  { week: 'W1', visits: 142, newCustomers: 38 },
  { week: 'W2', visits: 165, newCustomers: 44 },
  { week: 'W3', visits: 138, newCustomers: 29 },
  { week: 'W4', visits: 192, newCustomers: 61 },
  { week: 'W5', visits: 210, newCustomers: 72 },
  { week: 'W6', visits: 184, newCustomers: 55 },
  { week: 'W7', visits: 229, newCustomers: 80 },
  { week: 'W8', visits: 248, newCustomers: 91 },
];

const OFFER_PERF = [
  { offer: '10% Off', issued: 120, redeemed: 88 },
  { offer: 'Buy 2 Get 1', issued: 85, redeemed: 72 },
  { offer: 'Free Coffee', issued: 200, redeemed: 141 },
  { offer: 'Loyalty Bonus', issued: 60, redeemed: 52 },
];

const PURCHASE_DATA = [
  { month: 'Nov', purchases: 87, revenue: 42800 },
  { month: 'Dec', purchases: 124, revenue: 61500 },
  { month: 'Jan', purchases: 98, revenue: 48200 },
  { month: 'Feb', purchases: 142, revenue: 70100 },
  { month: 'Mar', purchases: 161, revenue: 79400 },
  { month: 'Apr', purchases: 178, revenue: 87600 },
  { month: 'May', purchases: 195, revenue: 96200 },
];

const REVIEW_DATA = [
  { month: 'Nov', avg: 4.1, count: 12 },
  { month: 'Dec', avg: 4.3, count: 19 },
  { month: 'Jan', avg: 4.2, count: 22 },
  { month: 'Feb', avg: 4.5, count: 28 },
  { month: 'Mar', avg: 4.6, count: 31 },
  { month: 'Apr', avg: 4.7, count: 38 },
  { month: 'May', avg: 4.8, count: 42 },
];

const HOURLY_TRAFFIC = [
  { hour: '8am', visits: 12 },
  { hour: '9am', visits: 28 },
  { hour: '10am', visits: 45 },
  { hour: '11am', visits: 62 },
  { hour: '12pm', visits: 88 },
  { hour: '1pm', visits: 95 },
  { hour: '2pm', visits: 71 },
  { hour: '3pm', visits: 54 },
  { hour: '4pm', visits: 48 },
  { hour: '5pm', visits: 67 },
  { hour: '6pm', visits: 79 },
  { hour: '7pm', visits: 58 },
  { hour: '8pm', visits: 34 },
];

// ── Mock branch name lookup ───────────────────────────────────────────

const BRANCH_NAMES: Record<string, string> = {
  'branch-1': 'Main Branch',
  'branch-2': 'North Branch',
  'branch-3': 'South Branch',
};

const KPI_DATA = [
  {
    label: 'Total Visits',
    value: '1,508',
    change: '+14.2%',
    trend: 'up',
    icon: Users,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    label: 'Verified Purchases',
    value: '195',
    change: '+9.6%',
    trend: 'up',
    icon: Receipt,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Offer Redemptions',
    value: '353',
    change: '+18.4%',
    trend: 'up',
    icon: Tag,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    label: 'Avg Rating',
    value: '4.8',
    change: '+0.4',
    trend: 'up',
    icon: Star,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  {
    label: 'Peak Hour',
    value: '1 PM',
    change: '95 visits',
    trend: 'neutral',
    icon: Clock,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    label: 'Revenue (Est.)',
    value: '₹96.2K',
    change: '+10.4%',
    trend: 'up',
    icon: TrendingUp,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
];

const RANGES = ['7D', '30D', '90D', '1Y'] as const;
type Range = typeof RANGES[number];

const tooltipStyle = {
  background: '#121212',
  borderColor: 'oklch(0.25 0 0)',
  borderRadius: '12px',
  fontSize: '11px',
};

// ── Component ─────────────────────────────────────────────────────────

export default function BranchPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params?.id as string;
  const [range, setRange] = useState<Range>('30D');
  const [branchName, setBranchName] = useState('Branch');

  useEffect(() => {
    // Try localStorage branches first
    try {
      const stored = localStorage.getItem('branches_data');
      if (stored) {
        const branches = JSON.parse(stored);
        const found = branches.find((b: any) => b.id === branchId);
        if (found?.name) { setBranchName(found.name); return; }
      }
    } catch (_) {}
    // Fallback to mock lookup
    setBranchName(BRANCH_NAMES[branchId] || `Branch ${branchId}`);
  }, [branchId]);

  return (
    <BusinessLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Link href="/dashboard/branches">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 mt-1 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Branch Performance</span>
              </div>
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{branchName}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Detailed analytics for this location.</p>
            </div>
          </div>
          {/* Range selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mt-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  range === r
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {KPI_DATA.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={kpi.label}
                className="p-5 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                    kpi.trend === 'up'
                      ? 'text-emerald-400'
                      : kpi.trend === 'down'
                      ? 'text-rose-400'
                      : 'text-muted-foreground'
                  }`}>
                    {kpi.trend === 'up' ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : kpi.trend === 'down' ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {kpi.change}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-0.5">{kpi.label}</p>
                <p className="text-2xl font-extrabold text-foreground">{kpi.value}</p>
              </Card>
            );
          })}
        </div>

        {/* ── Charts Row 1: Traffic + Hourly ───────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly Customer Traffic */}
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
            <div className="mb-5">
              <h3 className="text-base font-bold text-foreground">Customer Traffic</h3>
              <p className="text-xs text-muted-foreground">Weekly visits vs new customers</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TRAFFIC_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.22 0 0)" />
                  <XAxis dataKey="week" stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <YAxis stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="visits" stroke="oklch(0.65 0.15 280)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="newCustomers" stroke="oklch(0.7 0.15 140)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Hourly Traffic Heatmap (bar) */}
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
            <div className="mb-5">
              <h3 className="text-base font-bold text-foreground">Peak Hours</h3>
              <p className="text-xs text-muted-foreground">Average visits by hour of day</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={HOURLY_TRAFFIC} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.22 0 0)" />
                  <XAxis dataKey="hour" stroke="oklch(0.55 0 0)" fontSize={9} tickLine={false} interval={1} />
                  <YAxis stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Bar dataKey="visits" fill="oklch(0.65 0.15 200)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── Charts Row 2: Purchases + Offers ─────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Verified Purchases + Revenue */}
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Verified Purchases</h3>
                <p className="text-xs text-muted-foreground">Monthly bill submissions</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />+9.6%
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PURCHASE_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7 0.15 140)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.7 0.15 140)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.22 0 0)" />
                  <XAxis dataKey="month" stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <YAxis stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="purchases" stroke="oklch(0.7 0.15 140)" strokeWidth={2} fill="url(#purchaseGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Offer Redemption */}
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
            <div className="mb-5">
              <h3 className="text-base font-bold text-foreground">Offer Performance</h3>
              <p className="text-xs text-muted-foreground">Issued vs redeemed per offer</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={OFFER_PERF} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.22 0 0)" />
                  <XAxis dataKey="offer" stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <YAxis stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="issued" fill="oklch(0.6 0.1 220)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="redeemed" fill="oklch(0.65 0.15 280)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── Review Trend ─────────────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-foreground">Review Trend</h3>
              <p className="text-xs text-muted-foreground">Average rating and review volume over time</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">
              <Star className="h-3 w-3" />4.8 avg
            </span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVIEW_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.75 0.18 90)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.75 0.18 90)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.22 0 0)" />
                <XAxis dataKey="month" stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                <YAxis stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} domain={[3.5, 5]} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="avg" stroke="oklch(0.75 0.18 90)" strokeWidth={2} fill="url(#ratingGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </BusinessLayout>
  );
}
