import type { ElementType } from 'react';
import {
  Sparkles, ArrowRightLeft, Pencil, Hash, Store, Trash2, CheckCircle2,
  XCircle, Ban, RotateCcw, Receipt, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EventMeta {
  label: string;
  icon: ElementType;
  color: string;
  bg: string;
  border: string;
}

const tone = {
  success: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  info: { color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
  warning: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  danger: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  muted: { color: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border' },
};

export const EVENT_META: Record<string, EventMeta> = {
  BRAND_CREATED: { label: 'Brand created', icon: Sparkles, ...tone.success },
  BRAND_CONVERTED: { label: 'Converted to brand', icon: ArrowRightLeft, ...tone.info },
  BRAND_UPDATED: { label: 'Brand updated', icon: Pencil, ...tone.muted },
  BILL_SERIES_CHANGED: { label: 'Bill series changed', icon: Hash, ...tone.warning },
  OUTLET_ADDED: { label: 'Outlet added', icon: Store, ...tone.success },
  OUTLET_UPDATED: { label: 'Outlet updated', icon: Pencil, ...tone.info },
  OUTLET_REMOVED: { label: 'Outlet removed', icon: Trash2, ...tone.danger },
  OUTLET_APPROVED: { label: 'Outlet approved', icon: CheckCircle2, ...tone.success },
  OUTLET_REJECTED: { label: 'Outlet rejected', icon: XCircle, ...tone.danger },
  BRAND_SUSPENDED: { label: 'Brand suspended', icon: Ban, ...tone.danger },
  BRAND_REACTIVATED: { label: 'Brand reactivated', icon: RotateCcw, ...tone.success },
  BILL_REASSIGNED: { label: 'Bill reassigned', icon: Receipt, ...tone.info },
};

export const EVENT_TYPES = Object.keys(EVENT_META);

export function eventMeta(type: string): EventMeta {
  return EVENT_META[type] ?? {
    label: type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
    icon: Activity,
    ...tone.muted,
  };
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fullDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleString('en-IN') : '';
}

export function BrandStatusPill({ status, className }: { status?: string; className?: string }) {
  const suspended = status === 'SUSPENDED';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold',
        suspended
          ? 'border-destructive/20 bg-destructive/10 text-destructive'
          : 'border-success/20 bg-success/10 text-success',
        className,
      )}
    >
      {suspended ? 'SUSPENDED' : 'ACTIVE'}
    </span>
  );
}

export function seriesLabel(mode?: string, prefix?: string | null): string {
  if (mode === 'PER_OUTLET') return 'Per outlet';
  return prefix ? `Shared · ${prefix}` : 'Shared';
}

// Tolerates `{ data, meta }` bodies with or without an extra `{ data: ... }` wrapper.
export function parseList<T = any>(res: any): { rows: T[]; meta: any } {
  const body = res?.data;
  if (!body || res?.error) return { rows: [], meta: null };
  const inner = !Array.isArray(body.data) && Array.isArray(body.data?.data) ? body.data : body;
  const rows = Array.isArray(inner.data) ? inner.data : Array.isArray(inner) ? inner : [];
  return { rows, meta: inner.meta ?? body.meta ?? null };
}
