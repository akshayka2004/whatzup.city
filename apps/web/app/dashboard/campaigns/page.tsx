'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Megaphone, Target, ArrowRight, X, BarChart2, Loader2, RefreshCw } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { useAuth } from '@/hooks/use-auth';

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLaunchOpen, setIsLaunchOpen] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Push');
  const [target, setTarget] = useState('Local Customers');
  const [launching, setLaunching] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await apiService.get<any>('/v1/campaigns');
      if (res.data && !res.error) {
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.campaigns ?? [];
        setCampaigns(list.map((c: any) => ({
          id: c.id,
          name: c.name || c.title || '',
          type: c.type || c.channel || 'Push',
          status: c.status || 'DRAFT',
          target: c.targetAudience || c.target || 'All Users',
          ctr: c.clickRate != null ? `${(c.clickRate * 100).toFixed(1)}%` : c.ctr || '—',
          conversions: c.conversions ?? c.redemptions ?? 0,
          sentAt: c.sentAt || c.scheduledAt || c.createdAt || null,
        })));
      } else {
        setCampaigns([]);
      }
    } catch (_) {
      setCampaigns([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenLaunch = () => {
    setName('');
    setType('Push');
    setTarget('Local Customers');
    setIsLaunchOpen(true);
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLaunching(true);
    try {
      const res = await apiService.post<any>('/v1/campaigns', {
        name,
        type,
        targetAudience: target,
        status: 'ACTIVE',
      });
      if (res.data && !res.error) {
        setCampaigns((prev) => [{
          id: res.data.id,
          name: res.data.name || name,
          type: res.data.type || type,
          status: res.data.status || 'ACTIVE',
          target: res.data.targetAudience || target,
          ctr: '—',
          conversions: 0,
          sentAt: res.data.createdAt || new Date().toISOString(),
        }, ...prev]);
      }
    } catch (_) {}
    setLaunching(false);
    setIsLaunchOpen(false);
  };

  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Notice & Engagement Campaigns
            </h1>
            <p className="text-muted-foreground">
              Broadcast alerts and push promotional campaigns to platform subscribers
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchCampaigns}
              variant="outline"
              className="rounded-xl border-white/10 hover:bg-white/5 text-muted-foreground gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleOpenLaunch}
              className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Launch Campaign
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="p-12 rounded-2xl border-dashed border-white/10 bg-white/[0.02] text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Megaphone className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">No Campaigns Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Launch your first campaign to broadcast promotions and alerts to your audience.
            </p>
            <Button
              onClick={handleOpenLaunch}
              className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Launch First Campaign
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaigns.map((camp) => (
              <Card
                key={camp.id}
                className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl h-11 w-11 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-foreground text-lg">{camp.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            camp.status === 'ACTIVE' || camp.status === 'SENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : camp.status === 'COMPLETED'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-white/5 text-muted-foreground border border-white/10'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Type: <span className="text-foreground font-medium">{camp.type}</span> •
                        Target:{' '}
                        <span className="text-foreground font-medium">{camp.target}</span>
                        {camp.sentAt && (
                          <> • <span>{new Date(camp.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 text-sm border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                    <div>
                      <p className="text-xs text-muted-foreground">Click-Through Rate</p>
                      <p className="font-bold text-foreground text-base mt-0.5">{camp.ctr}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversions</p>
                      <p className="font-bold text-foreground text-base mt-0.5">{camp.conversions}</p>
                    </div>
                    <Button
                      onClick={() => setViewingCampaign(camp)}
                      size="icon"
                      variant="ghost"
                      className="rounded-xl hover:bg-white/5 h-10 w-10 flex items-center justify-center cursor-pointer"
                    >
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── LAUNCH MODAL */}
        {isLaunchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setIsLaunchOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-xl font-bold text-foreground mb-4">Launch notice / campaign</h3>
              <form onSubmit={handleLaunch} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Campaign Name
                  </label>
                  <Input
                    placeholder="e.g. Flash Discount Announcement"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Broadcast Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="Push">Push Notification</option>
                    <option value="In-App">In-App Notification</option>
                    <option value="SMS">SMS Message</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Target Audience Segment
                  </label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-800 text-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="Local Customers">Local Customers (5km radius)</option>
                    <option value="Favorites Watchers">Favorites / Watchers List</option>
                    <option value="All Users (City)">All Registered Users (City)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsLaunchOpen(false)}
                    className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={launching}
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold flex items-center gap-1.5"
                  >
                    {launching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Launch Campaign
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── DETAIL/METRICS MODAL */}
        {viewingCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setViewingCampaign(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{viewingCampaign.name}</h3>
                  <p className="text-xs text-muted-foreground">{viewingCampaign.type} • {viewingCampaign.target}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Status', value: viewingCampaign.status },
                  { label: 'Type', value: viewingCampaign.type },
                  { label: 'CTR', value: viewingCampaign.ctr },
                  { label: 'Conversions', value: String(viewingCampaign.conversions) },
                ].map((row) => (
                  <div key={row.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[10px] text-muted-foreground mb-1">{row.label}</p>
                    <p className="font-bold text-foreground text-sm">{row.value}</p>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setViewingCampaign(null)}
                variant="outline"
                className="w-full mt-5 rounded-xl border-white/10 hover:bg-white/5 text-slate-300"
              >
                Close
              </Button>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
