export interface SocialLink {
  label: string;
  url: string;
}

export interface Publisher {
  organizationName: string;
  organizationType?: string;
  logoUrl?: string | null;
}

export interface Notice {
  id: string;
  title: string;
  description: string;
  /** YYYY-MM-DD, as the page has always shown it. */
  date: string;
  /** Full timestamp the notice was published / created, used for the "New" pill. */
  publishedAt?: string;
  startAt?: string;
  expiresAt?: string;
  linkUrl?: string;
  type: string;
  attachments: { name: string; type: 'pdf' | 'image'; size: string; url?: string }[];
  socialLinks: SocialLink[];
  publisher: Publisher | null;
}

export const typeColors: Record<string, string> = {
  Announcement: 'bg-info/10 text-info border border-info/20',
  Health: 'bg-destructive/10 text-destructive border border-destructive/20',
  Infrastructure: 'bg-warning/12 text-warning border border-warning/25',
  Legal: 'bg-secondary text-muted-foreground border border-border',
  Event: 'bg-success/12 text-success border border-success/25',
};

export function mapApiNotice(n: any): Notice {
  const atts = Array.isArray(n.attachments) ? n.attachments : [];
  return {
    id: n.id,
    title: n.title || 'Untitled',
    description: n.body || n.description || '',
    date: (n.publishedAt || n.createdAt || '').slice(0, 10),
    publishedAt: n.publishedAt || n.createdAt || undefined,
    startAt: n.startAt || undefined,
    expiresAt: n.expiresAt || undefined,
    linkUrl: n.linkUrl || undefined,
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

/** Same list-shape handling the page has always used for GET /v1/announcements. */
export function noticesFromBody(body: any): Notice[] {
  const list = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
  return Array.isArray(list) ? list.map(mapApiNotice) : [];
}

export type Severity = 'danger' | 'warning' | 'info' | 'success' | 'neutral';

/** Rough urgency of a notice, derived from its category label. Unknown categories read as plain information. */
export function severityFor(type: string): Severity {
  const t = (type || '').toLowerCase();
  if (/(health|emergency|alert|urgent|disaster|flood|danger|warning)/.test(t)) return 'danger';
  if (/(infra|road|water|power|electric|traffic|maintenance|construction|outage)/.test(t))
    return 'warning';
  if (/(event|festival|celebrat|campaign)/.test(t)) return 'success';
  if (/(legal|policy|rule|regulation|circular|tender)/.test(t)) return 'neutral';
  return 'info';
}

export const SEVERITY_STYLE: Record<Severity, { rail: string; tile: string }> = {
  danger: {
    rail: 'bg-destructive',
    tile: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  warning: { rail: 'bg-warning', tile: 'bg-warning/12 text-warning border-warning/25' },
  info: { rail: 'bg-info', tile: 'bg-info/10 text-info border-info/20' },
  success: { rail: 'bg-success', tile: 'bg-success/12 text-success border-success/25' },
  neutral: {
    rail: 'bg-muted-foreground/40',
    tile: 'bg-secondary text-muted-foreground border-border',
  },
};

const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Published within the last 48 hours. `now` is null until mounted, so this is false during SSR. */
export function isNewNotice(n: Notice, now: number | null): boolean {
  if (now == null) return false;
  const ts = Date.parse(n.publishedAt || n.date);
  if (Number.isNaN(ts)) return false;
  const age = now - ts;
  return age >= -24 * 60 * 60 * 1000 && age < NEW_WINDOW_MS;
}
