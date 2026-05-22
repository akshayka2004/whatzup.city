'use client';

import { useState } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Megaphone, Target, ArrowRight, X, BarChart2 } from 'lucide-react';

const initialCampaigns = [
  {
    id: 1,
    name: 'Weekend Flash Sale Notification',
    type: 'Push',
    status: 'COMPLETED',
    target: 'Local Customers',
    ctr: '12.4%',
    conversions: 310,
  },
  {
    id: 2,
    name: 'Winter Inventory Discount Announcement',
    type: 'In-App',
    status: 'ACTIVE',
    target: 'Favorites Watchers',
    ctr: '18.1%',
    conversions: 145,
  },
  {
    id: 3,
    name: 'Launch New Branch Alert',
    type: 'Push',
    status: 'DRAFT',
    target: 'All Users (City)',
    ctr: '-',
    conversions: 0,
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [isLaunchOpen, setIsLaunchOpen] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Push');
  const [target, setTarget] = useState('Local Customers');

  const handleOpenLaunch = () => {
    setName('');
    setType('Push');
    setTarget('Local Customers');
    setIsLaunchOpen(true);
  };

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const newCamp = {
      id: Date.now(),
      name,
      type,
      status: 'ACTIVE',
      target,
      ctr: '0.0%',
      conversions: 0,
    };
    setCampaigns([newCamp, ...campaigns]);
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
          <Button
            onClick={handleOpenLaunch}
            className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Launch Campaign
          </Button>
        </div>

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
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground text-lg">{camp.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          camp.status === 'ACTIVE'
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
                      Target Audience:{' '}
                      <span className="text-foreground font-medium">{camp.target}</span>
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
                    className="rounded-xl hover:bg-white/5 h-10 w-10 flex items-center justify-center"
                  >
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── LAUNCH MODAL ─────────────────────────────────────────── */}
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
                    className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                  >
                    Launch Campaign
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── DETAIL/METRICS MODAL ─────────────────────────────────── */}
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
                  <h3 className="text-xl font-bold text-foreground">{viewingCampaign.name}</h3>
                  <span
                    className={`inline-block px-2 py-0.5 mt-1 rounded-full text-xs font-semibold ${
                      viewingCampaign.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : viewingCampaign.status === 'COMPLETED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-white/5 text-muted-foreground border border-white/10'
                    }`}
                  >
                    {viewingCampaign.status}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400 font-medium">Audience Segment</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {viewingCampaign.target}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                    <p className="text-xs text-slate-400 font-medium">Click-Through (CTR)</p>
                    <p className="text-xl font-extrabold text-foreground mt-1">
                      {viewingCampaign.ctr}
                    </p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl text-center border border-white/5">
                    <p className="text-xs text-slate-400 font-medium">Total Claims</p>
                    <p className="text-xl font-extrabold text-foreground mt-1">
                      {viewingCampaign.conversions}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-6">
                <Button
                  onClick={() => setViewingCampaign(null)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
