'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Loader2, Save, Plus, Trash2, Link2, Image as ImageIcon,
  Upload, CheckCircle2, AlertTriangle, KeyRound, Building2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/services/api-service';
import { uploadCivicImage, isUploadConfigured } from '@/lib/civic-upload';

interface SocialLink { label: string; url: string; }
interface CivicProfile {
  entityType: string;
  status: string;
  email: string;
  referralCode: string | null;
  organizationName: string;
  contactName: string;
  phone: string;
  description: string;
  address: string;
  district: string;
  website: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  socialLinks: SocialLink[];
}

export default function CivicProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CivicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Password form
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    apiService
      .get<CivicProfile>('/v1/civic/profile')
      .then((res) => {
        if (res.data && !res.error) {
          setProfile({ ...res.data, socialLinks: res.data.socialLinks || [] });
        } else {
          setMsg({ type: 'err', text: res.error || 'Failed to load profile.' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (patch: Partial<CivicProfile>) =>
    setProfile((p) => (p ? { ...p, ...patch } : p));

  const addLink = () =>
    setProfile((p) => (p ? { ...p, socialLinks: [...p.socialLinks, { label: '', url: '' }] } : p));
  const removeLink = (i: number) =>
    setProfile((p) => (p ? { ...p, socialLinks: p.socialLinks.filter((_, idx) => idx !== i) } : p));
  const setLink = (i: number, field: keyof SocialLink, val: string) =>
    setProfile((p) =>
      p
        ? { ...p, socialLinks: p.socialLinks.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)) }
        : p,
    );

  const handleImage = async (
    file: File | undefined,
    folder: 'logos' | 'banners',
    setBusy: (b: boolean) => void,
    field: 'logoUrl' | 'bannerUrl',
  ) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await uploadCivicImage(file, folder);
      update({ [field]: url } as Partial<CivicProfile>);
      setMsg({ type: 'ok', text: 'Image uploaded. Remember to save.' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || 'Upload failed. Paste an image URL instead.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMsg(null);
    const res = await apiService.patch<CivicProfile>('/v1/civic/profile', {
      organizationName: profile.organizationName,
      contactName: profile.contactName,
      phone: profile.phone,
      description: profile.description,
      address: profile.address,
      district: profile.district,
      website: profile.website,
      logoUrl: profile.logoUrl,
      bannerUrl: profile.bannerUrl,
      socialLinks: profile.socialLinks.filter((l) => l.label.trim() && l.url.trim()),
    });
    if (!res.error && res.data) {
      setProfile({ ...res.data, socialLinks: res.data.socialLinks || [] });
      setMsg({ type: 'ok', text: 'Profile saved successfully.' });
    } else {
      setMsg({ type: 'err', text: res.error || 'Save failed.' });
    }
    setSaving(false);
  };

  const handlePassword = async () => {
    setPwMsg(null);
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    setPwSaving(true);
    const res = await apiService.post<{ message: string }>('/v1/civic/change-password', {
      currentPassword: pwCurrent,
      newPassword: pwNew,
    });
    if (!res.error) {
      setPwMsg({ type: 'ok', text: 'Password updated.' });
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } else {
      setPwMsg({ type: 'err', text: res.error || 'Password change failed.' });
    }
    setPwSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="p-8 rounded-2xl text-center max-w-md">
          <AlertTriangle className="h-8 w-8 mx-auto text-rose-400 mb-3" />
          <p className="text-sm text-muted-foreground">{msg?.text || 'Profile unavailable.'}</p>
          <Button onClick={() => router.push('/civic/dashboard')} className="mt-4 rounded-xl">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/5 bg-card/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              onClick={() => router.push('/civic/dashboard')}
              variant="outline"
              size="sm"
              className="rounded-xl border-white/10 h-9 gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <h1 className="text-sm sm:text-base font-bold truncate">Organisation Profile</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold h-9 px-4 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {msg && (
          <div
            className={`p-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
              msg.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {msg.text}
          </div>
        )}

        {/* Banner + Logo */}
        <Card className="rounded-2xl border-white/5 bg-card/60 overflow-hidden">
          <div className="relative h-32 sm:h-40 bg-gradient-to-r from-primary/20 to-accent/20">
            {profile.bannerUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.bannerUrl} alt="banner" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <button
              onClick={() => bannerInput.current?.click()}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur text-white text-xs font-medium hover:bg-black/70 cursor-pointer"
            >
              {uploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              Banner
            </button>
            <input
              ref={bannerInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImage(e.target.files?.[0], 'banners', setUploadingBanner, 'bannerUrl')}
            />
          </div>
          <div className="px-4 sm:px-6 pb-5">
            <div className="-mt-10 flex items-end gap-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl border-4 border-background bg-card overflow-hidden flex items-center justify-center">
                  {profile.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.logoUrl} alt="logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={() => logoInput.current?.click()}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 cursor-pointer"
                >
                  {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </button>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0], 'logos', setUploadingLogo, 'logoUrl')}
                />
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-sm font-bold truncate">{profile.organizationName || 'Organisation'}</p>
                <p className="text-[11px] text-muted-foreground">{profile.entityType} · {profile.email}</p>
              </div>
            </div>
            {!isUploadConfigured() && (
              <p className="text-[11px] text-amber-400/80 mt-3">
                Direct upload not configured — paste image URLs in the fields below.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <Field label="Logo URL">
                <Input value={profile.logoUrl ?? ''} onChange={(e) => update({ logoUrl: e.target.value })} placeholder="https://…" className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
              </Field>
              <Field label="Banner URL">
                <Input value={profile.bannerUrl ?? ''} onChange={(e) => update({ bannerUrl: e.target.value })} placeholder="https://…" className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
              </Field>
            </div>
          </div>
        </Card>

        {/* Details */}
        <Card className="p-5 sm:p-6 rounded-2xl border-white/5 bg-card/60 space-y-4">
          <h2 className="text-sm font-bold">Organisation Details</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Organisation Name">
              <Input value={profile.organizationName} onChange={(e) => update({ organizationName: e.target.value })} className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
            <Field label="Contact Person">
              <Input value={profile.contactName} onChange={(e) => update({ contactName: e.target.value })} className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
            <Field label="Phone">
              <Input value={profile.phone} onChange={(e) => update({ phone: e.target.value })} className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
            <Field label="District">
              <Input value={profile.district} onChange={(e) => update({ district: e.target.value })} className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
            <Field label="Website">
              <Input value={profile.website} onChange={(e) => update({ website: e.target.value })} placeholder="https://…" className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
            <Field label="Address">
              <Input value={profile.address} onChange={(e) => update({ address: e.target.value })} className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={profile.description} onChange={(e) => update({ description: e.target.value })} rows={3} className="bg-background border-input text-sm rounded-xl resize-none" />
          </Field>
        </Card>

        {/* Social Links */}
        <Card className="p-5 sm:p-6 rounded-2xl border-white/5 bg-card/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Social Media Links</h2>
            </div>
            <Button onClick={addLink} variant="outline" size="sm" className="rounded-xl h-8 gap-1.5 text-xs cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            These appear as clickable buttons on your public notice cards.
          </p>
          {profile.socialLinks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No links added yet.</p>
          ) : (
            <div className="space-y-2">
              {profile.socialLinks.map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={link.label}
                    onChange={(e) => setLink(i, 'label', e.target.value)}
                    placeholder="Heading (e.g. Facebook)"
                    className="h-10 bg-background border-input text-sm text-foreground rounded-xl w-1/3"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => setLink(i, 'url', e.target.value)}
                    placeholder="https://…"
                    className="h-10 bg-background border-input text-sm text-foreground rounded-xl flex-1"
                  />
                  <button
                    onClick={() => removeLink(i)}
                    className="shrink-0 text-muted-foreground hover:text-rose-400 p-2 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Change Password */}
        <Card className="p-5 sm:p-6 rounded-2xl border-white/5 bg-card/60 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Change Password</h2>
          </div>
          {pwMsg && (
            <div
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                pwMsg.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {pwMsg.type === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {pwMsg.text}
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Current">
              <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
            <Field label="New">
              <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
            <Field label="Confirm">
              <Input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className="h-10 bg-background border-input text-sm text-foreground rounded-xl" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handlePassword}
              disabled={pwSaving || !pwCurrent || !pwNew}
              className="rounded-xl h-9 px-4 text-sm font-semibold gap-1.5 cursor-pointer"
            >
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Update Password
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
