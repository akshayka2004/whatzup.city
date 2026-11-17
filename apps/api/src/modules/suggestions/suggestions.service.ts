// ============================================================
// Suggestion box. Any signed-in person sends a suggestion; the platform admins read and review them.
// One-way on purpose: it is not a support ticket and nobody is promised a reply.
// ============================================================

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import {
  SUGGESTION_LIMITS,
  SUGGESTION_STATUSES,
  SUGGESTION_TOPICS,
  THANK_YOU,
} from './suggestions.constants';

export type SuggestionUser = { id: string; tenantId?: string | null; role?: string | null };

const DAY_MS = 86_400_000;
/** Text only: tags are dropped and whitespace is tidied, so the admin page can show it as it is. */
const tidy = (s: unknown, max: number) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);

@Injectable()
export class SuggestionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Saves a suggestion and returns the thank-you the person sees. */
  async create(user: SuggestionUser, dto: { topic?: string; message: string; page?: string }) {
    const message = tidy(dto.message, SUGGESTION_LIMITS.max + 1);
    if (message.length < SUGGESTION_LIMITS.min) {
      throw new BadRequestException(
        `Tell us a little more (at least ${SUGGESTION_LIMITS.min} characters).`,
      );
    }
    if (message.length > SUGGESTION_LIMITS.max) {
      throw new BadRequestException(
        `That is a little long. Keep it under ${SUGGESTION_LIMITS.max} characters.`,
      );
    }
    const topic = (SUGGESTION_TOPICS as readonly string[]).includes(dto.topic ?? '')
      ? (dto.topic as string)
      : 'GENERAL';
    const page = dto.page && dto.page.startsWith('/') ? dto.page.slice(0, 200) : null;
    if (!user.tenantId) throw new BadRequestException('Could not find your account.');

    const since = new Date(Date.now() - DAY_MS);
    const recent = await this.db.suggestion.findMany({
      where: { userId: user.id, createdAt: { gte: since }, deletedAt: null },
      select: { id: true, message: true },
      take: SUGGESTION_LIMITS.perDay + 1,
    });
    // Pressing send twice (or a retry on a bad connection) must not make two entries.
    const same = recent.find((r) => r.message === message);
    if (same) return { id: same.id, thanks: THANK_YOU };
    if (recent.length >= SUGGESTION_LIMITS.perDay) {
      throw new HttpException(
        'You have sent a few suggestions today. Please try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const row = await this.db.suggestion.create({
      data: { tenantId: user.tenantId, userId: user.id, topic, message, page },
      select: { id: true },
    });
    return { id: row.id, thanks: THANK_YOU };
  }

  /** The admin's list, newest first, with the number in each status for the filter chips. */
  async adminList(q: { status?: string; topic?: string; search?: string; page?: number }) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = 25;
    const status = (SUGGESTION_STATUSES as readonly string[]).includes(q.status ?? '')
      ? q.status
      : undefined;
    const topic = (SUGGESTION_TOPICS as readonly string[]).includes(q.topic ?? '')
      ? q.topic
      : undefined;
    const search = q.search?.trim();
    const where: Prisma.SuggestionWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(topic ? { topic } : {}),
      ...(search
        ? {
            OR: [
              { message: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [rows, total, counts] = await Promise.all([
      // tenant-scope-ok: platform admins review suggestions from every tenant
      this.db.suggestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      // tenant-scope-ok: platform admins review suggestions from every tenant
      this.db.suggestion.count({ where }),
      // tenant-scope-ok: platform admins review suggestions from every tenant
      this.db.suggestion.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const summary: Record<string, number> = { NEW: 0, REVIEWED: 0, PLANNED: 0, DECLINED: 0 };
    for (const c of counts) summary[c.status] = c._count._all;
    return {
      data: rows.map((r) => ({
        id: r.id,
        topic: r.topic,
        message: r.message,
        page: r.page,
        status: r.status,
        adminNote: r.adminNote,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        from: { id: r.user.id, name: r.user.name, email: r.user.email, role: r.user.role },
      })),
      meta: { total, page, limit },
      summary,
    };
  }

  /** The admin marks a suggestion reviewed, planned or declined and may leave a note for the team. */
  async review(
    actor: { id: string; tenantId?: string | null },
    id: string,
    dto: { status?: string; adminNote?: string },
  ) {
    // tenant-scope-ok: platform admins review suggestions from every tenant
    const row = await this.db.suggestion.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new NotFoundException('Suggestion not found.');

    const data: Prisma.SuggestionUpdateInput = {};
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    if (dto.status !== undefined && dto.status !== row.status) {
      if (!(SUGGESTION_STATUSES as readonly string[]).includes(dto.status)) {
        throw new BadRequestException('Unknown status.');
      }
      data.status = dto.status;
      before.status = row.status;
      after.status = dto.status;
    }
    if (dto.adminNote !== undefined) {
      const note = tidy(dto.adminNote, 1000) || null;
      if (note !== row.adminNote) {
        data.adminNote = note;
        before.adminNote = row.adminNote;
        after.adminNote = note;
      }
    }
    if (Object.keys(data).length === 0) return this.shape(row);

    data.reviewedBy = actor.id;
    data.reviewedAt = new Date();
    const updated = await this.db.suggestion.update({ where: { id }, data });
    this.audit.log({
      tenantId: row.tenantId,
      userId: actor.id,
      action: 'SUGGESTION_REVIEWED',
      resource: 'SUGGESTION',
      resourceId: id,
      oldData: before,
      newData: after,
    });
    return this.shape(updated);
  }

  private shape(r: {
    id: string;
    status: string;
    adminNote: string | null;
    reviewedAt: Date | null;
  }) {
    return { id: r.id, status: r.status, adminNote: r.adminNote, reviewedAt: r.reviewedAt };
  }
}
