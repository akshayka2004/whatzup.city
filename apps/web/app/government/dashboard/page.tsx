'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Bell, Megaphone, ShieldAlert, Plus, Send, Trash2,
  X, CheckCircle2, Clock, Building2, LogOut, AlertTriangle,
  FileText, Eye, Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/services/api-service';

interface Notice {
  id: number | string;
  title: string;
  type: 'ALERT' | 'ANNOUNCEMENT' | 'NOTICE';
  body: string;
  publishedAt: string;
  status: string;
  expiresAt?: string; // ISO date — auto-expired when past
}

function isNoticeExpired(n: Notice): boolean {
  if (n.status === 'EXPIRED') return true;
  if (!n.expiresAt) return false;
  return new Date(n.expiresAt) < new Date();
}

type NoticeType = 'ALERT' | 'ANNOUNCEMENT' | 'NOTICE';

const TYPE_CONFIG: Record<NoticeType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  ALERT: { label: 'Alert', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: ShieldAlert },
  ANNOUNCEMENT: { label: 'Announcement', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Megaphone },
  NOTICE: { label: 'Notice', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: FileText },
};

export default function GovDashboardPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);

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

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_session');
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    router.push('/login');
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) return;
    const newNotice: Notice = {
      id: Date.now(),
      title: formTitle,
      type: formType,
      body: formBody,
      publishedAt: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'ACTIVE',
      expiresAt: formExpiresAt || undefined,
    };
    setNotices([newNotice, ...notices]);
    setFormTitle(''); setFormBody(''); setFormType('NOTICE'); setFormExpiresAt('');
    setShowForm(false);
    setSuccess('Notice published successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = (id: number) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
  };

  // Auto-filter expired
  const visibleNotices = notices.filter((n) => !isNoticeExpired(n));
  const activeCount = visibleNotices.length;
  const alertCount = visibleNotices.filter((n) => n.type === 'ALERT').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-white/5 bg-card/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Government Portal</p>
              <p className="text-[10px] text-muted-foreground">Official Civic Communications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowForm(true)}
              className="rounded-xl gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Notice
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="rounded-xl border-white/10 text-rose-400 hover:bg-rose-500/10 cursor-pointer gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Civic Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish alerts, announcements, and official notices to the public platform.
          </p>
        </div>

        {/* Success toast */}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Active Notices', value: activeCount, icon: Bell, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Active Alerts', value: alertCount, icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/10' },
            { label: 'Total Published', value: notices.length, icon: Megaphone, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="p-5 rounded-2xl border-white/5 bg-card/60 backdrop-blur-xl">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </Card>
            );
          })}
        </div>

        {/* Notice list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground">Published Notices</h2>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{activeCount} active</span>
            </div>
          </div>

          {loadingNotices ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visibleNotices.length === 0 ? (
            <Card className="p-10 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
              <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-foreground font-semibold mb-1">No notices published</p>
              <p className="text-sm text-muted-foreground">Use "New Notice" to publish an alert or announcement.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleNotices.map((notice) => {
                const t = notice.type as NoticeType;
                const cfg = TYPE_CONFIG[t];
                const Icon = cfg.icon;
                return (
                  <Card key={notice.id} className="p-5 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all">
                    <div className="flex items-start gap-4">
                      <div className={`h-9 w-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground">{notice.title}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {notice.status === 'EXPIRED' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-muted-foreground">
                              Expired
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{notice.body}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Published {notice.publishedAt}</span>
                          {notice.expiresAt && (
                            <span className="flex items-center gap-1 text-amber-400">
                              · Expires {notice.expiresAt}
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDelete(notice.id)}
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── New Notice Modal ─────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Publish New Notice
              </h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Notice Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_CONFIG) as NoticeType[]).map((t) => {
                    const cfg = TYPE_CONFIG[t];
                    const Icon = cfg.icon;
                    const selected = formType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormType(t)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 justify-center transition cursor-pointer ${
                          selected ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-white/10 text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Title</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Road closure on MG Road..."
                  className="rounded-xl border-white/10 bg-white/5 text-foreground"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Details</label>
                <Textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Provide full details of this notice..."
                  rows={4}
                  className="rounded-xl border-white/10 bg-white/5 text-foreground resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Expires On <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="rounded-xl border-white/10 bg-white/5 text-foreground text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="flex-1 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold cursor-pointer gap-2"
                >
                  <Send className="h-4 w-4" />
                  Publish
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
