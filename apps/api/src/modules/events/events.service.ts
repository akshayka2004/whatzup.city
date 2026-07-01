import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  private async resolveBusinessId(tenantId: string, businessOrEntityId: string): Promise<string> {
    const biz = await this.db.business.findFirst({
      where: { tenantId, OR: [{ id: businessOrEntityId }, { entityId: businessOrEntityId }], deletedAt: null },
      select: { id: true },
    });
    if (!biz) throw new BadRequestException('Business not found for event');
    return biz.id;
  }

  async create(tenantId: string, userId: string, businessId: string, dto: any) {
    const bizId = await this.resolveBusinessId(tenantId, businessId);
    if (!dto.title || !dto.startDate || !dto.endDate) {
      throw new BadRequestException('title, startDate and endDate are required');
    }
    const event = await this.db.event.create({
      data: {
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
      },
    });
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
