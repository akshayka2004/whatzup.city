// ============================================================
// Crew passes: scan-only logins for one event.
//
// A pass is a row, not an account, so a host can hand out 5 or 100 without emails or passwords.
// The pass code is derived from the pass id and a server secret (ticket-signing.ts), so the
// database holds only its hash, yet the host can always see the codes again to print them.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BOOKING_LIMITS,
  IN_MOBILE_PATTERN,
  checkInWindow,
  normalizeMobile,
  type CrewLevel,
} from '@saas/types';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  crewCodeFor,
  crewToken,
  formatCrewCode,
  hashCrewCode,
  normalizeCrewCode,
  parseCrewToken,
} from '../../common/utils/ticket-signing';
import { AuditService } from '../audit/audit.service';
import { CreateCrewPassesDto, UpdateCrewPassDto } from './dto/event-tickets.dto';
import { EventActor, assertEventHost, hit } from './event-access';

export interface CrewContext {
  sessionId: string;
  passId: string;
  eventId: string;
  tenantId: string;
  level: CrewLevel;
  label: string;
  validUntil: number;
}

const CTX_TTL = 10; // seconds. A revoked pass stops working within this time (revoke also clears it).

@Injectable()
export class EventCrewService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  // ── host: manage passes ─────────────────────────────────────────────────

  async create(actor: EventActor, eventId: string, dto: CreateCrewPassesDto) {
    const event = await assertEventHost(this.db, eventId, actor);

    const active = await this.db.eventCrewPass.count({ where: { eventId, revokedAt: null } });
    const labels = dto.labels?.length
      ? dto.labels.map((l) => l.trim()).filter(Boolean)
      : Array.from(
          { length: dto.count ?? 1 },
          (_, i) => `${dto.prefix?.trim() || 'Gate'} ${active + i + 1}`,
        );
    if (labels.length === 0)
      throw new BadRequestException('Give each pass a name, or say how many to create.');
    if (active + labels.length > BOOKING_LIMITS.maxCrewPasses) {
      throw new ConflictException(
        `An event can have ${BOOKING_LIMITS.maxCrewPasses} crew passes. You have ${active}.`,
      );
    }

    const win = checkInWindow(event);
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date(win.opens);
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : new Date(win.closes);
    if (!(validFrom < validUntil))
      throw new BadRequestException('A pass must start before it ends.');
    if (validUntil.getTime() < Date.now())
      throw new BadRequestException('That end time has already passed.');

    const contact = this.contact(dto);
    const created = [];
    for (const label of labels) {
      const id = randomUUID();
      created.push(
        await this.db.eventCrewPass.create({
          data: {
            id,
            tenantId: event.tenantId,
            eventId,
            label: label.slice(0, 80),
            codeHash: hashCrewCode(crewCodeFor(id)),
            level: dto.level ?? 'SCAN',
            validFrom,
            validUntil,
            maxDevices: dto.maxDevices ?? 2,
            ...contact,
            createdBy: actor.id,
          },
        }),
      );
    }
    this.audit.log({
      tenantId: event.tenantId,
      userId: actor.id,
      action: 'EVENT_CREW_PASSES_CREATED',
      resource: 'EVENT',
      resourceId: eventId,
    });
    return created.map((p) => this.present(p, 0, 0));
  }

  async list(actor: EventActor, eventId: string) {
    await assertEventHost(this.db, eventId, actor);
    const passes = await this.db.eventCrewPass.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      include: { sessions: { where: { endedAt: null }, select: { id: true } } },
    });
    const counts = await this.db.eventTicket.groupBy({
      by: ['checkedInPassId'],
      where: { eventId, checkedInPassId: { not: null } },
      _count: true,
    });
    const byPass = new Map(counts.map((c) => [c.checkedInPassId as string, c._count]));
    return passes.map((p) => this.present(p, p.sessions.length, byPass.get(p.id) ?? 0));
  }

  /** Place, phone and email as the database keeps them: trimmed, checked, empty means none. */
  private contact(dto: { place?: string; phone?: string; email?: string }) {
    const out: { place?: string | null; phone?: string | null; email?: string | null } = {};
    if (dto.place !== undefined) out.place = dto.place.trim() || null;
    if (dto.phone !== undefined) {
      const phone = dto.phone.trim() ? normalizeMobile(dto.phone) : '';
      if (phone && !IN_MOBILE_PATTERN.test(phone)) {
        throw new BadRequestException('Enter a 10-digit mobile number for the volunteer.');
      }
      out.phone = phone || null;
    }
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('Enter a valid email address for the volunteer.');
      }
      out.email = email || null;
    }
    return out;
  }

  /** Edit a volunteer's name, place, contact details, level or device limit. */
  async update(actor: EventActor, eventId: string, passId: string, dto: UpdateCrewPassDto) {
    const event = await assertEventHost(this.db, eventId, actor);
    const pass = await this.db.eventCrewPass.findFirst({
      where: { id: passId, eventId },
      include: { sessions: { select: { id: true } } },
    });
    if (!pass) throw new NotFoundException('Pass not found');

    const data: Record<string, unknown> = this.contact(dto);
    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) throw new BadRequestException('Give the volunteer a name.');
      data.label = label.slice(0, 80);
    }
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.maxDevices !== undefined) data.maxDevices = dto.maxDevices;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nothing to change.');
    }

    const updated = await this.db.eventCrewPass.update({ where: { id: passId }, data });
    // Phones that are signed in keep the old name and level in a short cache; clear it so a
    // change (for instance desk access) takes effect on the next scan.
    await Promise.all(pass.sessions.map((s) => this.redis.del(`crew:ctx:${s.id}`)));
    this.audit.log({
      tenantId: event.tenantId,
      userId: actor.id,
      action: 'EVENT_CREW_PASS_UPDATED',
      resource: 'EVENT',
      resourceId: eventId,
      oldData: { label: pass.label, place: pass.place, level: pass.level },
      newData: { label: updated.label, place: updated.place, level: updated.level },
    });
    const [devices, checkedIn] = await Promise.all([
      this.db.eventCrewSession.count({ where: { passId, endedAt: null } }),
      this.db.eventTicket.count({ where: { eventId, checkedInPassId: passId } }),
    ]);
    return this.present(updated, devices, checkedIn);
  }

  async revoke(actor: EventActor, eventId: string, passId: string) {
    await assertEventHost(this.db, eventId, actor);
    const pass = await this.db.eventCrewPass.findFirst({
      where: { id: passId, eventId },
      include: { sessions: { select: { id: true } } },
    });
    if (!pass) throw new NotFoundException('Pass not found');
    await this.db.$transaction([
      this.db.eventCrewPass.update({ where: { id: passId }, data: { revokedAt: new Date() } }),
      this.db.eventCrewSession.updateMany({
        where: { passId, endedAt: null },
        data: { endedAt: new Date() },
      }),
    ]);
    await Promise.all(pass.sessions.map((s) => this.redis.del(`crew:ctx:${s.id}`)));
    return { revoked: true };
  }

  // ── crew: sign in ───────────────────────────────────────────────────────

  async login(rawCode: string, deviceId: string, ip: string) {
    await hit(this.redis, `rl:crew-login:${ip}`, 40, 600, 'Too many attempts. Wait a few minutes.');

    const code = normalizeCrewCode(rawCode);
    const pass = code
      ? await this.db.eventCrewPass.findUnique({
          where: { codeHash: hashCrewCode(code) },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                status: true,
                deletedAt: true,
                venue: true,
                startDate: true,
                endDate: true,
                checkInOpensAt: true,
                checkInClosesAt: true,
                tenantId: true,
              },
            },
          },
        })
      : null;

    if (!pass || pass.revokedAt) {
      // Wrong guesses are limited much harder than normal traffic.
      await hit(
        this.redis,
        `rl:crew-miss:${ip}`,
        10,
        600,
        'Too many wrong codes. Wait ten minutes.',
      );
      throw new UnauthorizedException({
        code: 'CREW_CODE_INVALID',
        message: 'That code is not valid. Check it and try again.',
      });
    }
    if (pass.event.deletedAt || pass.event.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'EVENT_INACTIVE',
        message: 'This event is no longer active.',
      });
    }
    const now = Date.now();
    if (now > pass.validUntil.getTime()) {
      throw new ForbiddenException({ code: 'CREW_EXPIRED', message: 'This pass has expired.' });
    }
    if (now < pass.validFrom.getTime()) {
      throw new ForbiddenException({
        code: 'CREW_NOT_YET',
        message: `This pass starts at ${pass.validFrom.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
      });
    }

    const sessions = await this.db.eventCrewSession.findMany({ where: { passId: pass.id } });
    const mine = sessions.find((s) => s.deviceId === deviceId);
    const inUse = sessions.filter((s) => !s.endedAt).length;
    if (!mine && inUse >= pass.maxDevices) {
      throw new ForbiddenException({
        code: 'CREW_DEVICE_LIMIT',
        message: `This pass is already in use on ${inUse} phone${inUse === 1 ? '' : 's'}. Ask the organiser for another pass.`,
      });
    }

    const session = mine
      ? await this.db.eventCrewSession.update({
          where: { id: mine.id },
          data: { endedAt: null, lastSeenAt: new Date() },
        })
      : await this.db.eventCrewSession.create({ data: { passId: pass.id, deviceId } });
    await this.db.eventCrewPass.update({
      where: { id: pass.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      token: crewToken(session.id),
      pass: { id: pass.id, label: pass.label, level: pass.level, validUntil: pass.validUntil },
      event: {
        id: pass.event.id,
        title: pass.event.title,
        venue: pass.event.venue,
        startDate: pass.event.startDate,
        endDate: pass.event.endDate,
      },
    };
  }

  async logout(ctx: CrewContext) {
    await this.db.eventCrewSession.updateMany({
      where: { id: ctx.sessionId },
      data: { endedAt: new Date() },
    });
    await this.redis.del(`crew:ctx:${ctx.sessionId}`);
    return { signedOut: true };
  }

  // ── crew: every request ─────────────────────────────────────────────────

  /** Resolves a crew token to what it may do right now, or null. Cached for a few seconds. */
  async authenticate(token: unknown): Promise<CrewContext | null> {
    const sessionId = parseCrewToken(token);
    if (!sessionId) return null;

    const key = `crew:ctx:${sessionId}`;
    const cached = await this.redis.get<CrewContext>(key);
    if (cached) return cached.validUntil > Date.now() ? cached : null;

    const session = await this.db.eventCrewSession.findFirst({
      where: { id: sessionId, endedAt: null },
      include: {
        pass: { include: { event: { select: { status: true, deletedAt: true } } } },
      },
    });
    const pass = session?.pass;
    if (!session || !pass) return null;
    const now = Date.now();
    if (
      pass.revokedAt ||
      pass.validUntil.getTime() < now ||
      pass.validFrom.getTime() > now ||
      pass.event.deletedAt
    ) {
      return null;
    }
    const ctx: CrewContext = {
      sessionId,
      passId: pass.id,
      eventId: pass.eventId,
      tenantId: pass.tenantId,
      level: pass.level as CrewLevel,
      label: pass.label,
      validUntil: pass.validUntil.getTime(),
    };
    await this.redis.set(key, ctx, CTX_TTL);
    void this.db.eventCrewSession
      .update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
    return ctx;
  }

  private present(
    p: {
      id: string;
      label: string;
      level: string;
      validFrom: Date;
      validUntil: Date;
      maxDevices: number;
      place: string | null;
      phone: string | null;
      email: string | null;
      revokedAt: Date | null;
      lastUsedAt: Date | null;
    },
    devicesInUse: number,
    checkedIn: number,
  ) {
    const now = Date.now();
    const status = p.revokedAt
      ? 'REVOKED'
      : p.validUntil.getTime() < now
        ? 'EXPIRED'
        : p.validFrom.getTime() > now
          ? 'UPCOMING'
          : 'ACTIVE';
    const code = crewCodeFor(p.id);
    return {
      id: p.id,
      label: p.label,
      place: p.place,
      phone: p.phone,
      email: p.email,
      level: p.level,
      code,
      codeDisplay: formatCrewCode(code),
      status,
      validFrom: p.validFrom,
      validUntil: p.validUntil,
      maxDevices: p.maxDevices,
      devicesInUse,
      checkedIn,
      lastUsedAt: p.lastUsedAt,
    };
  }
}
