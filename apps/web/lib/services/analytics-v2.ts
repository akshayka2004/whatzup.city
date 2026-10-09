import { apiService } from '@/lib/services/api-service';

export type Metric = { value: number; previous: number; change: number | null };
export type Granularity = 'day' | 'week' | 'month';
export type ReportRange = {
  from: string;
  to: string;
  days: number;
  granularity: Granularity;
  timezone: string;
};
export type Series<P> = { granularity: Granularity; visitorsAreDailyUnique: boolean; points: P[] };

export type BusinessReport = {
  range: ReportRange;
  previous: { from: string; to: string };
  kpis: Record<
    | 'views'
    | 'visitors'
    | 'actions'
    | 'actionRate'
    | 'calls'
    | 'directions'
    | 'whatsapp'
    | 'website'
    | 'shares'
    | 'saves'
    | 'qrScans'
    | 'offerClaims'
    | 'spinRedemptions'
    | 'voucherRedemptions'
    | 'verifiedBills'
    | 'verifiedSpend'
    | 'newReviews'
    | 'newCustomers',
    Metric
  >;
  avgRatingInPeriod: number | null;
  funnel: { stage: string; value: number }[];
  actionsBreakdown: { key: string; label: string; value: number }[];
  series: Series<{
    date: string;
    views: number;
    visitors: number;
    actions: number;
    claims: number;
    spend: number;
  }>;
  sources: { key: string; visitors: number }[];
  devices: { key: string; visitors: number }[];
  heatmap: { dow: number; hour: number; views: number }[];
  offers: {
    id: string;
    title: string;
    status: string;
    discountPercent: number | null;
    startDate: string;
    endDate: string;
    viewers: number;
    claims: number;
    conversion: number | null;
  }[];
  generatedAt: string;
};

export type PlatformReport = {
  range: ReportRange;
  previous: { from: string; to: string };
  kpis: Record<
    | 'visitors'
    | 'profileViews'
    | 'actions'
    | 'searches'
    | 'newUsers'
    | 'newBusinesses'
    | 'revenue'
    | 'revenueNew'
    | 'revenueRenewal'
    | 'gst'
    | 'paidCount'
    | 'gmv'
    | 'verifiedBills'
    | 'offerClaims',
    Metric
  >;
  snapshot: {
    activeBusinesses: number;
    pendingApprovals: number;
    pendingPayments: number;
    openReports: number;
    trialsEnding7d: number;
    renewalsDue30d: number;
  };
  onboardingFunnel: { stage: string; value: number }[];
  series: Series<{
    date: string;
    visitors: number;
    newUsers: number;
    newBusinesses: number;
    revenue: number;
  }>;
  topBusinesses: { id: string; name: string; city: string; visitors: number }[];
  topCategories: { name: string; visitors: number }[];
  cities: { city: string; businesses: number }[];
  searches: { query: string; total: number; zeroResults: number }[];
  planMix: { plan: string; revenue: number; count: number }[];
  generatedAt: string;
  scope?: PlatformScope & { unscoped: string[] };
};

export type RangeParams = { from?: string; to?: string; days?: number; granularity?: Granularity };
export type PlatformScope = { city?: string; categoryId?: string };

const qs = (p: RangeParams) => {
  const s = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v != null && v !== '' && s.set(k, String(v)));
  return s.toString();
};

export const analyticsV2 = {
  business: (businessId: string, p: RangeParams) =>
    apiService.get<BusinessReport>(`/v1/analytics/v2/business/${businessId}/report?${qs(p)}`),
  platform: (p: RangeParams & PlatformScope) =>
    apiService.get<PlatformReport>(`/v1/analytics/v2/platform/report?${qs(p)}`),
};
