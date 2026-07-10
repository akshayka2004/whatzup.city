'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import { useRouter } from 'next/navigation';
import {
  Instagram, Facebook, Linkedin, Twitter, Youtube,
  Globe, Phone, Plus, Trash2, Check, Edit2, X,
  Building2, User, Loader2, MapPin, Mail, Tag, Upload, Image as ImageIcon,
} from 'lucide-react';

/* ── Social platform config ───────────────────────────────────── */
const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400', placeholder: '@handle or URL' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-400', placeholder: 'Page URL' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400', placeholder: 'Company page URL' },
  { id: 'x', label: 'X / Twitter', icon: Twitter, color: 'text-foreground/80', placeholder: '@handle' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-400', placeholder: 'Channel URL' },
  { id: 'website', label: 'Website', icon: Globe, color: 'text-cyan-400', placeholder: 'https://example.com' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: 'text-emerald-400', placeholder: '+91 98765 43210' },
  { id: 'custom', label: 'Custom Platform', icon: Globe, color: 'text-violet-400', placeholder: 'Platform name or URL' },
] as const;

type PlatformId = typeof PLATFORM_OPTIONS[number]['id'];

interface SocialLink {
  id: string;
  platform: PlatformId;
  customName?: string;
  value: string;
}

interface BusinessRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logo?: string | null;
  description?: string | null;
  tags?: string[];
  halalStatus?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  socialLinks?: Record<string, string>;
}

interface BusinessProfileForm {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  address: string;
  city: string;
  state: string;
  ownerName: string;
  ownerPhone: string;
  description: string;
}

