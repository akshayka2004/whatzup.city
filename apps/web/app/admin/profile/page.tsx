'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { useRouter } from 'next/navigation';
import {
  Edit2, Mail, Phone, MapPin, LogOut, Check, X,
  CalendarDays, Camera, Loader2, AlertTriangle,
  HeadphonesIcon, Shield, FileText, Copy, Users, ShieldAlert,
} from 'lucide-react';

interface AdminProfile {
  firstName: string;
  lastName: string;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
}

export default function AdminProfilePage() {
  const { user, loading: authLoading, signOut, refreshUser } = useAuth();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile>({ firstName: '', lastName: '', phone: '', city: '', district: '', state: '' });
  const [tempProfile, setTempProfile] = useState<AdminProfile>(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setProfileLoading(true);

      // Referral stats
      const refRes = await apiService.get<any>('/v1/users/me/referrals');
      if (!cancelled && refRes.data) {
        if (refRes.data.referralCode) setReferralCode(refRes.data.referralCode);
        if (typeof refRes.data.count === 'number') setReferralCount(refRes.data.count);
      }

      // User profile from auth
      const parts = (user.name || '').trim().split(/\s+/);
      const fallback: AdminProfile = {
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
        phone: (user as any).phone || '',
        city: '', district: '', state: '',
      };
      if (!cancelled) {
        setProfile(fallback);
        setTempProfile(fallback);
      }

      if (!cancelled) setProfileLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    setSaveErr('');

    const res = await apiService.put<any>('/v1/users/me', {
      name: `${tempProfile.firstName} ${tempProfile.lastName}`.trim(),
      phone: tempProfile.phone || undefined,
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
    await refreshUser();
  };

  const initials = (() => {
    const f = profile.firstName?.charAt(0) || user?.name?.charAt(0) || '?';
    const l = profile.lastName?.charAt(0) || '';
    return `${f}${l}`.toUpperCase();
  })();

  const memberSince = user
    ? new Date((user as any).createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  if (authLoading || profileLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) return null;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Hero Profile Card */}
        <Card className="rounded-2xl border-border bg-card/40 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="p-7 pt-9">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center text-3xl font-extrabold shadow-lg ring-4 ring-primary/15">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-warning flex items-center justify-center shadow-md">
                  <ShieldAlert className="h-3.5 w-3.5 text-black" />
                </div>
              </div>

              {/* Name + meta */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1 flex-wrap">
                  <h2 className="text-2xl font-extrabold text-foreground">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 uppercase tracking-wide">
                    {(user as any).role || 'Admin'}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-3">
                  {user.email} {memberSince && `• Member since ${memberSince}`}
                </p>

                {/* Referral code + count */}
                {referralCode && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Referral Code</span>
                      <span className="font-mono text-sm font-bold text-primary tracking-widest">{referralCode}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(referralCode); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }}
                        className="text-primary hover:text-primary/70 cursor-pointer transition-colors"
                        title="Copy referral code"
                      >
                        {referralCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {referralCount !== null && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success/10 border border-success/20">
                        <Users className="h-3.5 w-3.5 text-success" />
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Referrals</span>
                        <span className="text-sm font-bold text-success">{referralCount}</span>
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
                    className="rounded-xl gap-2 bg-success hover:bg-success text-white cursor-pointer disabled:opacity-60"
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
          <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-medium flex items-center gap-2">
            <Check className="h-4 w-4" /> {saveMsg}
          </div>
        )}
        {saveErr && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
            <X className="h-4 w-4" /> {saveErr}
          </div>
        )}

        {/* Personal Information */}
        <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
          <h3 className="text-base font-bold text-foreground mb-5">Personal Information</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">First Name</label>
              <Input
                value={isEditing ? tempProfile.firstName : profile.firstName}
                onChange={(e) => setTempProfile({ ...tempProfile, firstName: e.target.value })}
                className="rounded-xl border-border bg-secondary focus:border-primary text-foreground disabled:opacity-70"
                disabled={!isEditing}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Last Name</label>
              <Input
                value={isEditing ? tempProfile.lastName : profile.lastName}
                onChange={(e) => setTempProfile({ ...tempProfile, lastName: e.target.value })}
                className="rounded-xl border-border bg-secondary focus:border-primary text-foreground disabled:opacity-70"
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="space-y-3">
            <ContactRow icon={Mail} label="Email Address" value={user.email} editable={false} />
            <ContactRow
              icon={Phone}
              label="Phone Number"
              value={isEditing ? (tempProfile.phone || '') : (profile.phone || '—')}
              editable={isEditing}
              onChange={(v) => setTempProfile({ ...tempProfile, phone: v })}
            />
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
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
              className="w-full rounded-xl justify-start border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Support & Legal */}
        <Card className="p-5 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <HeadphonesIcon className="h-4 w-4 text-primary" />
            Help & Support
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <a href="mailto:support@lifeartgroup.in" className="flex items-center gap-2 hover:text-primary transition-colors">
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
    </AdminLayout>
  );
}

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
    <div className="flex items-center gap-3 p-3.5 bg-secondary rounded-xl border border-border">
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
