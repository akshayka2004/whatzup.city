'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Instagram, Facebook, Linkedin, Twitter, Youtube,
  Globe, Phone, Plus, Trash2, Check, Edit2, X,
  Building2, User, ChevronDown,
} from 'lucide-react';

// ── Social platform config ────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400', placeholder: '@handle or URL' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-400', placeholder: 'Page URL' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400', placeholder: 'Company page URL' },
  { id: 'x', label: 'X / Twitter', icon: Twitter, color: 'text-slate-300', placeholder: '@handle' },
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

const STORAGE_KEY = 'business_social_links';
const PROFILE_KEY = 'business_profile_settings';

function loadLinks(): SocialLink[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveLinks(links: SocialLink[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }
}

interface BusinessProfile {
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  managerName: string;
  managerPhone: string;
  address: string;
  email: string;
}

export default function BusinessSettingsPage() {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>({
    businessName: 'Sunrise Café',
    ownerName: 'John Business',
    ownerPhone: '+91 98765 43210',
    managerName: 'Ravi Kumar',
    managerPhone: '+91 91234 56789',
    address: '12 Main Street, Downtown, City 400001',
    email: 'business@platform.com',
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);
  const [savedMsg, setSavedMsg] = useState('');

  // New link form
  const [addingLink, setAddingLink] = useState(false);
  const [newPlatform, setNewPlatform] = useState<PlatformId>('instagram');
  const [newCustomName, setNewCustomName] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    setSocialLinks(loadLinks());
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) setProfile(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;
    const newLink: SocialLink = {
      id: Date.now().toString(),
      platform: newPlatform,
      customName: newPlatform === 'custom' ? newCustomName : undefined,
      value: newValue.trim(),
    };
    const updated = [...socialLinks, newLink];
    setSocialLinks(updated);
    saveLinks(updated);
    setNewValue('');
    setNewCustomName('');
    setAddingLink(false);
  };

  const handleRemoveLink = (id: string) => {
    const updated = socialLinks.filter((l) => l.id !== id);
    setSocialLinks(updated);
    saveLinks(updated);
  };

  const handleSaveProfile = () => {
    setProfile(tempProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(tempProfile));
    setEditingProfile(false);
    setSavedMsg('Profile saved!');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const getPlatformConfig = (id: PlatformId) => PLATFORM_OPTIONS.find((p) => p.id === id)!;

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

        {/* ── Business Profile ──────────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Business Profile
            </h2>
            {!editingProfile ? (
              <Button
                onClick={() => { setTempProfile(profile); setEditingProfile(true); }}
                variant="outline"
                size="sm"
                className="rounded-xl border-white/10 text-slate-300 gap-1.5 cursor-pointer hover:bg-white/5"
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 cursor-pointer">
                  <Check className="h-3.5 w-3.5" /> Save
                </Button>
                <Button onClick={() => setEditingProfile(false)} variant="outline" size="sm" className="rounded-xl border-white/10 text-slate-300 cursor-pointer hover:bg-white/5">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {([
              { label: 'Business Name', key: 'businessName', icon: Building2 },
              { label: 'Owner Name', key: 'ownerName', icon: User },
              { label: 'Owner Phone', key: 'ownerPhone', icon: Phone },
              { label: 'Manager Name', key: 'managerName', icon: User },
              { label: 'Manager Phone', key: 'managerPhone', icon: Phone },
              { label: 'Business Email', key: 'email', icon: Globe },
            ] as const).map(({ label, key, icon: Icon }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
                {editingProfile ? (
                  <Input
                    value={tempProfile[key]}
                    onChange={(e) => setTempProfile({ ...tempProfile, [key]: e.target.value })}
                    className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground">{profile[key]}</span>
                  </div>
                )}
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Address</label>
              {editingProfile ? (
                <Input
                  value={tempProfile.address}
                  onChange={(e) => setTempProfile({ ...tempProfile, address: e.target.value })}
                  className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm"
                />
              ) : (
                <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-sm text-foreground">
                  {profile.address}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Social Links ──────────────────────────────────────── */}
        <Card className="p-6 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-cyan-400" />
              Social Media Links
            </h2>
            <Button
              onClick={() => setAddingLink(true)}
              size="sm"
              className="rounded-xl gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold cursor-pointer"
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
                <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <Icon className={`h-4 w-4 ${cfg.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {link.platform === 'custom' && link.customName ? link.customName : cfg.label}
                    </p>
                    <p className="text-sm font-medium text-foreground truncate">{link.value}</p>
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

          {/* Add link form */}
          {addingLink && (
            <form onSubmit={handleAddLink} className="mt-4 p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as PlatformId)}
                  className="w-full h-9 rounded-xl border border-white/10 bg-card text-sm text-foreground px-3 cursor-pointer"
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
                    className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm"
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
                  className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setAddingLink(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer">
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
