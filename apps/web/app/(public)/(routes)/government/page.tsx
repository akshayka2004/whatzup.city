'use client';

import { useState } from 'react';
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
} from 'lucide-react';

const notices = [
  {
    id: 1,
    title: 'New Tax Regulations Announced',
    description:
      'Important changes to business tax policies effective July 2026. All registered businesses must comply with updated GST filing requirements.',
    date: '2024-05-16',
    type: 'Announcement',
    attachments: [
      { name: 'Tax_Guidelines_2026.pdf', type: 'pdf', size: '2.4 MB' },
      { name: 'Compliance_Checklist.pdf', type: 'pdf', size: '1.1 MB' },
    ],
  },
  {
    id: 2,
    title: 'Public Health Advisory',
    description:
      'Health and safety guidelines update for food establishments and healthcare facilities in the metropolitan area.',
    date: '2024-05-15',
    type: 'Health',
    attachments: [
      { name: 'Health_Advisory_Notice.pdf', type: 'pdf', size: '890 KB' },
      { name: 'Safety_Poster.jpg', type: 'image', size: '3.2 MB' },
    ],
  },
  {
    id: 3,
    title: 'Infrastructure Maintenance',
    description:
      'Road construction and temporary closures on Main Street from May 20-30. Alternate routes recommended for daily commuters.',
    date: '2024-05-14',
    type: 'Infrastructure',
    attachments: [{ name: 'Route_Map.png', type: 'image', size: '1.5 MB' }],
  },
  {
    id: 4,
    title: 'License Renewal Deadline',
    description:
      'Business license renewal period closing on June 15, 2026. Late penalties apply after deadline.',
    date: '2024-05-13',
    type: 'Legal',
    attachments: [{ name: 'Renewal_Form.pdf', type: 'pdf', size: '450 KB' }],
  },
  {
    id: 5,
    title: 'Community Event Alert',
    description:
      'Major community festival happening downtown this weekend. Road closures and parking restrictions apply.',
    date: '2024-05-12',
    type: 'Event',
    attachments: [],
  },
];

const typeColors: Record<string, string> = {
  Announcement: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Health: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  Infrastructure: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  Legal: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  Event: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export default function GovernmentPage() {
  const [viewingNotice, setViewingNotice] = useState<any>(null);

  const downloadFile = (filename: string) => {
    const content = `Official Government Notice Document: ${filename}\nDate: ${new Date().toLocaleDateString()}\nThis is a simulated document download for verification purposes.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${typeColors[notice.type] || typeColors.Announcement}`}
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
                          onClick={() => downloadFile(a.name)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-foreground rounded-lg text-xs border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                          title={`Click to download ${a.name}`}
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
                  <div className="flex items-center gap-4">
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

        {/* ── VIEW ANNOUNCEMENT MODAL ───────────────────── */}
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
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[viewingNotice.type]}`}
                    >
                      {viewingNotice.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{viewingNotice.date}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {viewingNotice.description}
                </p>
              </div>

              {viewingNotice.attachments.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    Attached Documents & Media
                  </h4>
                  <div className="space-y-2">
                    {viewingNotice.attachments.map((a: any, idx: number) => (
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
                          onClick={() => downloadFile(a.name)}
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
