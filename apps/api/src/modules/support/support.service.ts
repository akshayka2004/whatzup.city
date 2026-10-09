import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { assertBusinessAccess } from '../../common/utils/business-access';

export type SupportUser = {
  id: string;
  role?: string | null;
  tenantId?: string | null;
  name?: string | null;
};

const STAFF_ROLES = new Set(['SUPER_ADMIN', 'MASTER_ADMIN', 'PLATFORM_STAFF']);
const CATEGORIES = new Set(['GENERAL', 'BILLING', 'LISTING', 'BILLS', 'TECHNICAL', 'ACCOUNT']);
const STATUSES = new Set(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']);

const isStaff = (u: SupportUser) => !!u.role && STAFF_ROLES.has(u.role);
const clean = (s: string, max: number) =>
  (s ?? '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, max);

/**
 * Support tickets between businesses (or any signed-in user) and the platform team.
 * Status flow: OPEN (waiting on staff) ⇄ PENDING (waiting on customer) → RESOLVED/CLOSED.
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    user: SupportUser,
    dto: { subject: string; body: string; category?: string; businessId?: string },
  ) {
    const subject = clean(dto.subject, 200);
    const body = clean(dto.body, 5000);
    if (subject.length < 4)
      throw new BadRequestException('Add a short subject (at least 4 characters).');
    if (body.length < 10)
      throw new BadRequestException('Describe the problem in a sentence or two.');
    let tenantId = user.tenantId ?? null;
    if (dto.businessId) {
      const biz = await assertBusinessAccess(this.db, dto.businessId, user);
      tenantId = biz.tenantId;
    }
    if (!tenantId) throw new BadRequestException('Could not determine your account.');
    const category = dto.category && CATEGORIES.has(dto.category) ? dto.category : 'GENERAL';

    return this.db.supportTicket.create({
      data: {
        tenantId,
        businessId: dto.businessId ?? null,
        openedBy: user.id,
        subject,
        category,
        lastReplyBy: 'CUSTOMER',
        messages: { create: { authorId: user.id, body, fromStaff: false } },
      },
      include: { messages: true },
    });
  }

  async listMine(user: SupportUser, businessId?: string) {
    const where = businessId
      ? (await assertBusinessAccess(this.db, businessId, user), { businessId, deletedAt: null })
      : { openedBy: user.id, deletedAt: null };
    return this.db.supportTicket.findMany({
      where,
      orderBy: { lastReplyAt: 'desc' },
      take: 100,
      include: { _count: { select: { messages: true } } },
    });
  }

  async listAll(status?: string, page = 1) {
    const where = { deletedAt: null, ...(status && STATUSES.has(status) ? { status } : {}) };
    const take = 25;
    const [data, total] = await Promise.all([
      this.db.supportTicket.findMany({
        where,
        orderBy: [{ lastReplyAt: 'desc' }],
        skip: (Math.max(1, page) - 1) * take,
        take,
        include: { _count: { select: { messages: true } } },
      }),
      this.db.supportTicket.count({ where }),
    ]);
    const bizIds = [...new Set(data.map((t) => t.businessId).filter(Boolean))] as string[];
    const openerIds = [...new Set(data.map((t) => t.openedBy))];
    const [biz, users] = await Promise.all([
      this.db.business.findMany({
        where: { id: { in: bizIds } },
        select: { id: true, name: true },
      }),
      this.db.user.findMany({
        where: { id: { in: openerIds } },
        select: { id: true, name: true, email: true },
      }),
    ]);
    return {
      data: data.map((t) => ({
        ...t,
        business: biz.find((b) => b.id === t.businessId) ?? null,
        opener: users.find((u) => u.id === t.openedBy) ?? null,
      })),
      total,
      page,
      limit: take,
    };
  }

  private async load(id: string, user: SupportUser) {
    const ticket = await this.db.supportTicket.findFirst({
      where: { id, deletedAt: null },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (isStaff(user) || ticket.openedBy === user.id) return ticket;
    if (ticket.businessId) {
      await assertBusinessAccess(this.db, ticket.businessId, user);
      return ticket;
    }
    throw new ForbiddenException('You do not have access to this ticket');
  }

  async get(id: string, user: SupportUser) {
    const ticket = await this.load(id, user);
    const authorIds = [...new Set(ticket.messages.map((m) => m.authorId))];
    const authors = await this.db.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    return {
      ...ticket,
      messages: ticket.messages.map((m) => ({
        ...m,
        authorName: m.fromStaff
          ? 'Whtzup.city support'
          : (authors.find((a) => a.id === m.authorId)?.name ?? 'You'),
      })),
    };
  }

  async reply(id: string, user: SupportUser, text: string) {
    const ticket = await this.load(id, user);
    const body = clean(text, 5000);
    if (!body) throw new BadRequestException('Write a message first.');
    const staff = isStaff(user);
    const message = await this.db.supportMessage.create({
      data: { ticketId: id, authorId: user.id, body, fromStaff: staff },
    });
    await this.db.supportTicket.update({
      where: { id },
      data: {
        lastReplyAt: new Date(),
        lastReplyBy: staff ? 'STAFF' : 'CUSTOMER',
        // Staff reply → waiting on the customer; customer reply reopens a resolved ticket.
        status: staff ? 'PENDING' : 'OPEN',
        closedAt: null,
      },
    });
    if (staff) {
      this.notifications
        .send({
          tenantId: ticket.tenantId,
          userId: ticket.openedBy,
          title: 'Support replied',
          body: `New reply on “${ticket.subject}”`,
          type: 'IN_APP',
          channel: 'BUSINESS',
          metadata: { ticketId: id, href: `/dashboard/support?ticket=${id}` },
        })
        .catch((e) => this.logger.warn(`Support notification failed: ${e?.message}`));
    }
    return message;
  }

  async setStatus(id: string, user: SupportUser, status: string) {
    if (!STATUSES.has(status)) throw new BadRequestException('Unknown status');
    const ticket = await this.load(id, user);
    // Customers may only close or reopen their own ticket; staff can set any status.
    if (!isStaff(user) && !['CLOSED', 'OPEN'].includes(status))
      throw new ForbiddenException('Only support staff can set that status');
    return this.db.supportTicket.update({
      where: { id: ticket.id },
      data: { status, closedAt: status === 'CLOSED' || status === 'RESOLVED' ? new Date() : null },
    });
  }
}
