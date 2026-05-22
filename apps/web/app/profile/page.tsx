'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Edit2, Mail, Phone, MapPin, LogOut, Check, X,
  Sparkles, Receipt, Heart, Tag, Building2, CalendarDays,
  ShieldCheck, Camera,
} from 'lucide-react';

// ── Mock data for claimed offers & bills ─────────────────────────
const MOCK_CLAIMED_OFFERS = [
  { id: 1, title: 'Special Offer 1', business: 'Bella Restaurant', discount: '20%', claimedOn: 'May 18, 2026' },
  { id: 2, title: 'Special Offer 5', business: 'Wellness Clinic', discount: '15%', claimedOn: 'May 19, 2026' },
  { id: 3, title: 'Special Offer 8', business: 'Gadget World', discount: '45%', claimedOn: 'May 20, 2026' },
];

const MOCK_SUBMITTED_BILLS = [
  { id: 1, company: 'Bella Restaurant', billNo: 'INV-88291', amount: '₹2,450', status: 'APPROVED', date: 'May 20, 2026' },
  { id: 2, company: 'Vanguard Fitness', billNo: 'INV-39201', amount: '₹3,750', status: 'PENDING', date: 'May 19, 2026' },
  { id: 3, company: 'TechHub Electronics', billNo: 'INV-77882', amount: '₹45,000', status: 'REJECTED', date: 'May 17, 2026' },
];

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [claimedOffers, setClaimedOffers] = useState(MOCK_CLAIMED_OFFERS);
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    location: 'New York, NY',
  });
  const [tempProfile, setTempProfile] = useState({ ...profile });

  useEffect(() => {
    // Merge real claimed offer IDs from localStorage with mock display data
    try {
      const ids: number[] = JSON.parse(localStorage.getItem('claimed_offers') || '[]');
      if (ids.length > 0) {
        const extras = ids
          .filter((id) => !MOCK_CLAIMED_OFFERS.find((o) => o.id === id))
          .map((id) => ({
            id,
            title: `Special Offer ${id}`,
            business: 'Platform Business',
            discount: '–',
            claimedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          }));
        setClaimedOffers([...MOCK_CLAIMED_OFFERS, ...extras]);
      }
    } catch (_) {}
  }, []);

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Hero Profile Card ──────────────────────────────── */}
        <Card className="rounded-3xl border-white/5 bg-card/60 backdrop-blur-xl relative overflow-hidden">
          {/* Ambient bg */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 via-accent/10 to-transparent pointer-events-none" />
          <div className="absolute top-4 right-4 w-24 h-24 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="p-8 pt-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-foreground flex items-center justify-center text-3xl font-extrabold shadow-xl shadow-primary/20 ring-4 ring-primary/20">
                  {initials}
                </div>
                <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md cursor-pointer">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Name + role */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                  <h2 className="text-2xl font-extrabold text-foreground">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-3">{profile.email} • Member since May 2024</p>
                <div className="flex items-center gap-4 justify-center sm:justify-start text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span className="font-semibold text-foreground">{claimedOffers.length}</span> offers claimed
                  </span>
                  <span className="flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="font-semibold text-foreground">{MOCK_SUBMITTED_BILLS.length}</span> bills submitted
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-rose-400" />
                    <span className="font-semibold text-foreground">6</span> saved businesses
                  </span>
                </div>
              </div>

              {/* Edit toggle */}
              {!isEditing ? (
                <Button
                  onClick={() => { setTempProfile({ ...profile }); setIsEditing(true); }}
                  className="rounded-xl gap-2 font-medium bg-gradient-to-r from-primary to-accent text-primary-foreground shrink-0 cursor-pointer"
                >
                  <Edit2 className="h-4 w-4" /> Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <Button onClick={() => { setProfile({ ...tempProfile }); setIsEditing(false); }} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer">
                    <Check className="h-4 w-4" /> Save
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline" className="rounded-xl gap-2 border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Contact Info ───────────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <h3 className="text-base font-bold text-foreground mb-5">Personal Information</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">First Name</label>
              <Input
                value={isEditing ? tempProfile.firstName : profile.firstName}
                onChange={(e) => setTempProfile({ ...tempProfile, firstName: e.target.value })}
                className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground disabled:opacity-70"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Last Name</label>
              <Input
                value={isEditing ? tempProfile.lastName : profile.lastName}
                onChange={(e) => setTempProfile({ ...tempProfile, lastName: e.target.value })}
                className="rounded-xl border-white/10 bg-white/5 focus:border-primary text-foreground disabled:opacity-70"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: Mail, color: 'text-violet-400', label: 'Email Address', key: 'email' as const },
              { icon: Phone, color: 'text-cyan-400', label: 'Phone Number', key: 'phone' as const },
              { icon: MapPin, color: 'text-amber-400', label: 'Location', key: 'location' as const },
            ].map(({ icon: Icon, color, label, key }) => (
              <div key={key} className="flex items-center gap-3 p-3.5 bg-white/5 rounded-xl border border-white/5">
                <Icon className={`h-5 w-5 ${color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  {isEditing ? (
                    <Input
                      value={tempProfile[key]}
                      onChange={(e) => setTempProfile({ ...tempProfile, [key]: e.target.value })}
                      className="h-7 mt-0.5 rounded-lg border-white/10 bg-transparent text-sm px-1 focus:border-primary text-foreground"
                    />
                  ) : (
                    <p className="font-semibold text-foreground text-sm mt-0.5 truncate">{profile[key]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isEditing && (
            <Button onClick={() => { setProfile({ ...tempProfile }); setIsEditing(false); }} className="w-full mt-4 rounded-xl font-semibold bg-gradient-to-r from-primary to-accent text-primary-foreground cursor-pointer">
              Save Changes
            </Button>
          )}
        </Card>

        {/* ── Claimed Offers ─────────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">Claimed Offers</h3>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              {claimedOffers.length}
            </span>
          </div>
          {claimedOffers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No offers claimed yet. Browse the offers page to find deals.</p>
          ) : (
            <div className="space-y-2">
              {claimedOffers.map((offer) => (
                <div key={offer.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/[0.07] transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{offer.title}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {offer.business}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-violet-400">{offer.discount}</p>
                    <p className="text-[10px] text-muted-foreground">{offer.claimedOn}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Submitted Bills ────────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Receipt className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">Submitted Bills</h3>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {MOCK_SUBMITTED_BILLS.length}
            </span>
          </div>
          <div className="space-y-2">
            {MOCK_SUBMITTED_BILLS.map((bill) => (
              <div key={bill.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/[0.07] transition-colors">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{bill.company}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> {bill.date} • <span className="font-mono">{bill.billNo}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{bill.amount}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[bill.status]}`}>
                    {bill.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Account Settings ───────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <h3 className="text-base font-bold text-foreground mb-4">Account Settings</h3>
          <div className="space-y-2">
            {['Change Password', 'Email Preferences', 'Privacy Settings'].map((label) => (
              <Button
                key={label}
                variant="outline"
                className="w-full rounded-xl justify-start border-white/10 hover:bg-white/5 text-slate-300 cursor-pointer"
              >
                {label}
              </Button>
            ))}
            <Button
              variant="outline"
              className="w-full rounded-xl justify-start border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}
