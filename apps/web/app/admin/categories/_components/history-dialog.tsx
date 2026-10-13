'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/system/modal';
import { apiService } from '@/lib/services/api-service';
import type { AdminCategory } from './types';

interface Entry {
  id: string;
  action: string;
  createdAt: string;
  user?: { name?: string | null } | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, any> | null;
}

const LABEL: Record<string, string> = {
  CATEGORY_CREATED: 'Created',
  CATEGORY_UPDATED: 'Edited',
  CATEGORY_ARCHIVED: 'Archived',
  CATEGORY_MERGED: 'Merged',
  CATEGORY_DELETED: 'Deleted',
  CATEGORY_REORDERED: 'Reordered',
};

const show = (v: unknown) => (v === null || v === undefined || v === '' ? 'none' : String(v));

function summary(e: Entry): string {
  if (e.action === 'CATEGORY_MERGED' && e.metadata?.into) {
    return `Into ${e.metadata.into.name}; ${e.metadata.businessesMoved ?? 0} businesses moved.`;
  }
  const next = e.newData ?? {};
  const prev = e.oldData ?? {};
  const keys = Object.keys(next).filter((k) => k !== 'updatedBy');
  if (keys.length === 0) return '';
  return keys
    .map((k) =>
      k in prev ? `${k}: ${show(prev[k])} → ${show(next[k])}` : `${k}: ${show(next[k])}`,
    )
    .join(' · ');
}

export function HistoryDialog({
  category,
  onClose,
}: {
  category: AdminCategory;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    apiService
      .get<any>(`/v1/audit-logs?resource=CATEGORY&resourceId=${encodeURIComponent(category.id)}`)
      .then((res) => {
        if (!live) return;
        if (res.error) setError(res.error);
        else setRows((res.data?.data ?? res.data ?? []) as Entry[]);
      });
    return () => {
      live = false;
    };
  }, [category.id]);

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`History: ${category.name}`}
      description="Every change to this category, newest first."
    >
      <div className="pb-2">
        {!rows && !error && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </p>
        )}
        {error && <p className="text-sm text-danger-soft-foreground">{error}</p>}
        {rows && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No recorded changes yet.</p>
        )}
        <ul className="divide-y divide-border">
          {(rows ?? []).map((e) => (
            <li key={e.id} className="py-3">
              <p className="text-sm font-medium text-foreground">
                {LABEL[e.action] ?? e.action}
                <span className="font-normal text-muted-foreground">
                  {' '}
                  · {e.user?.name || 'System'} · {new Date(e.createdAt).toLocaleString()}
                </span>
              </p>
              {summary(e) && (
                <p className="mt-0.5 break-words text-xs text-muted-foreground">{summary(e)}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
