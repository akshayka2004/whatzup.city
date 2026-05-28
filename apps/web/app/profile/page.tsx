'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { useRouter } from 'next/navigation';
import {
  Edit2, Mail, Phone, MapPin, LogOut, Check, X,
  Sparkles, Receipt, Heart, Tag, Building2, CalendarDays,
  Camera, Loader2, Trash2, AlertTriangle, HeadphonesIcon, Shield, FileText, Copy, Users,
} from 'lucide-react';

/* ── Types matching API responses ─────────────────────────────── */
interface CustomerProfile {
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
}

interface BillRow {
  id: string;
  businessName?: string;
  business?: { name?: string };
  billNumber?: string;
  billNo?: string;
  totalAmount?: number | string;
  amount?: number | string;
  status: string;
  createdAt?: string;
  date?: string;
}

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  FLAGGED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function ProfilePage() {
  const { user, loading: authLoading, signOut, refreshUser } = useAuth();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile>({
    firstName: '', lastName: '', phone: '', city: '', district: '', state: '',
  });
  const [tempProfile, setTempProfile] = useState<CustomerProfile>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  const [bills, setBills] = useState<BillRow[]>([]);
  const [claimedOffers, setClaimedOffers] = useState<{ id: string; title: string; business: string; date: string }[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  /* ── Redirect if logged out ──────────────────────────────────── */
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  /* ── Load customer profile + bills ───────────────────────────── */
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      setProfileLoading(true);

      // Fetch referral stats — works for ALL roles (customer, business, admin)
      const refRes = await apiService.get<any>('/v1/users/me/referrals');
      if (!cancelled && refRes.data) {
        if (refRes.data.referralCode) setReferralCode(refRes.data.referralCode);
        if (typeof refRes.data.count === 'number') setReferralCount(refRes.data.count);
      }

      // Fetch customer profile (phone, city, etc.)
      const meRes = await apiService.get<any>('/v1/customers/me');
      if (!cancelled && meRes.data?.user) {
        const u = meRes.data.user;
        const cust = u.customerProfile || {};
        const nameParts = (u.name || '').trim().split(/\s+/);
        const next: CustomerProfile = {
          firstName: cust.firstName || nameParts[0] || '',
          lastName: cust.lastName || nameParts.slice(1).join(' ') || '',
          phone: cust.phone || u.phone || '',
          avatar: cust.avatar || u.avatar || '',
          city: cust.city || '',
          district: cust.district || '',
          state: cust.state || '',
        };
        setProfile(next);
        setTempProfile(next);
        // Secondary referral code source — only if /v1/users/me/referrals returned nothing
        if (u.referralCode) setReferralCode((prev) => prev || u.referralCode);
      } else if (!cancelled) {
        // Fallback: parse from useAuth().user
        const parts = (user.name || '').trim().split(/\s+/);
        const fallback: CustomerProfile = {
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          phone: '', city: '', district: '', state: '',
        };
        setProfile(fallback);
        setTempProfile(fallback);
      }

      // Fetch user's submitted bills (best-effort)
      const billsRes = await apiService.get<any>('/v1/bills/my-bills');
      if (!cancelled) {
        const list = Array.isArray(billsRes.data) ? billsRes.data : billsRes.data?.items || [];
        setBills(list);
      }

      // Claimed offers from localStorage (real claims tracked client-side)
      if (typeof window !== 'undefined' && !cancelled) {
        try {
          const stored = JSON.parse(localStorage.getItem('claimed_offers_v2') || '[]');
          setClaimedOffers(Array.isArray(stored) ? stored : []);
        } catch { setClaimedOffers([]); }
      }

      if (!cancelled) setProfileLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  /* ── Delete account ─────────────────────────────────────────── */
  const handleDeleteAccount = async () => {
    setDeleting(true);
    const res = await apiService.delete('/v1/users/me');
    setDeleting(false);
    if (res.error) {
      setSaveErr(res.error || 'Failed to delete account.');
      setDeleteConfirm(false);
      return;
    }
    await signOut();
    router.push('/');
  };

  /* ── Save handler ────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    setSaveErr('');

    const res = await apiService.put<any>('/v1/customers/me', {
      firstName: tempProfile.firstName,
      lastName: tempProfile.lastName,
      phone: tempProfile.phone || undefined,
      city: tempProfile.city || undefined,
      district: tempProfile.district || undefined,
      state: tempProfile.state || undefined,
    });

    setSaving(false);

    if (res.error) {
      setSaveErr(res.error);
      return;
    }

    setProfile(tempProfile);
    setIsEditing(false);
    setSaveMsg('Profile updated successfully');
    setTimeout(() => setSaveMsg(''), 2500);

    // Refresh useAuth so name in sidebar/header updates
    await refreshUser();
  };

  /* ── Helpers ──────────────────────────────────────────────────── */
  const initials = (() => {
    const f = profile.firstName?.charAt(0) || user?.name?.charAt(0) || '?';
    const l = profile.lastName?.charAt(0) || '';
    return `${f}${l}`.toUpperCase();
  })();

  const memberSince = user
    ? new Date((user as any).createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  /* ── Render ───────────────────────────────────────────────────── */
  if (authLoading || profileLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (!user) return null;

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Hero Profile Card */}
        <Card className="rounded-2xl border-border bg-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/15 via-transparent to-transparent pointer-events-none" />
          <div className="p-7 pt-9">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl font-extrabold shadow-lg shadow-primary/20 ring-4 ring-primary/15">
                  {initials}
                </div>
                <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md cursor-pointer">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Name + meta */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-foreground">
                    {profile.firstName} {profile.lastName}
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm mb-3">
                  {user.email} {memberSince && `• Member since ${memberSince}`}
                </p>
                <div className="flex items-center gap-4 justify-center sm:justify-start text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground">{claimedOffers.length}</span> offers claimed
                  </span>
                  <span className="flex items-center gap-1">
                    <Receipt className="h-3.5 w-3.5 text-primary" />
                    <span className="font-semibold text-foreground">{bills.length}</span> bills submitted
                  </span>
                  {referralCount !== null && referralCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-semibold text-foreground">{referralCount}</span> referrals
                    </span>
                  )}
                </div>

                {/* Referral code + count */}
                {referralCode && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    {/* Code chip */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Referral Code</span>
                      <span className="font-mono text-sm font-bold text-primary tracking-widest">{referralCode}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(referralCode);
                          setReferralCopied(true);
                          setTimeout(() => setReferralCopied(false), 2000);
                        }}
                        className="text-primary hover:text-primary/70 cursor-pointer transition-colors"
                        title="Copy referral code"
                      >
                        {referralCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {/* Referral count chip */}
                    {referralCount !== null && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Referrals</span>
                        <span className="text-sm font-bold text-emerald-400">{referralCount}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Edit toggle */}
              {!isEditing ? (
                <Button
                  onClick={() => { setTempProfile({ ...profile }); setIsEditing(true); }}
                  className="rounded-xl gap-2 font-medium bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 cursor-pointer"
                >
                  <Edit2 className="h-4 w-4" /> Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save
                  </Button>
                  <Button
                    onClick={() => { setTempProfile({ ...profile }); setIsEditing(false); setSaveErr(''); }}
                    variant="outline"
                    className="rounded-xl gap-2 border-border hover:bg-secondary text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Save banners */}
        {saveMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
            <Check className="h-4 w-4" /> {saveMsg}
          </div>
        )}
        {saveErr && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium flex items-center gap-2">
            <X className="h-4 w-4" /> {saveErr}
          </div>
        )}

        {/* Personal Information */}
        <Card className="p-6 rounded-2xl border-border bg-card">
          <h3 className="text-base font-bold text-foreground mb-5">Personal Information</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">First Name</label>
              <Input
                value={isEditing ? tempProfile.firstName : profile.firstName}
                onChange={(e) => setTempProfile({ ...tempProfile, firstName: e.target.value })}
                className="rounded-xl border-border bg-secondary/60 focus:border-primary text-foreground disabled:opacity-70"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Last Name</label>
              <Input
                value={isEditing ? tempProfile.lastName : profile.lastName}
                onChange={(e) => setTempProfile({ ...tempProfile, lastName: e.target.value })}
                className="rounded-xl border-border bg-secondary/60 focus:border-primary text-foreground disabled:opacity-70"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="space-y-3">
            <ContactRow
              icon={Mail}
              label="Email Address"
              value={user.email}
              editable={false}
            />
            <ContactRow
              icon={Phone}
              label="Phone Number"
              value={isEditing ? (tempProfile.phone || '') : (profile.phone || '—')}
              editable={isEditing}
              onChange={(v) => setTempProfile({ ...tempProfile, phone: v })}
            />
            <ContactRow
              icon={MapPin}
              label="City"
              value={isEditing ? (tempProfile.city || '') : (profile.city || '—')}
              editable={isEditing}
              onChange={(v) => setTempProfile({ ...tempProfile, city: v })}
            />
            <ContactRow
              icon={MapPin}
              label="District / State"
              value={
                isEditing
                  ? `${tempProfile.district || ''}${tempProfile.state ? ', ' + tempProfile.state : ''}`
                  : [profile.district, profile.state].filter(Boolean).join(', ') || '—'
              }
              editable={isEditing}
              onChange={(v) => {
                const [d, s] = v.split(',').map((p) => p.trim());
                setTempProfile({ ...tempProfile, district: d || '', state: s || '' });
              }}
            />
          </div>
        </Card>

        {/* Claimed Offers */}
        <Card className="p-6 rounded-2xl border-border bg-card">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">Claimed Offers</h3>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {claimedOffers.length}
            </span>
          </div>
          {claimedOffers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No offers claimed yet. Browse the offers page to find deals.
            </p>
          ) : (
            <div className="space-y-2">
              {claimedOffers.map((o) => (
                <div key={o.id} className="flex items-center gap-3 p-3 bg-secondary/60 rounded-xl border border-border">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{o.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {o.business}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{o.date}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Submitted Bills */}
        <Card className="p-6 rounded-2xl border-border bg-card">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Receipt className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">Submitted Bills</h3>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {bills.length}
            </span>
          </div>
          {bills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bills submitted yet. Upload a bill from a business listing to earn verified reviewer status.
            </p>
          ) : (
            <div className="space-y-2">
              {bills.map((b) => {
                const businessName = b.business?.name || b.businessName || 'Business';
                const billNo = b.billNumber || b.billNo || `BILL-${(b.id || '').slice(0, 6)}`;
                const amount = b.totalAmount ?? b.amount ?? '—';
                const date = b.createdAt
                  ? new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : b.date || '';
                const status = (b.status || 'PENDING').toUpperCase();
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3 bg-secondary/60 rounded-xl border border-border">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{businessName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> {date} • <span className="font-mono">{billNo}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{typeof amount === 'number' ? `₹${amount.toLocaleString()}` : amount}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[status] || STATUS_STYLE.PENDING}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Account Settings */}
        <Card className="p-6 rounded-2xl border-border bg-card">
          <h3 className="text-base font-bold text-foreground mb-4">Account Settings</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={() => router.push('/forgot-password')}
              className="w-full rounded-xl justify-start border-border hover:bg-secondary text-foreground cursor-pointer"
            >
              Change Password
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full rounded-xl justify-start border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>

            {/* Delete Account */}
            {!deleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(true)}
                className="w-full rounded-xl justify-start border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            ) : (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-300 font-medium">
                    This will permanently delete your account and all associated data. This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Confirm Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(false)}
                    className="flex-1 rounded-xl border-border hover:bg-secondary text-foreground cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Support & Legal Footer */}
        <Card className="p-5 rounded-2xl border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <HeadphonesIcon className="h-4 w-4 text-primary" />
            Help & Support
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <a
              href="mailto:support@lifeartgroup.in"
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              support@lifeartgroup.in
            </a>
            <div className="flex items-center gap-4 pt-1 text-xs">
              <a href="/privacy-policy" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Shield className="h-3.5 w-3.5" /> Privacy Policy
              </a>
              <a href="/terms-of-service" className="flex items-center gap-1 hover:text-primary transition-colors">
                <FileText className="h-3.5 w-3.5" /> Terms of Service
              </a>
              <a href="/report" className="flex items-center gap-1 hover:text-primary transition-colors">
                <AlertTriangle className="h-3.5 w-3.5" /> Report Issue
              </a>
            </div>
          </div>
        </Card>

      </div>
    </PublicLayout>
  );
}

/* ── Inline contact-row component ─────────────────────────────── */
function ContactRow({
  icon: Icon,
  label,
  value,
  editable,
  onChange,
}: {
  icon: any;
  label: string;
  value: string;
  editable: boolean;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 bg-secondary/60 rounded-xl border border-border">
      <Icon className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {editable && onChange ? (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 mt-0.5 rounded-lg border-border bg-transparent text-sm px-1 focus:border-primary text-foreground"
          />
        ) : (
          <p className="font-semibold text-foreground text-sm mt-0.5 truncate">{value}</p>
        )}
      </div>
    </div>
  );
}
