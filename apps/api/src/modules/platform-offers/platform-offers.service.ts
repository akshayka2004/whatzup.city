import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { StorageService } from '../../common/storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { mapWithConcurrency } from '../../common/utils/concurrency';
import { recordOfferClick } from '../../common/utils/offer-click.util';
import {
  CreatePlatformOfferDto, UpdatePlatformOfferDto, PlatformOfferStatusEnum,
} from './dto/platform-offer.dto';

/**
 * Platform-curated offers. Unlike Offer, these carry no businessId — the vendor
 * need not be registered on the platform, so vendor details are stored on the
 * row itself.
 */
@Injectable()
export class PlatformOffersService {
  private readonly logger = new Logger(PlatformOffersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tenantResolver: TenantResolverService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreatePlatformOfferDto) {
    const resolvedTenant = await this.tenantResolver.resolveTenantId(tenantId);

    // Posters are uploaded straight to storage via a signed URL, so the real
    // bytes are unverified until now. Reject anything that isn't a genuine
    // image/PDF before it can be served to the public.
    if (dto.imageUrl) await this.verifyPoster(dto.imageUrl);

    const offer = await this.db.platformOffer.create({
      data: {
        tenantId: resolvedTenant,
        category: dto.category,
        subType: dto.category === 'STAYCATION' ? dto.subType ?? null : null,
        title: dto.title,
        location: dto.location,
        price: dto.price || null,
        phone: dto.phone || null,
        imageUrl: dto.imageUrl || null,
        description: dto.description || null,
        details: dto.details || {},
        status: dto.status ?? PlatformOfferStatusEnum.UNPUBLISHED,
        createdBy: userId,
      },
    });

    await this.audit.log({
      tenantId: resolvedTenant,
      userId,
      action: 'PLATFORM_OFFER_CREATED',
      resource: 'PLATFORM_OFFER',
      resourceId: offer.id,
      metadata: { category: offer.category, title: offer.title },
    });

    return offer;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdatePlatformOfferDto) {
    const resolvedTenant = await this.tenantResolver.resolveTenantId(tenantId);
    const existing = await this.db.platformOffer.findFirst({
      where: { id, tenantId: resolvedTenant, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Platform offer not found');

    if (dto.imageUrl && dto.imageUrl !== existing.imageUrl) await this.verifyPoster(dto.imageUrl);

    const category = dto.category ?? existing.category;

    const updated = await this.db.platformOffer.update({
      where: { id },
      data: {
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        // subType only ever applies to Staycation; clear it if the category moved.
        subType: category === 'STAYCATION' ? dto.subType ?? existing.subType : null,
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.price !== undefined ? { price: dto.price || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.details !== undefined ? { details: dto.details } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        updatedBy: userId,
      },
    });

    await this.audit.log({
      tenantId: existing.tenantId,
      userId,
      action: 'PLATFORM_OFFER_UPDATED',
      resource: 'PLATFORM_OFFER',
      resourceId: id,
      metadata: { category: updated.category },
    });

    return updated;
  }

  async setStatus(tenantId: string, userId: string, id: string, status: PlatformOfferStatusEnum) {
    const resolvedTenant = await this.tenantResolver.resolveTenantId(tenantId);
    const existing = await this.db.platformOffer.findFirst({
      where: { id, tenantId: resolvedTenant, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Platform offer not found');

    const updated = await this.db.platformOffer.update({
      where: { id },
      data: { status, updatedBy: userId },
    });

    await this.audit.log({
      tenantId: existing.tenantId,
      userId,
      action: status === PlatformOfferStatusEnum.PUBLISHED
        ? 'PLATFORM_OFFER_PUBLISHED'
        : 'PLATFORM_OFFER_UNPUBLISHED',
      resource: 'PLATFORM_OFFER',
      resourceId: id,
      metadata: { title: existing.title },
    });

    return updated;
  }

  async remove(tenantId: string, userId: string, id: string) {
    const resolvedTenant = await this.tenantResolver.resolveTenantId(tenantId);
    const existing = await this.db.platformOffer.findFirst({
      where: { id, tenantId: resolvedTenant, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Platform offer not found');

    // Soft delete — keeps the audit trail intact.
    const removed = await this.db.platformOffer.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId },
    });

    await this.audit.log({
      tenantId: existing.tenantId,
      userId,
      action: 'PLATFORM_OFFER_DELETED',
      resource: 'PLATFORM_OFFER',
      resourceId: id,
      metadata: { title: existing.title },
    });

    return removed;
  }

  /** Admin list — every status, newest first. */
  async listForAdmin(category?: string, status?: string) {
    // tenant-scope-ok: admin platform-offer queue spans tenants by design; role-guarded in controller
    const rows = await this.db.platformOffer.findMany({
      where: {
        deletedAt: null,
        ...(category ? { category: category as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return mapWithConcurrency(rows, 10, (r) => this.withSignedImage(r));
  }

  /** Public list — published only. */
  async listPublic(tenantId?: string, category?: string) {
    const resolvedTenant = await this.tenantResolver.resolveTenantId(tenantId);
    const rows = await this.db.platformOffer.findMany({
      where: {
        tenantId: resolvedTenant,
        deletedAt: null,
        status: 'PUBLISHED',
        ...(category ? { category: category as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return mapWithConcurrency(rows, 10, (r) => this.withSignedImage(r));
  }

  /** Records a deduped detail-view click for the super-admin click count. */
  async trackClick(tenantId: string, id: string, actorKey: string) {
    const resolvedTenant = await this.tenantResolver.resolveTenantId(tenantId);
    await recordOfferClick(this.db, { tenantId: resolvedTenant, offerKind: 'PLATFORM', offerId: id, actorKey });
  }

  async findOne(id: string) {
    const offer = await this.db.platformOffer.findFirst({ where: { id, deletedAt: null } });
    if (!offer) throw new NotFoundException('Platform offer not found');
    return this.withSignedImage(offer);
  }

  /**
   * Posters live in a private bucket, so the stored {bucket,path} is turned into
   * a short-lived signed URL for display.
   */
  private async withSignedImage<T extends { imageUrl: string | null }>(row: T) {
    if (!row.imageUrl) return { ...row, imageSignedUrl: null };
    try {
      const parsed = JSON.parse(row.imageUrl);
      const signed = await this.storage.createSignedDownloadUrl(parsed.bucket, parsed.path, 3600);
      return { ...row, imageSignedUrl: signed };
    } catch {
      // Older/plain URLs pass through unchanged.
      return { ...row, imageSignedUrl: row.imageUrl };
    }
  }

  private async verifyPoster(imageUrl: string) {
    try {
      const parsed = JSON.parse(imageUrl);
      await this.storage.verifyStoredFile(parsed.bucket, parsed.path, [
        'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      ]);
    } catch (err: any) {
      // A BadRequestException from verifyStoredFile must surface to the admin.
      if (err?.status === 400) throw err;
      this.logger.warn(`Could not verify platform offer poster: ${err?.message ?? err}`);
    }
  }
}
