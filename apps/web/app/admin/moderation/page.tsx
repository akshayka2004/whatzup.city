'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Shield, CheckCircle, XCircle, X, Check, ShieldAlert } from 'lucide-react';

const initialViolators = [
  { id: 1, name: 'User A', reason: 'Inappropriate Content', severity: 'High', date: '2024-05-16' },
  { id: 2, name: 'User B', reason: 'Spam', severity: 'Medium', date: '2024-05-15' },
  { id: 3, name: 'User C', reason: 'Policy Violation', severity: 'High', date: '2024-05-14' },
];

const severityColors: Record<string, string> = {
  High: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Low: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
};

export default function ModerationPage() {
  const [violators, setViolators] = useState(initialViolators);
  const [pardoningUser, setPardoningUser] = useState<any>(null);
  const [banningUser, setBanningUser] = useState<any>(null);

  const handlePardon = () => {
    setViolators(violators.filter((v) => v.id !== pardoningUser.id));
    setPardoningUser(null);
  };

  const handleBan = () => {
    setViolators(violators.filter((v) => v.id !== banningUser.id));
    setBanningUser(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">User Moderation</h1>
          <p className="text-muted-foreground">
            Manage user conduct, view flag counts, and restrict access for violations.
          </p>
        </div>

        <div className="space-y-4">
          {violators.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-white/10 bg-white/5">
              <Check className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">Queue Clear</h3>
              <p className="text-sm text-muted-foreground">All flagged user accounts moderated.</p>
            </Card>
          ) : (
            violators.map((violator) => (
              <Card
                key={violator.id}
                className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:shadow-md transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="rounded-xl bg-white/5 p-3 text-slate-300 border border-white/5">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{violator.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reason: {violator.reason}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Flagged: {violator.date}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold sm:ml-auto ${severityColors[violator.severity]}`}
                    >
                      {violator.severity} Severity
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => setPardoningUser(violator)}
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 h-9 w-9"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setBanningUser(violator)}
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 h-9 w-9"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* ── PARDON USER MODAL ────────────────────────────────────── */}
        {pardoningUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button
                onClick={() => setPardoningUser(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Pardon Flagged User</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to dismiss all flags on{' '}
                <span className="font-semibold text-foreground">"{pardoningUser.name}"</span>? The
                warnings will be cleared.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setPardoningUser(null)}
                  variant="outline"
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePardon}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4"
                >
                  Dismiss Flags
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── BAN USER MODAL ───────────────────────────────────────── */}
        {banningUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button
                onClick={() => setBanningUser(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Ban User Account</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to permanently suspend{' '}
                <span className="font-semibold text-foreground">"{banningUser.name}"</span>? This
                restricts their login privileges.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setBanningUser(null)}
                  variant="outline"
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBan}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4"
                >
                  Ban User
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
