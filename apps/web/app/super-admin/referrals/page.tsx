'use client';

import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { apiService } from '@/lib/services/api-service';
import { Users, Share2, TrendingUp, Award, Loader2 } from 'lucide-react';

export default function SuperAdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    apiService
      .get<any>('/v1/users/referral-leaderboard')
      .then((res) => { if (res.data && !res.error) setData(res.data); })
      .finally(() => setLoading(false));
  }, []);

  const leaderboard: any[] = data?.leaderboard ?? [];
  const totalReferred: number = data?.totalReferredUsers ?? 0;

  return (
    <SuperAdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide referral statistics and top referrers</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Referred Users', value: loading ? '…' : totalReferred.toLocaleString(), icon: Users, color: 'text-primary bg-primary/10' },
          { label: 'Active Referrers', value: loading ? '…' : leaderboard.length.toLocaleString(), icon: Share2, color: 'text-info bg-info/10' },
          { label: 'Top Referral Count', value: loading ? '…' : (leaderboard[0]?.referralCount ?? 0).toLocaleString(), icon: TrendingUp, color: 'text-success bg-success/10' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5 rounded-2xl border-border bg-card flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Leaderboard */}
      <Card className="rounded-2xl border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">Top Referrers</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Share2 className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No referrals recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">Referral Code</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground">Referrals</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row: any, i: number) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-3 text-muted-foreground font-mono text-xs">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </td>
                    <td className="px-6 py-3 font-semibold text-foreground">{row.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{row.email}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold">
                        {row.referralCode || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20 text-xs font-bold">
                        {row.referralCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </SuperAdminLayout>
  );
}
