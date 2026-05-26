'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserCog, UserPlus, Shield, ShieldCheck, Store, Mail, Trash2,
  Clock, CheckCircle2, XCircle, X, AlertTriangle, Loader2, Copy, Key,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';
import { canAccess } from '@/lib/rbac';
import { useAuth } from '@/hooks/use-auth';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  OWNER: { label: 'Owner', color: 'text-violet-400', bg: 'bg-violet-500/10', icon: ShieldCheck },
  BUSINESS_OWNER: { label: 'Owner', color: 'text-violet-400', bg: 'bg-violet-500/10', icon: ShieldCheck },
  BUSINESS_ADMIN: { label: 'Owner', color: 'text-violet-400', bg: 'bg-violet-500/10', icon: ShieldCheck },
  MODERATOR: { label: 'Moderator', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Shield },
  BUSINESS_MODERATOR: { label: 'Moderator', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Shield },
  STAFF: { label: 'Staff', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Store },
  BUSINESS_STAFF: { label: 'Staff', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Store },
};

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  isActive: boolean;
  name: string;
  email: string;
  avatar?: string;
  lastActive?: string | null;
  createdAt?: string;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd + '!';
}

export default function TeamManagementPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; email: string; password: string } | null>(null);

  const businessId = user?.businessId || user?.entity?.id;

  // Create-form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState(generatePassword());
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'BUSINESS_MODERATOR' | 'BUSINESS_STAFF'>('BUSINESS_STAFF');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const role = user?.rbacRole || (user?.role === 'business' ? 'BUSINESS_OWNER' : user?.role) || 'BUSINESS_OWNER';
    setUserRole(role);
  }, [user]);

  const fetchTeam = async () => {
    if (!businessId) return;
    setLoadingTeam(true);
    const res = await apiService.get<any>(`/v1/businesses/${businessId}/team`);
    if (res.data && !res.error) {
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setTeam(list);
    }
    setLoadingTeam(false);
  };

  useEffect(() => {
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const canManageTeam = canAccess(userRole, 'business.team.manage');

  if (!canManageTeam) {
    return (
      <BusinessLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-rose-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Team management is available to Business Owners only. Contact your business owner for access.
          </p>
        </div>
      </BusinessLayout>
    );
  }

  const openCreateModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword(generatePassword());
    setFormPhone('');
    setFormRole('BUSINESS_STAFF');
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword || !businessId) {
      setCreateError('Name, email and password are required');
      return;
    }
    setCreating(true);
    setCreateError('');
    const res = await apiService.post<any>(`/v1/businesses/${businessId}/team`, {
      name: formName,
      email: formEmail,
      password: formPassword,
      phone: formPhone || undefined,
      role: formRole,
    });
    setCreating(false);
    if (res.error) {
      setCreateError(res.error);
      return;
    }
    setShowCreateModal(false);
    // Show credentials to admin so they can share with the team member
    setCreatedCredentials({ name: formName, email: formEmail, password: formPassword });
    await fetchTeam();
  };

  const handleRemove = async (member: TeamMember) => {
    const res = await apiService.delete<any>(`/v1/team/${member.id}`);
    if (!res.error) {
      setTeam((prev) => prev.filter((m) => m.id !== member.id));
    }
    setConfirmRemove(null);
  };

  const copyAll = (creds: { name: string; email: string; password: string }) => {
    const text = `Name: ${creds.name}\nEmail: ${creds.email}\nPassword: ${creds.password}`;
    navigator.clipboard?.writeText(text);
  };

  const ownerCount = team.filter((m) => ['OWNER', 'BUSINESS_OWNER', 'BUSINESS_ADMIN'].includes(m.role)).length;
  const moderatorCount = team.filter((m) => ['MODERATOR', 'BUSINESS_MODERATOR'].includes(m.role)).length;
  const staffCount = team.filter((m) => ['STAFF', 'BUSINESS_STAFF'].includes(m.role)).length;

  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UserCog className="h-6 w-6 text-violet-400" />
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create accounts for your team. Share the generated credentials directly with each member.
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white gap-2 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Owners', value: ownerCount, role: 'OWNER' },
            { label: 'Moderators', value: moderatorCount, role: 'MODERATOR' },
            { label: 'Staff', value: staffCount, role: 'STAFF' },
          ].map((stat) => {
            const cfg = ROLE_CONFIG[stat.role];
            return (
              <Card key={stat.label} className="p-4 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl text-center">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-2', cfg.bg)}>
                  <cfg.icon className={cn('h-4 w-4', cfg.color)} />
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </Card>
            );
          })}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground px-1">Team Members ({team.length})</h3>
          {loadingTeam ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : team.length === 0 ? (
            <Card className="p-8 rounded-2xl border-dashed border-white/10 bg-white/5 text-center">
              <UserCog className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-40" />
              <p className="text-foreground font-semibold text-sm mb-1">No team members yet</p>
              <p className="text-xs text-muted-foreground">Create an account using the button above.</p>
            </Card>
          ) : null}
          {team.map((member) => {
            const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.STAFF;
            const isOwner = ['OWNER', 'BUSINESS_OWNER', 'BUSINESS_ADMIN'].includes(member.role);
            return (
              <Card key={member.id} className="p-4 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0', cfg.bg, cfg.color)}>
                      {(member.name || member.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5', cfg.bg, cfg.color)}>
                          <cfg.icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                        {member.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {member.lastActive && (
                      <p className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(member.lastActive).toLocaleDateString()}
                      </p>
                    )}
                    {!isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRemove(member)}
                        className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isOwner && (
                      <span className="text-[10px] text-muted-foreground px-2 py-1 rounded-lg border border-white/5">You</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Create-account modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-violet-400" />
                  Create Team Account
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Set up login credentials for your team member. They&apos;ll use the email + password
                you create here to sign in. Share the credentials with them directly after creation.
              </p>

              {createError && (
                <p className="mb-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{createError}</p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Full Name</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Jane Doe"
                    className="rounded-xl border-white/10 bg-white/5 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Email Address</label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="jane@yourbusiness.com"
                    className="rounded-xl border-white/10 bg-white/5 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Password</label>
                  <div className="flex gap-2">
                    <Input
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="rounded-xl border-white/10 bg-white/5 text-sm font-mono"
                    />
                    <Button
                      type="button"
                      onClick={() => setFormPassword(generatePassword())}
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-white/10 cursor-pointer"
                      title="Regenerate password"
                    >
                      <Key className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Phone (optional)</label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 91234 56789"
                    className="rounded-xl border-white/10 bg-white/5 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['BUSINESS_MODERATOR', 'BUSINESS_STAFF'] as const).map((role) => {
                      const cfg = ROLE_CONFIG[role];
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setFormRole(role)}
                          className={cn(
                            'flex flex-col items-start p-3 rounded-xl border transition-all text-left cursor-pointer',
                            formRole === role
                              ? 'border-violet-500/50 bg-violet-500/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10',
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <cfg.icon className={cn('h-3.5 w-3.5', cfg.color)} />
                            <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {role === 'BUSINESS_MODERATOR'
                              ? 'Bill review, customer moderation, fraud flagging'
                              : 'Offers, listings, media upload'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={!formName || !formEmail || !formPassword || creating}
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold gap-2 cursor-pointer"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Create Account</>}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Created-credentials display */}
        {createdCredentials && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-emerald-500/20 bg-zinc-900 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-foreground">Account Created</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Share these credentials with <span className="font-bold text-foreground">{createdCredentials.name}</span>.
                This is the only time the password will be shown — copy it now.
              </p>
              <div className="space-y-2 mb-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Email</p>
                  <p className="text-sm font-mono text-foreground">{createdCredentials.email}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Password</p>
                  <p className="text-sm font-mono text-foreground">{createdCredentials.password}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyAll(createdCredentials)}
                  variant="outline"
                  className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 gap-2 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy All
                </Button>
                <Button
                  onClick={() => setCreatedCredentials(null)}
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
                >
                  Done
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Remove confirmation */}
        {confirmRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-xs p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl text-center">
              <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">Remove Member</h3>
              <p className="text-xs text-muted-foreground mb-5">
                <span className="text-foreground font-semibold">{confirmRemove.name}</span> will lose
                access to this business dashboard immediately.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmRemove(null)}
                  className="flex-1 rounded-xl border-white/10 text-sm cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleRemove(confirmRemove)}
                  className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm cursor-pointer"
                >
                  Remove
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}
