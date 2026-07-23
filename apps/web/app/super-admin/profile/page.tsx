'use client';

import { useState, useEffect, useRef } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';
import {
  User,
  Mail,
  Phone,
  Camera,
  KeyRound,
  Check,
  Loader2,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminProfilePage() {
  const { user, refreshUser } = useAuth();

  // Profile state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone('');
      if (user.entity?.profile?.avatar) {
        setAvatarUrl(user.entity.profile.avatar);
      }
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    setSaveErr('');
    const res = await apiService.patch<any>('/v1/users/me', { name: name.trim(), phone: phone.trim() || undefined });
    setSaving(false);
    if (res.error) {
      setSaveErr(res.error);
    } else {
      setSaveMsg('Profile updated successfully');
      await refreshUser();
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const urlRes = await apiService.post<{ uploadUrl: string; fileKey: string }>(
        '/v1/storage/upload-url',
        { category: 'avatar', filename: file.name, mimeType: file.type, entityId: user?.id },
      );
      if (urlRes.error || !urlRes.data?.uploadUrl) throw new Error(urlRes.error || 'Upload URL failed');
      const { uploadUrl, fileKey } = urlRes.data;
      const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      const patch = await apiService.patch<any>('/v1/users/me', { avatar: fileKey });
      if (patch.error) throw new Error(patch.error);
      setAvatarUrl(URL.createObjectURL(file));
      await refreshUser();
    } catch (err: any) {
      setAvatarError(err.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwErr('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPwErr('Password must be at least 8 characters');
      return;
    }
    setPwSaving(true);
    setPwMsg('');
    setPwErr('');
    const res = await apiService.post<any>('/v1/users/me/change-password', {
      currentPassword,
      newPassword,
    });
    setPwSaving(false);
    if (res.error) {
      setPwErr(res.error);
    } else {
      setPwMsg('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwMsg(''), 3000);
    }
  };

  const initials = (user?.name || 'A').charAt(0).toUpperCase();
  const roleLabel = user?.rbacRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Portal Admin';

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your admin account details</p>
        </div>

        {/* Avatar + basic info */}
        <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
          <div className="flex items-center gap-5 mb-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-primary to-info flex items-center justify-center text-2xl font-extrabold text-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary hover:bg-primary flex items-center justify-center cursor-pointer border-2 border-background"
              >
                {avatarUploading ? (
                  <Loader2 className="h-3 w-3 text-white animate-spin" />
                ) : (
                  <Camera className="h-3 w-3 text-white" />
                )}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                {roleLabel}
              </span>
            </div>
          </div>

          {avatarError && (
            <p className="mb-4 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {avatarError}
            </p>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1">
                <User className="h-3 w-3" /> Full Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="rounded-xl border-border bg-secondary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email (read-only)
              </label>
              <Input
                value={user?.email || ''}
                disabled
                className="rounded-xl border-border bg-secondary opacity-60"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1">
                <Phone className="h-3 w-3" /> Phone
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="rounded-xl border-border bg-secondary"
              />
            </div>

            {saveMsg && (
              <p className="text-xs text-success flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> {saveMsg}
              </p>
            )}
            {saveErr && (
              <p className="text-xs text-destructive">{saveErr}</p>
            )}

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-primary hover:bg-primary text-white font-semibold cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Profile'}
            </Button>
          </form>
        </Card>

        {/* Password change */}
        <Card className="p-6 rounded-2xl border-border bg-card/40 backdrop-blur-xl">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-5">
            <KeyRound className="h-4 w-4 text-warning" />
            Change Password
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Current Password</label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Your current password"
                  required
                  className="rounded-xl border-border bg-secondary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">New Password</label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="rounded-xl border-border bg-secondary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="rounded-xl border-border bg-secondary"
              />
            </div>

            {pwMsg && (
              <p className="text-xs text-success flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> {pwMsg}
              </p>
            )}
            {pwErr && (
              <p className="text-xs text-destructive">{pwErr}</p>
            )}

            <Button
              type="submit"
              disabled={pwSaving}
              className="w-full rounded-xl bg-warning hover:bg-warning text-white font-semibold cursor-pointer"
            >
              {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
            </Button>
          </form>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
