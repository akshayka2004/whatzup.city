import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { AuditService } from '../audit/audit.service';

const TICKET_TYPES = ['FREE', 'PAID'];
const EVENT_CATEGORIES = [
  'ENTERTAINMENT', 'MEETUP', 'WORKSHOP', 'CONCERT', 'SPORTS', 'FESTIVAL',
  'EXHIBITION', 'CONFERENCE', 'NETWORKING', 'FOOD_AND_DRINK', 'ARTS_AND_CULTURE',
  'COMMUNITY', 'CHARITY', 'RELIGIOUS', 'EDUCATION', 'KIDS_AND_FAMILY',
  'HEALTH_AND_WELLNESS', 'TECH', 'OTHER',
];

@Injectable()
export class EventsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  private async resolveBusinessId(tenantId: string, businessOrEntityId: string): Promise<string> {
    const biz = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id: businessOrEntityId }, { entityId: businessOrEntityId }], deletedAt: null },
      select: { id: true },
    });
    if (!biz) throw new BadRequestException('Business not found for event');
    return biz.id;
  }

  // Shared validation + field extraction for ticket/category on create+update.
  private extraFields(dto: any, payload: any) {
    if (dto.category !== undefined) {
      if (dto.category && !EVENT_CATEGORIES.includes(dto.category)) {
        throw new BadRequestException(`Invalid category: ${dto.category}`);
      }
      payload.category = dto.category || null;
    }
    if (dto.ticketType !== undefined) {
      if (!TICKET_TYPES.includes(dto.ticketType)) {
        throw new BadRequestException(`ticketType must be one of ${TICKET_TYPES.join(', ')}`);
      }
      payload.ticketType = dto.ticketType;
      payload.ticketPrice = dto.ticketType === 'PAID' ? (dto.ticketPrice ?? payload.ticketPrice) : null;
    } else if (dto.ticketPrice !== undefined) {
      payload.ticketPrice = dto.ticketPrice;
    }
  }

  async create(tenantId: string, userId: string, businessId: string, dto: any) {
    const bizId = await this.resolveBusinessId(tenantId, businessId);
    if (!dto.title || !dto.startDate || !dto.endDate) {
      throw new BadRequestException('title, startDate and endDate are required');
    }
    const data: any = {
      tenantId,
      businessId: bizId,
      title: dto.title,
      description: dto.description || '',
      posterImage: dto.posterImage || null,
      venue: dto.venue || null,
      city: dto.city || null,
      targetCities: Array.isArray(dto.targetCities) ? dto.targetCities : [],
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      registrationUrl: dto.registrationUrl || null,
      ticketUrl: dto.ticketUrl || null,
      status: 'ACTIVE',
    };
    this.extraFields(dto, data);
    const event = await this.db.event.create({ data });
    await this.audit.log({ tenantId, userId, action: 'CREATE_EVENT', resource: 'EVENT', resourceId: event.id });
    return event;
  }

  // Public listing: ACTIVE, not expired, optionally filtered by viewer city
  // (empty targetCities = All cities).
  async findPublicActive(city?: string, page = 1, limit = 20) {
    const pageVal = Math.max(1, Number(page) || 1);
    const limitVal = Math.min(Number(limit) || 20, 50);
    const now = new Date();
    const where: any = { deletedAt: null, status: 'ACTIVE', endDate: { gte: now } };
    if (city) {
      where.OR = [
        { targetCities: { equals: [] } },
        { targetCities: { array_contains: city } },
        { city },
      ];
    }
    const [data, total] = await Promise.all([
      this.db.event.findMany({
        where,
        skip: (pageVal - 1) * limitVal,
        take: limitVal,
        orderBy: { startDate: 'asc' },
        include: { business: { select: { id: true, name: true, logo: true, city: true } } },
      }),
      this.db.event.count({ where }),
    ]);
    return { data, meta: { total, page: pageVal, limit: limitVal } };
  }

  async findById(id: string) {
    const e = await this.db.event.findFirst({
      where: { id, deletedAt: null },
      include: { business: { select: { id: true, name: true, logo: true, city: true } } },
    });
    if (!e) throw new NotFoundException('Event not found');
    return e;
  }

  // Track an outbound register/ticket click, then hand back the external URL.
  async trackClick(id: string, type: string, userId?: string) {
    const e = await this.db.event.findFirst({ where: { id, deletedAt: null } });
    if (!e) throw new NotFoundException('Event not found');
    const t = type === 'TICKET' ? 'TICKET' : 'REGISTER';
    await this.db.event.update({
      where: { id },
      data: t === 'TICKET' ? { ticketClicks: { increment: 1 } } : { registrationClicks: { increment: 1 } },
    });
    await this.db.eventClick.create({
      data: { tenantId: e.tenantId, eventId: id, userId: userId || null, type: t },
    });
    return { url: (t === 'TICKET' ? e.ticketUrl : e.registrationUrl) || null };
  }

  async findMine(tenantId: string, businessId: string) {
    const bizId = await this.resolveBusinessId(tenantId, businessId);
    return this.db.event.findMany({
      where: { businessId: bizId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, businessId: string, id: string, userId: string, dto: any) {
    const bizId = await this.resolveBusinessId(tenantId, businessId);
    const e = await this.db.event.findFirst({ where: { id, businessId: bizId, deletedAt: null } });
    if (!e) throw new NotFoundException('Event not found');
    const payload: any = {};
    for (const k of ['title', 'description', 'posterImage', 'venue', 'city', 'targetCities', 'registrationUrl', 'ticketUrl', 'status']) {
      if (dto[k] !== undefined) payload[k] = dto[k];
    }
    this.extraFields(dto, payload);
    if (dto.startDate) payload.startDate = new Date(dto.startDate);
    if (dto.endDate) payload.endDate = new Date(dto.endDate);
    const updated = await this.db.event.update({ where: { id }, data: payload });
    await this.audit.log({ tenantId, userId, action: 'UPDATE_EVENT', resource: 'EVENT', resourceId: id });
    return updated;
  }

  async remove(tenantId: string, businessId: string, id: string, userId: string) {
    const bizId = await this.resolveBusinessId(tenantId, businessId);
    const e = await this.db.event.findFirst({ where: { id, businessId: bizId, deletedAt: null } });
    if (!e) throw new NotFoundException('Event not found');
    await this.db.event.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId, userId, action: 'DELETE_EVENT', resource: 'EVENT', resourceId: id });
    return { success: true };
  }

  // ── Super-admin CRUD (cross-tenant; resolves the business/event globally) ──
  // businessId is optional: omitting it (with hostLabel set) publishes a
  // platform-hosted "Special Correspondent" event with no business owner.
  async adminCreate(userId: string, businessId: string | undefined, dto: any) {
    if (!dto.title || !dto.startDate || !dto.endDate) {
      throw new BadRequestException('title, startDate and endDate are required');
    }
    let bizId: string | null = null;
    let tenantId: string;
    if (businessId) {
      const biz = await this.db.business.findFirst({
        where: { OR: [{ id: businessId }, { entityId: businessId }], deletedAt: null },
        select: { id: true, tenantId: true },
      });
      if (!biz) throw new BadRequestException('Business not found');
      bizId = biz.id;
      tenantId = biz.tenantId;
    } else {
      if (!dto.hostLabel) throw new BadRequestException('hostLabel is required when no business is set');
      tenantId = await this.tenantResolver.resolveTenantId(dto.tenantId);
    }
    const data: any = {
      tenantId,
      businessId: bizId,
      hostLabel: bizId ? null : dto.hostLabel,
      title: dto.title,
      description: dto.description || '',
      posterImage: dto.posterImage || null,
      venue: dto.venue || null,
      city: dto.city || null,
      targetCities: Array.isArray(dto.targetCities) ? dto.targetCities : [],
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      registrationUrl: dto.registrationUrl || null,
      ticketUrl: dto.ticketUrl || null,
      status: 'ACTIVE',
    };
    this.extraFields(dto, data);
    const event = await this.db.event.create({ data });
    await this.audit.log({ tenantId, userId, action: 'ADMIN_CREATE_EVENT', resource: 'EVENT', resourceId: event.id });
    return event;
  }

  async adminUpdate(id: string, userId: string, dto: any) {
    const e = await this.db.event.findFirst({ where: { id, deletedAt: null } });
    if (!e) throw new NotFoundException('Event not found');
    const payload: any = {};
    for (const k of ['title', 'description', 'posterImage', 'venue', 'city', 'targetCities', 'registrationUrl', 'ticketUrl', 'status']) {
      if (dto[k] !== undefined) payload[k] = dto[k];
    }
    if (dto.hostLabel !== undefined) payload.hostLabel = dto.hostLabel || null;
    this.extraFields(dto, payload);
    if (dto.startDate) payload.startDate = new Date(dto.startDate);
    if (dto.endDate) payload.endDate = new Date(dto.endDate);
    const updated = await this.db.event.update({ where: { id }, data: payload });
    await this.audit.log({ tenantId: e.tenantId, userId, action: 'ADMIN_UPDATE_EVENT', resource: 'EVENT', resourceId: id });
    return updated;
  }

  async adminRemove(id: string, userId: string) {
    const e = await this.db.event.findFirst({ where: { id, deletedAt: null } });
    if (!e) throw new NotFoundException('Event not found');
    await this.db.event.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId: e.tenantId, userId, action: 'ADMIN_DELETE_EVENT', resource: 'EVENT', resourceId: id });
    return { success: true };
  }

  // Super-admin: every event + total click count.
  async adminFindAll(page = 1, limit = 50) {
    const pageVal = Math.max(1, Number(page) || 1);
    const limitVal = Math.min(Number(limit) || 50, 100);
    const [data, total] = await Promise.all([
      this.db.event.findMany({
        where: { deletedAt: null },
        skip: (pageVal - 1) * limitVal,
        take: limitVal,
        orderBy: { createdAt: 'desc' },
        include: { business: { select: { id: true, name: true } }, _count: { select: { clicks: true } } },
      }),
      this.db.event.count({ where: { deletedAt: null } }),
    ]);
    return { data, meta: { total, page: pageVal, limit: limitVal } };
  }

  // Super-admin: registration/ticket clicks ("registrations") across events.
  async adminRegistrations(eventId?: string, page = 1, limit = 100) {
    const pageVal = Math.max(1, Number(page) || 1);
    const limitVal = Math.min(Number(limit) || 100, 200);
    const where: any = eventId ? { eventId } : {};
    const [data, total] = await Promise.all([
      this.db.eventClick.findMany({
        where,
        skip: (pageVal - 1) * limitVal,
        take: limitVal,
        orderBy: { createdAt: 'desc' },
        include: { event: { select: { id: true, title: true, business: { select: { name: true } } } } },
      }),
      this.db.eventClick.count({ where }),
    ]);
    return { data, meta: { total, page: pageVal, limit: limitVal } };
  }
}
