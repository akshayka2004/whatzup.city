'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Construction,
  Download,
  ExternalLink,
  Eye,
  FileText,
  HeartPulse,
  Image as ImageIcon,
  Megaphone,
  Scale,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StatusPill } from '@/components/common/status-pill';
import { cn } from '@/lib/utils';
import { fmtDateIST, withProtocol } from './format';
import { SEVERITY_STYLE, isNewNotice, severityFor, typeColors, type Notice, type SocialLink } from './notice-model';

export function SocialButtons({ links }: { links: SocialLink[] }) {
  if (!links.length) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {links.map((l, i) => (
        <a
          key={i}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ui-press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-primary/20 bg-brand-soft px-3 text-xs font-medium text-brand-soft-foreground transition-colors hover:bg-primary/20 sm:min-h-9"
        >
          <ExternalLink className="h-3 w-3" />
          {l.label}
        </a>
      ))}
    </div>
  );
}

function iconFor(type: string): ComponentType<{ className?: string }> {
  const t = type.toLowerCase();
  if (/health/.test(t)) return HeartPulse;
  if (/infra|road|water|power|electric|construction/.test(t)) return Construction;
  if (/legal|policy|rule|regulation|circular|tender/.test(t)) return Scale;
  if (/event|festival|celebrat/.test(t)) return CalendarDays;
  if (severityFor(type) === 'danger') return AlertCircle;
  return Megaphone;
}

const LONG_BODY = 220;

export function NoticeCard({
  notice,
  now,
  onView,
  onDownload,
}: {
  notice: Notice;
  now: number | null;
  onView: (n: Notice) => void;
  onDownload: (att: { name: string; url?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_STYLE[severityFor(notice.type)];
  const Icon = iconFor(notice.type);
  const isNew = isNewNotice(notice, now);
  const long = notice.description.length > LONG_BODY || notice.description.split('\n').length > 4;
  const bodyCls = 'whitespace-pre-wrap break-words text-sm text-muted-foreground';

  return (
    <article className="ui-reveal ui-cv-auto relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors duration-200 hover:border-primary/25">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', sev.rail)} />
      <div className="p-4 pl-5 sm:p-6 sm:pl-7">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={cn('shrink-0 rounded-xl border p-2.5 sm:p-3', sev.tile)}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
                  typeColors[notice.type] || typeColors.Announcement,
                )}
              >
                {notice.type}
              </span>
              {isNew && <StatusPill tone="primary" label="New" dot={false} />}
            </div>

            <h3 className="break-words text-base font-semibold text-foreground sm:text-lg">{notice.title}</h3>

            {notice.description &&
              (long ? (
                <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
                  {!open && <p className={cn(bodyCls, 'line-clamp-3')}>{notice.description}</p>}
                  <CollapsibleContent>
                    <p className={bodyCls}>{notice.description}</p>
                  </CollapsibleContent>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-0.5 text-xs font-medium text-primary hover:underline sm:min-h-8"
                    >
                      {open ? (
                        <>
                          Show less <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Read more <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>
                </Collapsible>
              ) : (
                <p className={cn(bodyCls, 'mt-2')}>{notice.description}</p>
              ))}

            {notice.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {notice.attachments.map((a, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onDownload(a)}
                    className="ui-press inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-lg border border-border bg-secondary px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:min-h-9"
                  >
                    {a.type === 'image' ? (
                      <ImageIcon className="h-3 w-3 text-primary" />
                    ) : (
                      <FileText className="h-3 w-3 text-primary" />
                    )}
                    <span className="break-all text-left">{a.name}</span>
                    <Download className="ml-1 h-2.5 w-2.5 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {notice.publisher && (
              <p className="mt-3 text-xs text-muted-foreground">
                Published by <span className="font-semibold text-foreground">{notice.publisher.organizationName}</span>
              </p>
            )}
            <SocialButtons links={notice.socialLinks} />

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Issued {fmtDateIST(notice.date) || notice.date}
              </span>
              {(notice.startAt || notice.expiresAt) && (
                <span className="flex items-center gap-1 text-primary">
                  {notice.startAt ? fmtDateIST(notice.startAt) : '—'} → {notice.expiresAt ? fmtDateIST(notice.expiresAt) : 'Open'}
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => onView(notice)}
                variant="outline"
                size="sm"
                className="ui-press h-11 cursor-pointer gap-1 sm:h-9"
              >
                <Eye className="h-3.5 w-3.5" /> View details
              </Button>
              {notice.linkUrl && (
                <a
                  href={withProtocol(notice.linkUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-primary/20 bg-brand-soft px-3 text-xs font-medium text-brand-soft-foreground transition-colors hover:bg-primary/20 sm:min-h-9"
                >
                  <ExternalLink className="h-3 w-3" /> Open Link
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
