'use client';

import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  TrendingUp,
  Share2,
  ShoppingBag,
  MousePointerClick,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const performanceData = [
  { day: 'Mon', views: 840, clicks: 120 },
  { day: 'Tue', views: 980, clicks: 180 },
  { day: 'Wed', views: 1200, clicks: 240 },
  { day: 'Thu', views: 1100, clicks: 220 },
  { day: 'Fri', views: 1500, clicks: 390 },
  { day: 'Sat', views: 1300, clicks: 310 },
  { day: 'Sun', views: 1700, clicks: 450 },
];

const offers = [
  { id: 1, title: 'Summer Special', discount: 50, active: true, views: 1234, clicks: 456 },
  { id: 2, title: 'Member Exclusive', discount: 30, active: true, views: 987, clicks: 234 },
  { id: 3, title: 'Bundle Deal', discount: 25, active: false, views: 654, clicks: 123 },
  { id: 4, title: 'Weekend Offer', discount: 40, active: true, views: 2341, clicks: 789 },
];

export default function BusinessDashboardPage() {
  const stats = [
    {
      label: 'Storefront Views',
      value: '8,655',
      change: '+14% WoW',
      icon: Users,
      color: 'text-violet-500 bg-violet-500/10',
    },
    {
      label: 'Offer Claims',
      value: '1,209',
      change: '+8.4% WoW',
      icon: ShoppingBag,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: 'Interaction Clicks',
      value: '1,919',
      change: '+22% WoW',
      icon: MousePointerClick,
      color: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      label: 'Click-Through Rate',
      value: '22.1%',
      change: '+2.1% growth',
      icon: TrendingUp,
      color: 'text-amber-500 bg-amber-500/10',
    },
  ];

  return (
    <BusinessLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Business Hub</h1>
            <p className="text-muted-foreground text-sm">
              Control listings, manage promotional offers, and review analytics.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-xl border-white/10 text-foreground hover:bg-white/5 gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Storefront
            </Button>
            <Button className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <Plus className="h-4 w-4" />
              New Listing / Offer
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-500">{stat.change}</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className="text-3xl font-extrabold text-foreground mt-1 tracking-tight">
                  {stat.value}
                </h3>
              </Card>
            );
          })}
        </div>

        {/* Performance Chart */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Traffic Analysis</h3>
              <p className="text-xs text-muted-foreground">
                Storefront views vs interaction clicks this week.
              </p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-violet-400">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>
                Views
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                Clicks
              </span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={performanceData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.15 280)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.15 280)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.15 200)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.15 200)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.25 0 0)" />
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
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="oklch(0.65 0.15 280)"
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="oklch(0.65 0.15 200)"
                  fillOpacity={1}
                  fill="url(#colorClicks)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Offers list section */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Promotions & Active Offers</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {offers.map((offer) => (
              <Card
                key={offer.id}
                className="p-6 rounded-2xl hover:shadow-md transition-all duration-300 border-white/5 bg-card/40 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground text-lg">{offer.title}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          offer.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-white/5 text-muted-foreground border border-white/10'
                        }`}
                      >
                        {offer.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Discount</p>
                        <p className="font-bold text-foreground text-base">{offer.discount}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Views</p>
                        <p className="font-bold text-foreground text-base">{offer.views}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                        <p className="font-bold text-foreground text-base">{offer.clicks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-white/10 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 border-rose-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}
