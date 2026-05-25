'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, Users, Receipt, Tag, Star, Download,
  Repeat2, Building2, Heart, Activity, Megaphone,
  Eye, ChevronUp, ChevronDown, Minus, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const businessId = user?.businessId || user?.entity?.id;

  const rangeToDays: Record<Range, number> = { '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    apiService
      .get<any>(`/v1/analytics/business/${businessId}?days=${rangeToDays[range]}`)
      .then((res) => {
        if (res.data && !res.error) setAnalyticsData(res.data);
      })
      .finally(() => setLoading(false));
  }, [businessId, range]);

  const kpiCards = analyticsData
    ? [
        {
          label: 'Total Customers',
          value: analyticsData.totalCustomers ?? '—',
          change: analyticsData.customerGrowthPct ?? '—',
          trend: analyticsData.customerGrowthPct?.startsWith('+') ? 'up' : analyticsData.customerGrowthPct?.startsWith('-') ? 'down' : 'neutral',
          icon: Users,
          color: 'text-violet-400',
          bg: 'bg-violet-500/10',
        },
        {
          label: 'Active Offers',
          value: analyticsData.activeOffers ?? '—',
          change: '—',
          trend: 'neutral',
          icon: Tag,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
        },
        {
          label: 'Avg Rating',
          value: analyticsData.avgRating ?? '—',
          change: '—',
          trend: 'neutral',
          icon: Star,
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
        },
        {
          label: 'Listing Impressions',
          value: analyticsData.impressions ?? '—',
          change: '—',
          trend: 'neutral',
          icon: Eye,
          color: 'text-indigo-400',
          bg: 'bg-indigo-500/10',
        },
      ]
    : [];

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

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !analyticsData ? (
          <Card className="p-12 rounded-2xl border-white/5 bg-card/40 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No analytics data yet</p>
            <p className="text-sm text-muted-foreground">Data will appear once your business receives activity.</p>
          </Card>
        ) : (
          <>
            {/* ── KPI Cards ─────────────────────────────────────────── */}
            {kpiCards.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((kpi) => {
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
            )}

            {/* No time-series chart data from the analytics/business endpoint — show placeholder */}
            <Card className="p-8 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl text-center">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">
                Detailed time-series charts require a dedicated analytics time-series endpoint.
                {/* TODO: Wire to time-series endpoint when available */}
              </p>
            </Card>
          </>
        )}
      </div>
    </BusinessLayout>
  );
}