export default function BusinessSettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [businessLoading, setBusinessLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [profile, setProfile] = useState<BusinessProfileForm>({
    businessName: '', businessEmail: '', businessPhone: '', address: '', city: '', state: '',
    ownerName: '', ownerPhone: '', description: '',
  });
  const [tempProfile, setTempProfile] = useState<BusinessProfileForm>(profile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // Logo / tags / halal
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [halalStatus, setHalalStatus] = useState<string>('');
  const [categorySlug, setCategorySlug] = useState<string>('');
  const isFood = categorySlug === 'food' || /food|restaurant|cafe|bakery/i.test(categorySlug);

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [addingLink, setAddingLink] = useState(false);
  const [newPlatform, setNewPlatform] = useState<PlatformId>('instagram');
  const [newCustomName, setNewCustomName] = useState('');
  const [newValue, setNewValue] = useState('');

  /* ── Redirect unauthorised ───────────────────────────────────── */
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  /* ── Load business + owner data ──────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setBusinessLoading(true);

      const res = await apiService.get<any>('/v1/businesses/owner/mine');
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const biz: BusinessRecord | null = list.length > 0 ? list[0] : null;

      if (!cancelled) {
        if (biz?.id) {
          setBusiness(biz);
          const next: BusinessProfileForm = {
            businessName: biz.name || user.entity?.name || '',
            businessEmail: biz.email || user.email || '',
            businessPhone: biz.phone || '',
            address: biz.address || '',
            city: biz.city || '',
            state: biz.state || '',
            ownerName: user.name || '',
            ownerPhone: (user as any).phone || biz.phone || '',
            description: biz.description || '',
          };
          setProfile(next);
          setTempProfile(next);
          setLogoUrl(biz.logo || '');
          setTags(Array.isArray(biz.tags) ? biz.tags : []);
          setHalalStatus(biz.halalStatus || '');
          setCategorySlug(biz.category?.slug || '');

          // Hydrate social links from business record if API has them, else localStorage
          const sl = biz.socialLinks;
          if (sl && typeof sl === 'object' && Object.keys(sl).length > 0) {
            const arr: SocialLink[] = Object.entries(sl).map(([platform, value], i) => ({
              id: `srv-${i}`,
              platform: (PLATFORM_OPTIONS.find((p) => p.id === platform)?.id || 'custom') as PlatformId,
              customName: platform,
              value: String(value),
            }));
            setSocialLinks(arr);
          } else if (typeof window !== 'undefined') {
            try {
              setSocialLinks(JSON.parse(localStorage.getItem('business_social_links') || '[]'));
            } catch {}
          }
        } else {
          // No business yet — pre-fill from user record only
          const next: BusinessProfileForm = {
            businessName: user.entity?.name || '',
            businessEmail: user.email || '',
            businessPhone: (user as any).phone || '',
            address: '',
            city: '',
            state: '',
            ownerName: user.name || '',
            ownerPhone: (user as any).phone || '',
            description: '',
          };
          setProfile(next);
          setTempProfile(next);
        }
        setBusinessLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  /* ── Save business profile ───────────────────────────────────── */
  const handleSaveProfile = async () => {
    if (!business?.id) {
      setErrMsg('No business record to update.');
      return;
    }

    setSaving(true);
    setSavedMsg('');
    setErrMsg('');

    const res = await apiService.patch<any>(`/v1/businesses/${business.id}`, {
      name: tempProfile.businessName,
      email: tempProfile.businessEmail || undefined,
      phone: tempProfile.businessPhone || undefined,
      address: tempProfile.address || undefined,
      city: tempProfile.city || undefined,
      state: tempProfile.state || undefined,
      description: tempProfile.description || '',
      tags,
      ...(isFood ? { halalStatus: halalStatus || null } : {}),
    });

    setSaving(false);

    if (res.error) {
      setErrMsg(res.error);
      return;
    }

    // Update owner-side fields too (name + phone on User)
    if (tempProfile.ownerName !== user?.name || tempProfile.ownerPhone !== (user as any)?.phone) {
      await apiService.patch('/v1/users/me', {
        name: tempProfile.ownerName,
        phone: tempProfile.ownerPhone || undefined,
      });
    }

    setProfile(tempProfile);
    setEditing(false);
    setSavedMsg('Settings saved successfully');
    setTimeout(() => setSavedMsg(''), 2500);

    await refreshUser();
  };

  /* ── Social links handlers (localStorage; server save best-effort) ── */
  const persistSocial = async (links: SocialLink[]) => {
    setSocialLinks(links);
    if (typeof window !== 'undefined') {
      localStorage.setItem('business_social_links', JSON.stringify(links));
    }
    // Attempt to push to the business record too (silent failure OK)
    if (business?.id) {
      const map: Record<string, string> = {};
      links.forEach((l) => {
        const key = l.platform === 'custom' && l.customName ? l.customName : l.platform;
        map[key] = l.value;
      });
      apiService.patch(`/v1/businesses/${business.id}`, { socialLinks: map }).catch(() => {});
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    persistSocial([
      ...socialLinks,
      {
        id: Date.now().toString(),
        platform: newPlatform,
        customName: newPlatform === 'custom' ? newCustomName : undefined,
        value: newValue.trim(),
      },
    ]);
    setNewValue('');
    setNewCustomName('');
    setAddingLink(false);
  };

  const handleRemoveLink = (id: string) => {
    persistSocial(socialLinks.filter((l) => l.id !== id));
  };

  const getPlatformConfig = (id: PlatformId) => PLATFORM_OPTIONS.find((p) => p.id === id)!;

  /* ── Logo upload (business-media is a public bucket) ──────────────── */
  const handleLogoUpload = async (file: File) => {
    if (!business?.id) { setErrMsg('Save your business profile first.'); return; }
    if (!file.type.startsWith('image/')) { setErrMsg('Logo must be an image.'); return; }
    setLogoUploading(true);
    setErrMsg('');
    try {
      const signed = await apiService.post<{ uploadUrl: string; fileKey: string; bucket: string }>(
        '/v1/storage/upload-url',
        { category: 'logo', filename: file.name, mimeType: file.type, entityId: business.id },
      );
      if (signed.error || !signed.data?.uploadUrl) throw new Error(signed.error || 'Upload URL failed');
      const { uploadUrl, fileKey, bucket } = signed.data;
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error(`Storage upload failed (${put.status})`);
      // business-media is public → deterministic public URL from the signed host.
      const publicUrl = `${new URL(uploadUrl).origin}/storage/v1/object/public/${bucket}/${fileKey}`;
      const patch = await apiService.patch(`/v1/businesses/${business.id}`, { logo: publicUrl });
      if (patch.error) throw new Error(patch.error);
      setLogoUrl(publicUrl);
      setBusiness((b) => (b ? { ...b, logo: publicUrl } : b));
      setSavedMsg('Logo updated');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e: any) {
      setErrMsg(e?.message || 'Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 12) setTags((prev) => [...prev, t]);
    setTagInput('');
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  /* ── Render ───────────────────────────────────────────────────── */
  if (authLoading || businessLoading) {
    return (
      <BusinessLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </BusinessLayout>
    );
  }

  if (!user) return null;

  return (
    <BusinessLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Business Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your profile, contacts, and social presence.</p>
        </div>

        {savedMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
            <Check className="h-4 w-4" />
            {savedMsg}
          </div>
        )}
        {errMsg && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold">
            <X className="h-4 w-4" />
            {errMsg}
          </div>
        )}

        {/* Business Logo */}
        <Card className="p-6 rounded-2xl border-border bg-card">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2 mb-5">
            <ImageIcon className="h-4 w-4 text-primary" /> Business Logo
          </h2>
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl border border-border bg-secondary/60 overflow-hidden flex items-center justify-center shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Business logo" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold ${logoUploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
                {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {logoUrl ? 'Replace Logo' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={logoUploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
                />
              </label>
              <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Shown on your storefront and listing cards.</p>
            </div>
          </div>
        </Card>

        {/* Business Profile */}
        <Card className="p-6 rounded-2xl border-border bg-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Business Profile
            </h2>
            {!editing ? (
              <Button
                onClick={() => { setTempProfile(profile); setEditing(true); setErrMsg(''); }}
                variant="outline"
                size="sm"
                className="rounded-xl border-border text-foreground gap-1.5 cursor-pointer hover:bg-secondary"
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </Button>
                <Button
                  onClick={() => { setTempProfile(profile); setEditing(false); setErrMsg(''); }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border text-foreground cursor-pointer hover:bg-secondary"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {([
              { label: 'Business Name', key: 'businessName', icon: Building2 },
              { label: 'Business Email', key: 'businessEmail', icon: Mail },
              { label: 'Business Phone', key: 'businessPhone', icon: Phone },
              { label: 'Owner Name', key: 'ownerName', icon: User },
              { label: 'Owner Phone', key: 'ownerPhone', icon: Phone },
              { label: 'City', key: 'city', icon: MapPin },
              { label: 'State', key: 'state', icon: MapPin },
            ] as const).map(({ label, key, icon: Icon }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
                {editing ? (
                  <Input
                    value={tempProfile[key]}
                    onChange={(e) => setTempProfile({ ...tempProfile, [key]: e.target.value })}
                    className="rounded-xl border-border bg-secondary/60 text-foreground text-sm focus:border-primary"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border">
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm text-foreground truncate">{profile[key] || '—'}</span>
                  </div>
                )}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Address</label>
              {editing ? (
                <Input
                  value={tempProfile.address}
                  onChange={(e) => setTempProfile({ ...tempProfile, address: e.target.value })}
                  className="rounded-xl border-border bg-secondary/60 text-foreground text-sm focus:border-primary"
                />
              ) : (
                <div className="px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground">
                  {profile.address || '—'}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Short Description</label>
              {editing ? (
                <textarea
                  value={tempProfile.description}
                  onChange={(e) => setTempProfile({ ...tempProfile, description: e.target.value })}
                  rows={3}
                  placeholder="A short line shown on your listing cards and storefront."
                  className="w-full rounded-xl border border-border bg-secondary/60 text-foreground text-sm p-3 focus:border-primary resize-none"
                />
              ) : (
                <div className="px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground whitespace-pre-wrap">{profile.description || '—'}</div>
              )}
            </div>

            {/* Tags */}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Tags <span className="font-normal">(shown on your listing cards)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
                    <Tag className="h-3 w-3" />{t}
                    {editing && (
                      <button type="button" onClick={() => removeTag(t)} className="ml-0.5 hover:text-primary/70 cursor-pointer"><X className="h-3 w-3" /></button>
                    )}
                  </span>
                ))}
                {tags.length === 0 && !editing && <span className="text-sm text-muted-foreground">—</span>}
              </div>
              {editing && (
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                  onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                  placeholder="Type a tag, press Enter"
                  className="mt-2 rounded-xl border-border bg-secondary/60 text-foreground text-sm focus:border-primary"
                />
              )}
            </div>

            {/* Halal — food businesses only */}
            {isFood && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Halal Status</label>
                {editing ? (
                  <div className="grid grid-cols-3 gap-2 max-w-md">
                    {[{ v: '', l: 'Not specified' }, { v: 'HALAL', l: 'Halal' }, { v: 'NON_HALAL', l: 'Non-Halal' }].map((o) => (
                      <button
                        type="button"
                        key={o.l}
                        onClick={() => setHalalStatus(o.v)}
                        className={`h-10 rounded-xl border text-xs font-medium cursor-pointer transition ${halalStatus === o.v ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-secondary/60 border-border text-muted-foreground hover:bg-secondary'}`}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm text-foreground">
                    {halalStatus === 'HALAL' ? 'Halal' : halalStatus === 'NON_HALAL' ? 'Non-Halal' : '—'}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Social Media Links */}
        <Card className="p-6 rounded-2xl border-border bg-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Social Media Links
            </h2>
            <Button
              onClick={() => setAddingLink(true)}
              size="sm"
              className="rounded-xl gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Link
            </Button>
          </div>

          {socialLinks.length === 0 && !addingLink && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No social links added yet. Click "Add Link" to connect your platforms.
            </div>
          )}

          <div className="space-y-2">
            {socialLinks.map((link) => {
              const cfg = getPlatformConfig(link.platform);
              const Icon = cfg.icon;
              return (
                <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60 border border-border">
                  <Icon className={`h-4 w-4 ${cfg.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {link.platform === 'custom' && link.customName ? link.customName : cfg.label}
                    </p>
                    <a
                      href={link.value.startsWith('http') ? link.value : `https://${link.value}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-sm font-medium truncate hover:underline ${cfg.color}`}
                    >
                      {link.value}
                    </a>
                  </div>
                  <button
                    onClick={() => handleRemoveLink(link.id)}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {addingLink && (
            <form onSubmit={handleAddLink} className="mt-4 p-4 rounded-xl border border-border bg-secondary/60 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as PlatformId)}
                  className="w-full h-9 rounded-xl border border-border bg-card text-sm text-foreground px-3 cursor-pointer"
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              {newPlatform === 'custom' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Platform Name</label>
                  <Input
                    value={newCustomName}
                    onChange={(e) => setNewCustomName(e.target.value)}
                    placeholder="e.g. TikTok, Pinterest, Telegram"
                    className="rounded-xl border-border bg-card text-foreground text-sm"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  {getPlatformConfig(newPlatform).placeholder}
                </label>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={getPlatformConfig(newPlatform).placeholder}
                  className="rounded-xl border-border bg-card text-foreground text-sm"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setAddingLink(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-border text-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer">
                  Add
                </Button>
              </div>
            </form>
          )}
        </Card>

      </div>
    </BusinessLayout>
  );
}
