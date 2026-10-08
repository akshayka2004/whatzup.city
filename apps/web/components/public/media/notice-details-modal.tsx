'use client';

import { useEffect, useRef } from 'react';
import { Bell, Download, FileText, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fmtDateIST } from './format';
import { SocialButtons } from './notice-card';
import { typeColors, type Notice } from './notice-model';

/** Full notice with publisher, links and downloadable attachments. Bottom sheet on phones. Esc / backdrop / X close it. */
export function NoticeDetailsModal({
  notice,
  onClose,
  onDownload,
}: {
  notice: Notice;
  onClose: () => void;
  onDownload: (att: { name: string; url?: string }) => void;
}) {
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={notice.title}
        className="ui-fade-up relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ui-press absolute right-2 top-2 z-10 flex h-11 w-11 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-6 sm:p-6">
          <div className="mb-4 flex items-center gap-3 pr-10">
            <div className="shrink-0 rounded-xl bg-primary/10 p-3 text-primary">
              <Bell className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-xl font-bold text-foreground">{notice.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    typeColors[notice.type] || typeColors.Announcement,
                  )}
                >
                  {notice.type}
                </span>
                <span className="text-xs text-muted-foreground">{fmtDateIST(notice.date) || notice.date}</span>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-border bg-secondary p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{notice.description}</p>
          </div>

          {(notice.publisher || notice.socialLinks.length > 0) && (
            <div className="mb-6">
              {notice.publisher && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Published by <span className="font-semibold text-foreground">{notice.publisher.organizationName}</span>
                </p>
              )}
              <SocialButtons links={notice.socialLinks} />
            </div>
          )}

          {notice.attachments.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Attached Documents & Media</h4>
              <div className="space-y-2">
                {notice.attachments.map((a, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {a.type === 'image' ? (
                        <ImageIcon className="h-5 w-5 shrink-0 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 shrink-0 text-primary" />
                      )}
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.size}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownload(a)}
                      className="ui-press h-11 shrink-0 cursor-pointer gap-1 sm:h-9"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose} className="h-11 cursor-pointer sm:h-9">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
