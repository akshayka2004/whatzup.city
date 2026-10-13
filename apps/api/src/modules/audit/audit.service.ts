import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { redact } from '../../common/utils/redact';

/** Action keywords per audit category (shared meaning with the admin audit page's chips). */
export const AUDIT_CATEGORY_TERMS = {
  BILL: ['BILL', 'INVOICE'],
  OFFER: ['OFFER', 'COUPON', 'PROMO'],
  BUSINESS: ['BUSINESS', 'ONBOARDING', 'LISTING'],
  MODERATION: ['REJECT', 'MODERAT', 'FLAG', 'BAN', 'FRAUD'],
  USER: ['USER', 'LOGIN', 'LOGOUT', 'REGISTER', 'AUTH', 'PASSWORD'],
  NOTICE: ['NOTICE', 'ANNOUNCEMENT', 'ALERT'],
} as const;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Fire-and-forget. Audit is a best-effort side-effect and must never add a
   * network round-trip to (or fail) the user's request. Callers may still
   * `await` this — it resolves immediately; the INSERT runs in the background
   * and only logs on failure. This removes one remote-DB round-trip from every
   * create / update / delete.
   */
  log(data: {
    tenantId: string;
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    oldData?: any;
    newData?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    // Audit rows are long-lived and widely readable, so strip secrets and
    // identity documents (PAN/GSTIN/tokens) before persisting.
    const safe = {
      ...data,
      oldData: redact(data.oldData),
      newData: redact(data.newData),
      metadata: redact(data.metadata),
    };
    void this.db.auditLog
      .create({ data: safe })
      .catch((e) => this.logger.warn(`audit log failed (${data.action}): ${e?.message ?? e}`));
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 50,
    filters?: {
      userId?: string;
      action?: string;
      resource?: string;
      resourceId?: string;
      q?: string;
      category?: string;
    },
    actorRole?: string,
  ): Promise<any> {
    page = Math.max(1, Number(page) || 1);
    // Brand and outlet activity is written under each brand owner's own tenant, so the platform
    // super-admin has to read across tenants to see it; everyone else stays inside their own.
    const where: any = actorRole === 'SUPER_ADMIN' ? {} : { tenantId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.action) where.action = filters.action;
    if (filters?.resource) where.resource = filters.resource;
    if (filters?.resourceId) where.resourceId = filters.resourceId;
    const and: any[] = [];
    const q = filters?.q?.trim().slice(0, 100);
    if (q) {
      and.push({
        OR: [
          { action: { contains: q, mode: 'insensitive' } },
          { resource: { contains: q, mode: 'insensitive' } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }
    const cat = filters?.category?.toUpperCase();
    if (cat && cat in AUDIT_CATEGORY_TERMS) {
      const terms = AUDIT_CATEGORY_TERMS[cat as keyof typeof AUDIT_CATEGORY_TERMS];
      and.push({ OR: terms.map((t) => ({ action: { contains: t, mode: 'insensitive' } })) });
    } else if (cat === 'SYSTEM') {
      const all = Object.values(AUDIT_CATEGORY_TERMS).flat();
      and.push({ NOT: { OR: all.map((t) => ({ action: { contains: t, mode: 'insensitive' } })) } });
    }
    if (and.length) where.AND = and;

    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.db.auditLog.count({ where }),
    ]);

    let finalData = data;
    if (actorRole !== 'SUPER_ADMIN') {
      finalData = data.map((log: any) => {
        if (log.user) {
          const userCopy = { ...log.user };
          delete userCopy.email;
          delete userCopy.phone;
          return {
            ...log,
            user: userCopy,
          };
        }
        return log;
      });
    }

    return {
      data: finalData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}
