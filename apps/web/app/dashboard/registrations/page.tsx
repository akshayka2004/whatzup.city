'use client';

import { useState, useEffect, useCallback } from 'react';
import { BusinessLayout } from '@/components/layouts/business-layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Users, Building2, UserCheck,
  Search, ChevronLeft, ChevronRight,
  Mail, Phone, Globe, Calendar, Tag, RefreshCw,
  FileText,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';
import { cn } from '@/lib/utils';

type TabId = 'businesses' | 'individuals';

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'businesses', label: 'Business Interests', icon: Building2 },
  { id: 'individuals', label: 'Individual Interests', icon: UserCheck },
];

function InitialsAvatar({ name, type }: { name: string; type: 'business' | 'individual' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        'h-9 w-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
        type === 'business'
          ? 'bg-info/20 text-info'
          : 'bg-primary/20 text-primary',
      )}
    >
      {initials}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className={cn('text-sm text-foreground break-all', mono && 'font-mono')}>{value}</p>
      </div>
    </div>
  );
}

export default function DashboardRegistrationsPage() {
  const [tab, setTab] = useState<TabId>('businesses');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ businesses: 0, individuals: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setExpanded(null);
  }, [tab, debouncedSearch]);

  // Fetch stats once
  useEffect(() => {
    apiService.get<any>('/v1/launch-interests/stats').then((res) => {
      if (res.data && !res.error) setStats(res.data);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (debouncedSearch) params.set('search', debouncedSearch);
    const endpoint = tab === 'businesses' ? 'businesses' : 'individuals';
    const res = await apiService.get<any>(`/v1/launch-interests/${endpoint}?${params}`);
    if (res.data && !res.error) {
      setData(res.data.data || []);
      setMeta(res.data.meta || { total: 0, totalPages: 1 });
    }
    setLoading(false);
  }, [tab, debouncedSearch, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Registrations</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Interest submissions from the platform launch page.
            </p>
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="rounded-xl border-border text-muted-foreground hover:text-foreground gap-2"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Submissions', value: stats.total, icon: Users, color: 'text-primary' },
            { label: 'Business Interests', value: stats.businesses, icon: Building2, color: 'text-info' },
            { label: 'Individual Interests', value: stats.individuals, icon: UserCheck, color: 'text-primary' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-4 rounded-2xl border-border bg-card/60">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-secondary border border-border">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                    tab === t.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === 'businesses'
                  ? 'Search business, contact, email…'
                  : 'Search name, email, phone…'
              }
              className="pl-9 h-9 rounded-xl border-border bg-secondary text-sm"
            />
          </div>
        </div>

        {/* List */}
        <Card className="rounded-2xl border-border bg-card/60 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm">No submissions found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tab === 'businesses'
                ? data.map((item) => (
                    <BusinessRow
                      key={item.id}
                      item={item}
                      expanded={expanded}
                      setExpanded={setExpanded}
                    />
                  ))
                : data.map((item) => (
                    <IndividualRow
                      key={item.id}
                      item={item}
                      expanded={expanded}
                      setExpanded={setExpanded}
                    />
                  ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {meta.page} of {meta.totalPages} · {meta.total} total
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrev}
                variant="outline"
                size="sm"
                className="rounded-xl border-border text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={!meta.hasNext}
                variant="outline"
                size="sm"
                className="rounded-xl border-border text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
}

function BusinessRow({
  item,
  expanded,
  setExpanded,
}: {
  item: any;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  const isOpen = expanded === item.id;
  return (
    <div>
      <button
        onClick={() => setExpanded(isOpen ? null : item.id)}
        className="w-full text-left px-5 py-4 hover:bg-foreground/[0.04] transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <InitialsAvatar name={item.businessName || '?'} type="business" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate">{item.businessName}</span>
              {item.category && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-info/15 text-info">
                  {item.category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span>{item.contactName}</span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {item.email}
              </span>
              {item.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {item.phone}
                </span>
              )}
            </div>
          </div>
          <div className="hidden sm:block shrink-0 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="bg-secondary border-t border-border px-5 py-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Business Info
              </p>
              <DetailRow icon={Building2} label="Business Name" value={item.businessName} />
              <DetailRow icon={Tag} label="Category" value={item.category || '—'} />
              {item.website && <DetailRow icon={Globe} label="Website" value={item.website} />}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Contact Details
              </p>
              <DetailRow icon={UserCheck} label="Contact Name" value={item.contactName} />
              <DetailRow icon={Mail} label="Email" value={item.email} />
              {item.phone && <DetailRow icon={Phone} label="Phone" value={item.phone} />}
              <DetailRow
                icon={Calendar}
                label="Submitted"
                value={new Date(item.createdAt).toLocaleString('en-IN')}
              />
            </div>
            {item.notes && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Notes
                </p>
                <div className="flex items-start gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IndividualRow({
  item,
  expanded,
  setExpanded,
}: {
  item: any;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) {
  const isOpen = expanded === item.id;
  return (
    <div>
      <button
        onClick={() => setExpanded(isOpen ? null : item.id)}
        className="w-full text-left px-5 py-4 hover:bg-foreground/[0.04] transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <InitialsAvatar name={item.name || '?'} type="individual" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {item.email}
              </span>
              {item.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {item.phone}
                </span>
              )}
              {item.interests && (
                <span className="truncate max-w-[200px] italic opacity-70">{item.interests}</span>
              )}
            </div>
          </div>
          <div className="hidden sm:block shrink-0 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="bg-secondary border-t border-border px-5 py-5">
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Personal Details
              </p>
              <DetailRow icon={UserCheck} label="Name" value={item.name} />
              <DetailRow icon={Mail} label="Email" value={item.email} />
              {item.phone && <DetailRow icon={Phone} label="Phone" value={item.phone} />}
              <DetailRow
                icon={Calendar}
                label="Submitted"
                value={new Date(item.createdAt).toLocaleString('en-IN')}
              />
            </div>
            {item.interests && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Interests
                </p>
                <div className="flex items-start gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground whitespace-pre-wrap">{item.interests}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
