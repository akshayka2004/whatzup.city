'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Bell } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { apiService } from '@/lib/services/api-service';
import { KERALA_CITIES, getViewerCity, setViewerCity } from '@/lib/constants';
import { NoticeCard } from '@/components/public/media/notice-card';
import { NoticeListSkeleton } from '@/components/public/media/media-skeletons';
import { noticesFromBody, type Notice } from '@/components/public/media/notice-model';
import { useNow } from '@/components/public/media/use-now';

// Only needed once "View details" is tapped, so keep it out of the first bundle.
const NoticeDetailsModal = dynamic(
  () => import('@/components/public/media/notice-details-modal').then((m) => m.NoticeDetailsModal),
  { ssr: false },
);

export function GovernmentClient({ initialNotices = null }: { initialNotices?: unknown | null }) {
  // The server renders the default (all cities) list; it stays valid until the viewer picks a city.
  const seeded = useRef(initialNotices != null);
  const [notices, setNotices] = useState<Notice[]>(() =>
    initialNotices != null ? noticesFromBody(initialNotices) : [],
  );
  const [loading, setLoading] = useState(initialNotices == null);
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);
  const [city, setCity] = useState('');
  const now = useNow();

  useEffect(() => {
    const stored = getViewerCity();
    if (stored) {
      setLoading(true); // the seeded list is for all cities — don't flash it for a viewer with a saved city
      setCity(stored);
    }
  }, []);

  useEffect(() => {
    if (seeded.current && !city) return;
    seeded.current = false;
    let cancelled = false;
    setLoading(true);
    apiService
      .get<any>(`/v1/announcements${city ? `?city=${encodeURIComponent(city)}` : ''}`)
      .then((res) => {
        if (cancelled) return;
        setNotices(res.data && !res.error ? noticesFromBody(res.data) : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);

  const handleCityChange = (v: string) => {
    const next = v === 'all' ? '' : v;
    setCity(next);
    setViewerCity(next);
  };

  const downloadFile = (att: { name: string; url?: string }) => {
    if (att.url) {
      window.open(att.url, '_blank');
      return;
    }
    const blob = new Blob([`Document: ${att.name}\nNo source URL configured.`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PublicLayout>
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Government Announcements
        </h1>
        <p className="mb-5 text-muted-foreground">
          Stay informed with official notices and civic updates.
        </p>

        <div className="mb-6">
          <Select value={city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger className="w-full rounded-xl data-[size=default]:h-11 sm:w-52">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {KERALA_CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <NoticeListSkeleton />
        ) : notices.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No announcements"
            description="Check back later for official updates."
            action={
              city
                ? { label: 'Show all cities', onClick: () => handleCityChange('all') }
                : undefined
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {notices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                now={now}
                onView={setViewingNotice}
                onDownload={downloadFile}
              />
            ))}
          </div>
        )}

        {viewingNotice && (
          <NoticeDetailsModal
            notice={viewingNotice}
            onClose={() => setViewingNotice(null)}
            onDownload={downloadFile}
          />
        )}
      </div>
    </PublicLayout>
  );
}
