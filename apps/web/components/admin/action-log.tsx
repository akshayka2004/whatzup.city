'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Download, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

interface LogEntry {
  id: string;
  action: string;
  resourceId?: string | null;
  createdAt: string;
  user?: { name?: string; email?: string; role?: string } | null;
}

/**
 * Per-section action log — filters /v1/audit-logs by `resource` (already
 * supported server-side) and offers a CSV export of what's currently loaded.
 * Collapsed by default so it doesn't compete with the main CRUD UI above it.
 */
export function ActionLog({ resource, title = 'Action Log' }: { resource: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const load = useCallback((p: number, append: boolean) => {
    setLoading(true);
    apiService.get<any>(`/v1/audit-logs?resource=${resource}&page=${p}`).then((res) => {
      const list = res.data?.data ?? [];
      setLogs((cur) => (append ? [...cur, ...list] : list));
      setHasNext(!!res.data?.meta?.hasNext);
      setPage(p);
      setLoaded(true);
    }).finally(() => setLoading(false));
  }, [resource]);

  useEffect(() => {
    if (open && !loaded) load(1, false);
  }, [open, loaded, load]);

  const fmt = (d: string) => new Date(d).toLocaleString('en-IN');

  const exportCsv = () => {
    const csv = [
      'Timestamp,User,Role,Action,Resource ID',
      ...logs.map((l) =>
        `"${fmt(l.createdAt)}","${l.user?.name || l.user?.email || 'System'}","${l.user?.role || ''}","${l.action}","${l.resourceId || ''}"`,
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resource.toLowerCase()}_action_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="rounded-2xl border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-4 flex items-center justify-between gap-2 cursor-pointer hover:bg-secondary/20 transition-colors"
      >
        <span className="flex items-center gap-2 font-bold text-foreground">
          <History className="h-4 w-4 text-primary" /> {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="px-6 py-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{logs.length} entr{logs.length === 1 ? 'y' : 'ies'} loaded</p>
            <Button
              onClick={exportCsv}
              variant="outline"
              size="sm"
              disabled={logs.length === 0}
              className="h-8 rounded-lg border-border text-xs gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 pb-5">No actions logged for this section yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <th className="px-6 py-2.5 text-left text-xs font-semibold text-muted-foreground">Timestamp</th>
                      <th className="px-6 py-2.5 text-left text-xs font-semibold text-muted-foreground">User</th>
                      <th className="px-6 py-2.5 text-left text-xs font-semibold text-muted-foreground">Action</th>
                      <th className="px-6 py-2.5 text-left text-xs font-semibold text-muted-foreground">Resource ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-b border-border last:border-0">
                        <td className="px-6 py-2.5 text-muted-foreground text-xs font-mono whitespace-nowrap">{fmt(l.createdAt)}</td>
                        <td className="px-6 py-2.5 text-foreground text-xs">{l.user?.name || l.user?.email || 'System'}</td>
                        <td className="px-6 py-2.5">
                          <span className="px-2 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono font-bold text-foreground whitespace-nowrap">
                            {l.action}
                          </span>
                        </td>
                        <td className="px-6 py-2.5 text-muted-foreground text-[11px] font-mono truncate max-w-[160px]">{l.resourceId || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasNext && (
                <div className="px-6 py-3">
                  <Button
                    onClick={() => load(page + 1, true)}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg border-border text-xs gap-1.5 cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
