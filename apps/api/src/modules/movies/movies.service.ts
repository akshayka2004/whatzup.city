import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { AuditService } from '../audit/audit.service';

const STATUSES = ['UPCOMING', 'NOW_SHOWING', 'ENDED'];
const CERTIFICATIONS = ['U', 'U/A', 'A', 'S'];

const FIELDS = [
  'name', 'posterImage', 'language', 'durationMinutes', 'certification',
  'synopsis', 'trailerUrl', 'bookingUrl', 'status', 'targetCities', 'genres', 'cast',
] as const;

@Injectable()
export class MoviesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  private validate(dto: any) {
    if (dto.status !== undefined && !STATUSES.includes(dto.status)) {
      throw new BadRequestException(`status must be one of ${STATUSES.join(', ')}`);
    }
    if (dto.certification !== undefined && dto.certification && !CERTIFICATIONS.includes(dto.certification)) {
      throw new BadRequestException(`certification must be one of ${CERTIFICATIONS.join(', ')}`);
    }
  }

  private buildData(dto: any) {
    const data: any = {};
    for (const k of FIELDS) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (Array.isArray(dto.genres) === false && dto.genres !== undefined) data.genres = [];
    if (Array.isArray(dto.cast) === false && dto.cast !== undefined) data.cast = [];
    if (Array.isArray(dto.targetCities) === false && dto.targetCities !== undefined) data.targetCities = [];
    if (dto.releaseDate !== undefined) data.releaseDate = dto.releaseDate ? new Date(dto.releaseDate) : null;
    return data;
  }

  // ── Super-admin CRUD ──────────────────────────────────────────────────
  async adminCreate(userId: string, tenantId: string, dto: any) {
    if (!dto.name) throw new BadRequestException('name is required');
    this.validate(dto);
    const resolvedTenant = await this.tenantResolver.resolveTenantId(tenantId);
    const data = this.buildData(dto);
    const movie = await this.db.movie.create({
      data: { tenantId: resolvedTenant, name: dto.name, createdBy: userId, ...data },
    });
    await this.audit.log({ tenantId: resolvedTenant, userId, action: 'ADMIN_CREATE_MOVIE', resource: 'MOVIE', resourceId: movie.id });
    return movie;
  }

  async adminUpdate(id: string, userId: string, dto: any) {
    const m = await this.db.movie.findFirst({ where: { id, deletedAt: null } });
    if (!m) throw new NotFoundException('Movie not found');
    this.validate(dto);
    const data = this.buildData(dto);
    const updated = await this.db.movie.update({ where: { id }, data });
    await this.audit.log({ tenantId: m.tenantId, userId, action: 'ADMIN_UPDATE_MOVIE', resource: 'MOVIE', resourceId: id });
    return updated;
  }

  async adminRemove(id: string, userId: string) {
    const m = await this.db.movie.findFirst({ where: { id, deletedAt: null } });
    if (!m) throw new NotFoundException('Movie not found');
    await this.db.movie.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.log({ tenantId: m.tenantId, userId, action: 'ADMIN_DELETE_MOVIE', resource: 'MOVIE', resourceId: id });
    return { success: true };
  }

  async adminFindAll(page = 1, limit = 50) {
    const pageVal = Math.max(1, Number(page) || 1);
    const limitVal = Math.min(Number(limit) || 50, 100);
    const [data, total] = await Promise.all([
      this.db.movie.findMany({
        where: { deletedAt: null },
        skip: (pageVal - 1) * limitVal,
        take: limitVal,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.movie.count({ where: { deletedAt: null } }),
    ]);
    return { data, meta: { total, page: pageVal, limit: limitVal } };
  }

  // ── Public ────────────────────────────────────────────────────────────
  async findPublic(city?: string, status?: string, page = 1, limit = 24) {
    const pageVal = Math.max(1, Number(page) || 1);
    const limitVal = Math.min(Number(limit) || 24, 50);
    const where: any = { deletedAt: null };
    if (status && STATUSES.includes(status)) where.status = status;
    if (city) {
      where.OR = [
        { targetCities: { equals: [] } },
        { targetCities: { array_contains: city } },
      ];
    }
    const [data, total] = await Promise.all([
      this.db.movie.findMany({
        where,
        skip: (pageVal - 1) * limitVal,
        take: limitVal,
        orderBy: [{ status: 'asc' }, { releaseDate: 'desc' }],
      }),
      this.db.movie.count({ where }),
    ]);
    return { data, meta: { total, page: pageVal, limit: limitVal } };
  }

  async findById(id: string) {
    const m = await this.db.movie.findFirst({ where: { id, deletedAt: null } });
    if (!m) throw new NotFoundException('Movie not found');
    return m;
  }
}
