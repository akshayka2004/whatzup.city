'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye, Trash2, X, ShieldAlert, Check, Flag, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ISSUE_REPORTS_KEY = 'issue_reports';

const SEED_REPORTS = [
  {
    id: 'RPT-SEED-1',
    type: 'Inappropriate Content',
    reported: 'Business A',
    date: '16 May 2026',
    status: 'Pending',
    details:
      'The business listing description contains misleading information regarding their licensing status.',
    source: 'admin',
  },
  {
    id: 'RPT-SEED-2',
    type: 'Fraudulent Activity',
    reported: 'User B',
    date: '15 May 2026',
    status: 'Under Review',
    details:
      'User has posted 15 identical negative reviews on different local businesses in the span of 10 minutes.',
    source: 'admin',
  },
  {
    id: 'RPT-SEED-3',
    type: 'Policy Violation',
    reported: 'Business C',
    date: '14 May 2026',
    status: 'Resolved',
    details:
      'Pricing posted on the offers listing page does not match the storefront physical store pricing.',
    source: 'admin',
  },
  {
    id: 'RPT-SEED-4',
    type: 'Spam',
    reported: 'Review D',
    date: '13 May 2026',
    status: 'Pending',
    details: 'Review text contains links pointing to external malicious betting websites.',
    source: 'admin',
  },
];

type ReportStatus = 'Pending' | 'Under Review' | 'Resolved' | 'Dismissed';

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'Under Review': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Resolved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  Dismissed: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  fake_business: 'Fake Business',
  fraudulent_offer: 'Fraudulent Offer',
  fake_review: 'Fake Review',
  inappropriate_content: 'Inappropriate Content',
  wrong_info: 'Wrong Information',
  other: 'Other Issue',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>(SEED_REPORTS);
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [deletingReport, setDeletingReport] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReportStatus | 'all'>('all');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ISSUE_REPORTS_KEY);
      if (stored) {
        const customerReports = JSON.parse(stored).map((r: any) => ({
          id: r.id,
          type: TYPE_LABELS[r.type] ?? r.type,
          reported: r.businessName || 'Unknown',
          date: r.submittedAt,
          status: r.status === 'submitted' ? 'Pending' : r.status === 'under_review' ? 'Under Review' : 'Resolved',
          details: r.description,
          source: 'customer',
        }));
        setReports([...SEED_REPORTS, ...customerReports]);
      }
    } catch (_) {}
  }, []);

  const filtered = reports.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search &&
      !r.type.toLowerCase().includes(search.toLowerCase()) &&
      !r.reported.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pending = reports.filter((r) => r.status === 'Pending').length;

  const handleUpdateStatus = (id: any, newStatus: string) => {
    setReports(reports.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    if (viewingReport && viewingReport.id === id) {
      setViewingReport({ ...viewingReport, status: newStatus });
    }
  };

  const handleDeleteReport = () => {
    setReports(reports.filter((r) => r.id !== deletingReport.id));
    setDeletingReport(null);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Infraction Reports</h1>
          <p className="text-muted-foreground">
            Manage user flag requests, spam reviews, and listing policy violations.
          </p>
        </div>

        {/* Search + filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-52 rounded-xl border-white/10 bg-white/5 text-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="h-9 rounded-xl border border-white/10 bg-card text-sm text-foreground px-2 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
          {pending > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
              <AlertTriangle className="h-3.5 w-3.5" />
              {pending} pending review
            </span>
          )}
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-white/10 bg-white/5">
              <Check className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-1">Queue Clear</h3>
              <p className="text-sm text-muted-foreground">All content reports resolved.</p>
            </Card>
          ) : (
            filtered.map((report) => (
              <Card
                key={report.id}
                className="p-6 rounded-2xl border-white/5 bg-card/40 backdrop-blur-xl hover:shadow-md transition-all duration-300 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="rounded-xl bg-rose-500/10 p-3 text-rose-400">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{report.type}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Reported Target:{' '}
                        <span className="text-slate-300 font-semibold">{report.reported}</span> •
                        Received {report.date}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold sm:ml-auto ${statusColors[report.status]}`}
                    >
                      {report.status}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => setViewingReport(report)}
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 h-9 w-9"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setDeletingReport(report)}
                      size="icon"
                      variant="outline"
                      className="rounded-xl border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* ── INVESTIGATE/VIEW REPORT MODAL ────────────────────────── */}
        {viewingReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative">
              <button
                onClick={() => setViewingReport(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Investigate Report</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Type: {viewingReport.type}</p>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400 font-semibold mb-1">
                    Target Entity Under Report
                  </p>
                  <p className="text-sm font-bold text-foreground">{viewingReport.reported}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400 font-semibold mb-1">
                    Report Description & Evidence
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{viewingReport.details}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-slate-400 font-semibold mb-2">Resolution Status</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(viewingReport.id, 'Pending')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        viewingReport.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(viewingReport.id, 'Under Review')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        viewingReport.status === 'Under Review'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      Under Review
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(viewingReport.id, 'Resolved')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        viewingReport.status === 'Resolved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      Resolved
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(viewingReport.id, 'Dismissed')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        viewingReport.status === 'Dismissed'
                          ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      Dismissed
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setViewingReport(null)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ── DISMISS REPORT MODAL ─────────────────────────────────── */}
        {deletingReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative text-center">
              <button
                onClick={() => setDeletingReport(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Dismiss / Delete Report</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete this {deletingReport.type} report? This removes it
                from the moderation queue.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => setDeletingReport(null)}
                  variant="outline"
                  className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 px-4"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteReport}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4"
                >
                  Delete Report
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
