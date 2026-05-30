'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Bell, Megaphone, Heart, Plus, Send, Trash2,
  X, CheckCircle2, Clock, Globe, LogOut, AlertTriangle,
  FileText, Loader2, Users, Newspaper, UserCog, Gift,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/services/api-service';

interface Notice {
  id: number | string;
  title: string;
  type: 'ALERT' | 'ANNOUNCEMENT' | 'NOTICE';
  body: string;
  publishedAt: string;
  status: string;
  expiresAt?: string;
}

function isExpired(n: Notice): boolean {
  if (n.status === 'EXPIRED') return true;
  if (!n.expiresAt) return false;
  return new Date(n.expiresAt) < new Date();
}

type NoticeType = 'ALERT' | 'ANNOUNCEMENT' | 'NOTICE';

const TYPE_CONFIG: Record<NoticeType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  ALERT:        { label: 'Alert',        color: 'text-rose-400',  bg: 'bg-rose-500/10',  border: 'border-rose-500/20',  icon: AlertTriangle },
  ANNOUNCEMENT: { label: 'Announcement', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Megaphone },
  NOTICE:       { label: 'Notice',       color: 'text-cyan-400',  bg: 'bg-cyan-500/10',  border: 'border-cyan-500/20',  icon: FileText },
};

const ORG_ICON: Record<string, React.ElementType> = {
  NGO: Heart,
  COMMUNITY: Users,
  NEWS_FORUM: Newspaper,
};

const ORG_COLOR: Record<string, string> = {
  NGO: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  COMMUNITY: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  NEWS_FORUM: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

export default function CivicDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const orgType = (user?.entity?.type as string) ?? 'NGO';
  const OrgIcon = ORG_ICON[orgType] ?? Heart;
  const orgColorClass = ORG_COLOR[orgType] ?? ORG_COLOR.NGO;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [referralCount, setReferralCount] = useState<number>(0);

  useEffect(() => {
    apiService.get<{ count: number }>('/v1/civic/referrals').then((res) => {
      if (res.data && !res.error) setReferralCount(res.data.count ?? 0);
    });
  }, []);

  useEffect(() => {
    setLoadingNotices(true);
    apiService
      .get<any>('/v1/government-alerts')
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
          setNotices(
            list.map((a: any) => ({
              id: a.id,
              title: a.title || '—',
              type: (['ALERT', 'ANNOUNCEMENT', 'NOTICE'].includes(a.type?.toUpperCase())
                ? a.type.toUpperCase()
                : 'NOTICE') as NoticeType,
              body: a.content || a.message || a.body || '',
              publishedAt: a.createdAt
                ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : a.publishedAt || '—',
              status: a.isActive !== false ? 'ACTIVE' : 'EXPIRED',
              expiresAt: a.expiresAt || a.validUntil || undefined,
            })),
          );
        }
      })
      .finally(() => setLoadingNotices(false));
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formType, setFormType] = useState<NoticeType>('NOTICE');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_session');
      localStorage.removeItem('user');
    }
    router.push('/login');
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) return;
    setSubmitting(true);

    // Post to government-alerts endpoint (shared civic notification infra).
    // API expects: title, body, category, priority (+ optional expiresAt).
    const priorityMap: Record<NoticeType, string> = {
      ALERT: 'HIGH',
      ANNOUNCEMENT: 'MEDIUM',
      NOTICE: 'LOW',
    };
    const res = await apiService.post<any>('/v1/government-alerts', {
      title: formTitle,
      body: formBody,
      category: formType,
      priority: priorityMap[formType],
      expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined,
    });

    if (!res.error) {
      const newNotice: Notice = {
        id: res.data?.id ?? Date.now(),
        title: formTitle,
        type: formType,
        body: formBody,
        publishedAt: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'ACTIVE',
        expiresAt: formExpiresAt || undefined,
      };
      setNotices([newNotice, ...notices]);
    }

    setFormTitle(''); setFormBody(''); setFormType('NOTICE'); setFormExpiresAt('');
    setShowForm(false);
    setSuccess('Published successfully!');
    setTimeout(() => setSuccess(''), 3000);
    setSubmitting(false);
  };

  const handleDelete = (id: number | string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  const visible = notices.filter((n) => !isExpired(n));

  const orgLabel: Record<string, string> = {
    NGO: 'NGO Portal',
    COMMUNITY: 'Community Portal',
    NEWS_FORUM: 'News Forum Portal',
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-white/5 bg-card/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${orgColorClass}`}>
              <OrgIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{orgLabel[orgType] ?? 'Civic Portal'}</p>
              <p className="text-[10px] text-muted-foreground">{user?.entity?.name ?? 'Organisation'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setShowForm(true)}
              className="rounded-xl gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold cursor-pointer h-9 px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Publish</span>
            </Button>
            <Button
              onClick={() => router.push('/civic/profile')}
              variant="outline"
              size="sm"
              className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer gap-1.5 h-9"
            >
              <UserCog className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="rounded-xl border-white/10 text-rose-400 hover:bg-rose-500/10 cursor-pointer gap-1.5 h-9"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Verification pending banner */}
        {user?.entity?.status === 'PENDING_VERIFICATION' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-400">Verification Pending</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your organisation is under admin review. Full features unlock after approval.
              </p>
            </div>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        {/* Welcome */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
            {orgLabel[orgType] ?? 'Civic Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish alerts, announcements, and notices to the public platform.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Published', value: notices.length, icon: Bell, accent: 'text-muted-foreground' },
            { label: 'Active Now',      value: visible.length, icon: Globe, accent: 'text-muted-foreground' },
            { label: 'Alerts',          value: visible.filter((n) => n.type === 'ALERT').length, icon: AlertTriangle, accent: 'text-muted-foreground' },
            { label: 'Referrals',       value: referralCount, icon: Gift, accent: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, accent }) => (
            <Card key={label} className="p-4 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${accent}`} />
              </div>
              <h3 className="text-2xl font-extrabold text-foreground">{value}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* Publish form (inline panel) */}
        {showForm && (
          <Card className="p-5 sm:p-6 rounded-2xl border-white/5 bg-card/80 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">New Publication</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handlePublish} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as NoticeType)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="NOTICE">Notice</option>
                    <option value="ALERT">Alert</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Expires (optional)</label>
                  <Input
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="h-10 bg-background border-input text-sm text-foreground rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enter title..."
                  className="h-10 bg-background border-input text-sm text-foreground rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Content</label>
                <Textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Enter content..."
                  rows={4}
                  className="bg-background border-input text-sm text-foreground rounded-xl resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl h-9 px-4 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl h-9 px-4 text-sm font-semibold gap-1.5"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Publications list */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Active Publications ({visible.length})
          </h2>

          {loadingNotices ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <Card className="p-8 rounded-2xl border-white/5 bg-card/40 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground opacity-30 mb-2" />
              <p className="text-sm text-muted-foreground">No active publications yet.</p>
              <Button
                onClick={() => setShowForm(true)}
                className="mt-4 rounded-xl h-9 px-4 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Create First Publication
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {visible.map((n) => {
                const cfg = TYPE_CONFIG[n.type];
                const Icon = cfg.icon;
                return (
                  <Card
                    key={n.id}
                    className={`p-4 sm:p-5 rounded-2xl border ${cfg.border} ${cfg.bg} backdrop-blur-xl`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cfg.bg} border ${cfg.border}`}>
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{n.publishedAt}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-foreground mt-0.5 truncate">{n.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
