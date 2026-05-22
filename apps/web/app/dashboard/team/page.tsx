'use client';

import { useState, useEffect } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserCog,
  UserPlus,
  Shield,
  ShieldCheck,
  Store,
  Mail,
  MoreVertical,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { canAccess, getRoleLabel } from '@/lib/rbac';

// ── MOCK DATA ─────────────────────────────────────────────────────────

const MOCK_TEAM = [
  {
    id: 'tm-001',
    name: 'Sunita Rao',
    email: 'sunita@business.com',
    role: 'BUSINESS_OWNER',
    avatar: 'SR',
    status: 'ACTIVE',
    joinedAt: '2025-01-15',
    lastActive: '2 hours ago',
    actionsCount: 142,
  },
  {
    id: 'tm-002',
    name: 'Arjun Nair',
    email: 'arjun@business.com',
    role: 'BUSINESS_MODERATOR',
    avatar: 'AN',
    status: 'ACTIVE',
    joinedAt: '2025-03-20',
    lastActive: '15 min ago',
    actionsCount: 89,
  },
  {
    id: 'tm-003',
    name: 'Kavya Menon',
    email: 'kavya@business.com',
    role: 'BUSINESS_MODERATOR',
    avatar: 'KM',
    status: 'ACTIVE',
    joinedAt: '2025-05-01',
    lastActive: '1 day ago',
    actionsCount: 34,
  },
  {
    id: 'tm-004',
    name: 'Deepak Kumar',
    email: 'deepak@business.com',
    role: 'BUSINESS_STAFF',
    avatar: 'DK',
    status: 'ACTIVE',
    joinedAt: '2025-06-10',
    lastActive: '3 days ago',
    actionsCount: 18,
  },
];

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  BUSINESS_OWNER: { label: 'Owner', color: 'text-violet-400', bg: 'bg-violet-500/10', icon: ShieldCheck },
  BUSINESS_ADMIN: { label: 'Owner', color: 'text-violet-400', bg: 'bg-violet-500/10', icon: ShieldCheck },
  BUSINESS_MODERATOR: { label: 'Moderator', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Shield },
  BUSINESS_STAFF: { label: 'Staff', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Store },
};

export default function TeamManagementPage() {
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [team, setTeam] = useState(MOCK_TEAM);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'BUSINESS_MODERATOR' | 'BUSINESS_STAFF'>('BUSINESS_MODERATOR');
  const [inviteSent, setInviteSent] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('user_session') || localStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          const role = u?.rbacRole || (u?.role === 'business' ? 'BUSINESS_OWNER' : u?.role);
          if (role) setUserRole(role);
        }
      } catch (_) {}
    }
  }, []);

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

  const handleInvite = () => {
    if (!inviteEmail) return;
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setShowInviteModal(false);
      setInviteEmail('');
    }, 2000);
  };

  const handleRemove = (id: string) => {
    setTeam((prev) => prev.filter((m) => m.id !== id));
    setConfirmRemove(null);
  };

  const ownerCount = team.filter((m) => m.role === 'BUSINESS_OWNER' || m.role === 'BUSINESS_ADMIN').length;
  const moderatorCount = team.filter((m) => m.role === 'BUSINESS_MODERATOR').length;
  const staffCount = team.filter((m) => m.role === 'BUSINESS_STAFF').length;

  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UserCog className="h-6 w-6 text-violet-400" />
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your business team members and their access levels
            </p>
          </div>
          <Button
            onClick={() => setShowInviteModal(true)}
            className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>

        {/* ── STATS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Owners', value: ownerCount, role: 'BUSINESS_OWNER' },
            { label: 'Moderators', value: moderatorCount, role: 'BUSINESS_MODERATOR' },
            { label: 'Staff', value: staffCount, role: 'BUSINESS_STAFF' },
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

        {/* ── PERMISSION OVERVIEW ─────────────────────────────────── */}
        <Card className="p-5 rounded-2xl border-white/5 bg-card/40">
          <h3 className="text-sm font-semibold text-foreground mb-3">Role Permissions Overview</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                role: 'BUSINESS_OWNER',
                permissions: ['All analytics', 'Bill verification + override', 'Team management', 'Subscriptions', 'Full dashboard'],
                restricted: [],
              },
              {
                role: 'BUSINESS_MODERATOR',
                permissions: ['Bill queue review', 'Approve/Reject bills', 'Review moderation', 'Flag for escalation'],
                restricted: ['Analytics', 'Financial data', 'Team management', 'Subscriptions'],
              },
              {
                role: 'BUSINESS_STAFF',
                permissions: ['Manage offers', 'Upload media', 'Manage listings'],
                restricted: ['Bills', 'Analytics', 'Customers', 'Subscriptions'],
              },
            ].map((item) => {
              const cfg = ROLE_CONFIG[item.role];
              return (
                <div key={item.role} className="rounded-xl border border-white/5 bg-white/5 p-4">
                  <div className={cn('flex items-center gap-2 mb-3 px-2 py-1 rounded-lg w-fit', cfg.bg)}>
                    <cfg.icon className={cn('h-3.5 w-3.5', cfg.color)} />
                    <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {item.permissions.map((p) => (
                      <p key={p} className="text-xs text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> {p}
                      </p>
                    ))}
                  </div>
                  {item.restricted.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-white/5">
                      {item.restricted.map((p) => (
                        <p key={p} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <XCircle className="h-3 w-3 text-rose-400/60 shrink-0" /> {p}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── TEAM LIST ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground px-1">Team Members ({team.length})</h3>
          {team.map((member) => {
            const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG['BUSINESS_STAFF'];
            const isCurrentUser = member.role === 'BUSINESS_OWNER' || member.role === 'BUSINESS_ADMIN';

            return (
              <Card key={member.id} className="p-4 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0', cfg.bg, cfg.color)}>
                      {member.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{member.name}</p>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5', cfg.bg, cfg.color)}>
                          <cfg.icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {member.lastActive}
                      </p>
                      <p className="text-xs text-foreground font-medium mt-0.5">{member.actionsCount} actions</p>
                    </div>

                    {!isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRemove(member.id)}
                        className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isCurrentUser && (
                      <span className="text-[10px] text-muted-foreground px-2 py-1 rounded-lg border border-white/5">
                        You
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ── INVITE MODAL ────────────────────────────────────────── */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-violet-400" />
                  Invite Team Member
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="team@yourbusiness.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-9 rounded-xl border-white/10 bg-white/5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1.5">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['BUSINESS_MODERATOR', 'BUSINESS_STAFF'] as const).map((role) => {
                      const cfg = ROLE_CONFIG[role];
                      return (
                        <button
                          key={role}
                          onClick={() => setInviteRole(role)}
                          className={cn(
                            'flex flex-col items-start p-3 rounded-xl border transition-all text-left',
                            inviteRole === role
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
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviteSent}
                  className={cn(
                    'w-full rounded-xl text-sm font-semibold gap-2',
                    inviteSent
                      ? 'bg-emerald-600 text-white'
                      : 'bg-violet-600 hover:bg-violet-500 text-white',
                  )}
                >
                  {inviteSent ? (
                    <><CheckCircle2 className="h-4 w-4" /> Invitation Sent!</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send Invitation</>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── REMOVE CONFIRMATION ─────────────────────────────────── */}
        {confirmRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-xs p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl text-center">
              <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-rose-400" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">Remove Member</h3>
              <p className="text-xs text-muted-foreground mb-5">
                This member will lose all access to the business dashboard immediately.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmRemove(null)}
                  className="flex-1 rounded-xl border-white/10 text-sm"
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
