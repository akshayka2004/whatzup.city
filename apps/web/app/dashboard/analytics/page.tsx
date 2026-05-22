'use client';

import { useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, Users, Receipt, Tag, Star, Download,
  Repeat2, Building2, Heart, Activity, Megaphone,
  Eye, ChevronUp, ChevronDown, Minus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

// ── Mock data ─────────────────────────────────────────────────────────

const CUSTOMER_GROWTH = [
  { month: 'Nov', customers: 210 },
  { month: 'Dec', customers: 285 },
  { month: 'Jan', customers: 340 },
  { month: 'Feb', customers: 415 },
  { month: 'Mar', customers: 490 },
  { month: 'Apr', customers: 580 },
  { month: 'May', customers: 648 },
];

const OFFER_REDEMPTION = [
  { offer: 'Offer A', issued: 320, redeemed: 215 },
  { offer: 'Offer B', issued: 180, redeemed: 142 },
  { offer: 'Offer C', issued: 450, redeemed: 310 },
  { offer: 'Offer D', issued: 90, redeemed: 61 },
  { offer: 'Offer E', issued: 260, redeemed: 198 },
];

const BRANCH_PERF = [
  { branch: 'Main', engagement: 89, reviews: 142, purchases: 310 },
  { branch: 'North', engagement: 72, reviews: 98, purchases: 221 },
  { branch: 'South', engagement: 64, reviews: 75, purchases: 175 },
];

const REVIEW_TREND = [
  { month: 'Nov', avg: 4.1, count: 28 },
  { month: 'Dec', avg: 4.3, count: 45 },
  { month: 'Jan', avg: 4.4, count: 52 },
  { month: 'Feb', avg: 4.5, count: 61 },
  { month: 'Mar', avg: 4.6, count: 70 },
  { month: 'Apr', avg: 4.7, count: 84 },
  { month: 'May', avg: 4.8, count: 91 },
];

const KPI_CARDS = [
  {
    label: 'Total Customers',
    value: '648',
    change: '+11.7%',
    trend: 'up',
    icon: Users,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    label: 'Repeat Customers',
    value: '284',
    change: '+8.2%',
    trend: 'up',
    icon: Repeat2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    label: 'Verified Purchases',
    value: '1,204',
    change: '+15.3%',
    trend: 'up',
    icon: Receipt,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Active Offers',
    value: '12',
    change: '+2',
    trend: 'up',
    icon: Tag,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    label: 'Avg Rating',
    value: '4.8',
    change: '+0.3',
    trend: 'up',
    icon: Star,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  {
    label: 'Offer Redemption Rate',
    value: '71%',
    change: '+4.1%',
    trend: 'up',
    icon: Activity,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
  },
  {
    label: 'Top Branch',
    value: 'Main',
    change: '310 purchases',
    trend: 'neutral',
    icon: Building2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Customer Retention',
    value: '43.8%',
    change: '-1.2%',
    trend: 'down',
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  {
    label: 'Listing Impressions',
    value: '18.4K',
    change: '+22%',
    trend: 'up',
    icon: Eye,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
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

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('30D');

  return (
    <BusinessLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Business intelligence for your growth.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
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
            <Button variant="outline" size="sm" className="rounded-xl border-white/10 gap-1.5 text-slate-300 hover:bg-white/5 cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-3 lg:grid-cols-3 gap-4">
          {KPI_CARDS.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card
                key={kpi.label}
                className="p-5 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${
                    kpi.trend === 'up' ? 'text-emerald-400' : kpi.trend === 'down' ? 'text-rose-400' : 'text-muted-foreground'
                  }`}>
                    {kpi.trend === 'up' ? <ChevronUp className="h-3 w-3" /> : kpi.trend === 'down' ? <ChevronDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {kpi.change}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-0.5">{kpi.label}</p>
                <p className="text-2xl font-extrabold text-foreground">{kpi.value}</p>
              </Card>
            );
          })}
        </div>

        {/* ── Charts Row 1 ──────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Customer Growth */}
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Customer Growth</h3>
                <p className="text-xs text-muted-foreground">Monthly new customers</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />+11.7%
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={CUSTOMER_GROWTH} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.22 0 0)" />
                  <XAxis dataKey="month" stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <YAxis stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="customers" stroke="oklch(0.65 0.15 280)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Offer Redemption */}
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
            <div className="mb-5">
              <h3 className="text-base font-bold text-foreground">Offer Redemption</h3>
              <p className="text-xs text-muted-foreground">Issued vs redeemed per offer</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={OFFER_REDEMPTION} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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

        {/* ── Charts Row 2 ──────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Review Trend */}
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
            <div className="mb-5">
              <h3 className="text-base font-bold text-foreground">Review Trend</h3>
              <p className="text-xs text-muted-foreground">Average rating over time</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVIEW_TREND} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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

          {/* Branch Performance */}
          <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
            <div className="mb-5">
              <h3 className="text-base font-bold text-foreground">Branch Performance</h3>
              <p className="text-xs text-muted-foreground">Engagement, reviews and purchases per branch</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={BRANCH_PERF} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="oklch(0.22 0 0)" />
                  <XAxis type="number" stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} />
                  <YAxis dataKey="branch" type="category" stroke="oklch(0.55 0 0)" fontSize={10} tickLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="engagement" fill="oklch(0.65 0.15 200)" radius={[0, 3, 3, 0]} maxBarSize={14} />
                  <Bar dataKey="reviews" fill="oklch(0.65 0.15 280)" radius={[0, 3, 3, 0]} maxBarSize={14} />
                  <Bar dataKey="purchases" fill="oklch(0.7 0.15 140)" radius={[0, 3, 3, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </BusinessLayout>
  );
}
