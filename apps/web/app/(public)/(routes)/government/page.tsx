'use client';

import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layouts/public-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Calendar,
  AlertCircle,
  Eye,
  Download,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { apiService } from '@/lib/services/api-service';

interface SocialLink { label: string; url: string; }
interface Publisher { organizationName: string; organizationType?: string; logoUrl?: string | null; }
interface Notice {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  attachments: { name: string; type: 'pdf' | 'image'; size: string; url?: string }[];
  socialLinks: SocialLink[];
  publisher: Publisher | null;
}

const typeColors: Record<string, string> = {
  Announcement: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Health: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  Infrastructure: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Legal: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  Event: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

function mapApiNotice(n: any): Notice {
  const atts = Array.isArray(n.attachments) ? n.attachments : [];
  return {
    id: n.id,
    title: n.title || 'Untitled',
    description: n.body || n.description || '',
    date: (n.publishedAt || n.createdAt || '').slice(0, 10),
    type: n.category || n.type || 'Announcement',
    attachments: atts.map((a: any) => ({
      name: a.name || a.filename || 'document',
      type: (a.mimeType || '').includes('image') ? 'image' : 'pdf',
      size: a.fileSize ? `${(a.fileSize / 1024).toFixed(0)} KB` : '—',
      url: a.url || a.fileUrl,
    })),
    socialLinks: Array.isArray(n.socialLinks)
      ? n.socialLinks.filter((l: any) => l && l.label && l.url)
      : [],
    publisher: n.publisher || null,
  };
}

function SocialButtons({ links }: { links: SocialLink[] }) {
  if (!links.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap mt-3">
      {links.map((l, i) => (
        <a
          key={i}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-medium transition-colors cursor-pointer"
        >
          <ExternalLink className="h-3 w-3" />
          {l.label}
        </a>
      ))}
    </div>
  );
}

export default function GovernmentPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setLoading(true);
    apiService
      .get<any>('/v1/announcements')
      .then((res) => {
        if (res.data && !res.error) {
          const list = Array.isArray(res.data) ? res.data : res.data?.data ?? res.data?.items ?? [];
          setNotices(list.map(mapApiNotice));
        } else {
          setNotices([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const downloadFile = (att: { name: string; url?: string }) => {
    if (att.url) {
      window.open(att.url, '_blank');
      return;
    }
    const blob = new Blob([`Document: ${att.name}\nNo source URL configured.`], { type: 'text/plain' });
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
        <h1 className="text-3xl font-bold mb-2">Government Announcements</h1>
        <p className="text-muted-foreground mb-8">
          Stay informed with official notices and announcements
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : notices.length === 0 ? (
          <Card className="p-12 rounded-2xl text-center border-dashed border-white/10 bg-white/5">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-foreground mb-1">No Announcements</h3>
            <p className="text-sm text-muted-foreground">Check back later for official updates.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <Card
                key={notice.id}
                className="p-6 rounded-2xl hover:shadow-md transition-all border-white/5 bg-card/40 backdrop-blur-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                    <AlertCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground text-lg">{notice.title}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                          typeColors[notice.type] || typeColors.Announcement
                        }`}
                      >
                        {notice.type}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{notice.description}</p>
                    {notice.attachments.length > 0 && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {notice.attachments.map((a, idx) => (
                          <button
                            key={idx}
                            onClick={() => downloadFile(a)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-foreground rounded-lg text-xs border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                          >
                            {a.type === 'image' ? (
                              <ImageIcon className="h-3 w-3 text-cyan-400" />
                            ) : (
                              <FileText className="h-3 w-3 text-violet-400" />
                            )}
                            <span>{a.name}</span>
                            <Download className="h-2.5 w-2.5 ml-1 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                    {notice.publisher && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Published by <span className="font-semibold text-foreground">{notice.publisher.organizationName}</span>
                      </p>
                    )}
                    <SocialButtons links={notice.socialLinks} />
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" /> {notice.date}
                      </div>
                      <Button
                        onClick={() => setViewingNotice(notice)}
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {viewingNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg p-6 rounded-2xl border-white/10 bg-zinc-900 shadow-2xl relative max-h-[85vh] overflow-y-auto">
              <button
                onClick={() => setViewingNotice(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{viewingNotice.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        typeColors[viewingNotice.type] || typeColors.Announcement
                      }`}
                    >
                      {viewingNotice.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{viewingNotice.date}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                <p className="text-sm text-slate-300 leading-relaxed">{viewingNotice.description}</p>
              </div>

              {(viewingNotice.publisher || viewingNotice.socialLinks.length > 0) && (
                <div className="mb-6">
                  {viewingNotice.publisher && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Published by{' '}
                      <span className="font-semibold text-foreground">
                        {viewingNotice.publisher.organizationName}
                      </span>
                    </p>
                  )}
                  <SocialButtons links={viewingNotice.socialLinks} />
                </div>
              )}

              {viewingNotice.attachments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    Attached Documents & Media
                  </h4>
                  <div className="space-y-2">
                    {viewingNotice.attachments.map((a, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {a.type === 'image' ? (
                            <ImageIcon className="h-5 w-5 text-cyan-400" />
                          ) : (
                            <FileText className="h-5 w-5 text-violet-400" />
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">{a.name}</p>
                            <p className="text-[10px] text-muted-foreground">{a.size}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadFile(a)}
                          className="rounded-lg border-white/10 text-slate-300 hover:bg-white/5 gap-1 h-8 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setViewingNotice(null)}
                  className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
