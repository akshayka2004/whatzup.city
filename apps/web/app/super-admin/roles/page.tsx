'use client';

import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/layouts/super-admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Plus,
  X,
  Loader2,
  UserCheck,
  Mail,
  KeyRound,
  User,
  CheckCircle2,
  Calendar,
  Clock,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  { value: 'MASTER_ADMIN', label: 'Portal Admin', description: 'Can manage registrations, approvals, reports, and categories' },
  { value: 'PORTAL_ADMIN', label: 'Portal Admin (Alt)', description: 'Same as Portal Admin — alternate label' },
];

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

function formatDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function roleLabel(role: string) {
  if (role === 'SUPER_ADMIN') return { label: 'Super Admin', color: 'text-primary bg-primary/10 border-primary/20' };
  if (role === 'MASTER_ADMIN') return { label: 'Portal Admin', color: 'text-info bg-info/10 border-info/20' };
  return { label: role, color: 'text-muted-foreground bg-muted border-border' };
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'MASTER_ADMIN' | 'PORTAL_ADMIN'>('MASTER_ADMIN');

  const fetchAdmins = async () => {
    setLoading(true);
    const res = await apiService.get<any>('/v1/users/admin/list');
    if (res.data && !res.error) {
      setAdmins(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const res = await apiService.post<any>('/v1/users/admin/create', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    });

    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    setSuccess(`Admin account created for ${email}`);
    setName(''); setEmail(''); setPassword('');
    setIsOpen(false);
    fetchAdmins();
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Admin Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage Portal Admin accounts for platform operations.
            </p>
          </div>
          <Button
            onClick={() => { setIsOpen(true); setError(''); setSuccess(''); }}
            className="rounded-xl bg-primary hover:bg-primary text-white gap-2 font-semibold cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Admin
          </Button>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-sm text-success bg-success/10 border border-success/20 rounded-xl px-4 py-3">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Admin list */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : admins.length === 0 ? (
          <Card className="p-10 rounded-2xl border-dashed border-border bg-secondary text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-foreground font-semibold mb-1">No admin accounts yet</p>
            <p className="text-xs text-muted-foreground">Create your first Portal Admin account above.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => {
              const { label, color } = roleLabel(admin.role);
              return (
                <Card
                  key={admin.id}
                  className="p-5 rounded-2xl border-border bg-card/40 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary/20 to-info/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{admin.name}</p>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', color)}>
                            {label}
                          </span>
                          {!admin.isActive && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-5 text-xs text-muted-foreground shrink-0">
                      <div className="text-right">
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Created
                        </p>
                        <p className="text-foreground font-medium">{formatDate(admin.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Last Login
                        </p>
                        <p className="text-foreground font-medium">{formatDate(admin.lastLoginAt)}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Admin Modal */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Create Admin Account
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {error && (
                <p className="mb-4 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1">
                    <User className="h-3 w-3" /> Full Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Portal Admin Name"
                    required
                    className="rounded-xl border-border bg-secondary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@whtzup.city"
                    required
                    className="rounded-xl border-border bg-secondary"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1">
                    <KeyRound className="h-3 w-3" /> Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    className="rounded-xl border-border bg-secondary"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> Role
                  </label>
                  <div className="space-y-2">
                    {ROLE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                          role === opt.value
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-border bg-secondary hover:bg-secondary',
                        )}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={opt.value}
                          checked={role === opt.value}
                          onChange={() => setRole(opt.value as any)}
                          className="mt-0.5 accent-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-xl border-border text-foreground hover:bg-secondary cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-primary hover:bg-primary text-white font-semibold cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Admin'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
