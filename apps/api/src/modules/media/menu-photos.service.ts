import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { StorageService } from '../../common/storage/storage.service';
import { MediaService } from './media.service';
import { isFoodCategory } from '../../common/utils/food-category';
import { MenuUploadUrlDto, CreateMenuPhotoDto } from './dto/menu-photo.dto';

const BUCKET = 'business-media';
const MENU_TYPE = 'FOOD_MENU';
const MAX_MENU_PHOTOS = 20;
const MAX_BYTES = 5 * 1024 * 1024;
const MENU_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface UserCtx {
  userId: string;
  role: string;
}

@Injectable()
export class MenuPhotosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
    private readonly media: MediaService,
  ) {}

  /** Same rules for the signed-URL step and the register step. */
  private async assertCanManage(tenantId: string, businessId: string, ctx: UserCtx) {
    await this.media.validateBusinessAccess(tenantId, businessId, ctx.userId, ctx.role);
    const business = await this.db.business.findUnique({
      where: { id: businessId },
      select: { category: { select: { slug: true, name: true } } },
    });
    if (!business || !isFoodCategory(business.category)) {
      throw new BadRequestException('Menu photos are only available for food-related businesses.');
    }
  }

  private assertFile(filename: string, mimeType: string, size: number) {
    if (!MENU_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new BadRequestException(`Menu photos must be JPG, PNG or WebP images (received ${mimeType}).`);
    }
    this.media.validateFileExtension(filename, mimeType);
    this.storage.validateFileSize(size, MAX_BYTES);
  }

  private async assertUnderLimit(businessId: string) {
    const count = await this.db.media.count({ where: { businessId, type: MENU_TYPE, deletedAt: null } });
    if (count >= MAX_MENU_PHOTOS) {
      throw new BadRequestException(
        `You can add up to ${MAX_MENU_PHOTOS} menu photos. Delete one to add another.`,
      );
    }
    return count;
  }

  /** {tenant}/menu/{business}/{label-or-filename-slug}-{unique}.{ext} */
  private buildKey(tenantId: string, businessId: string, filename: string, label?: string) {
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
    const base = (label?.trim() || filename.replace(/\.[^/.]+$/, ''))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return `${tenantId}/menu/${businessId}/${base || 'menu'}-${unique}.${ext}`;
  }

  async createUploadUrl(tenantId: string, ctx: UserCtx, dto: MenuUploadUrlDto) {
    await this.assertCanManage(tenantId, dto.businessId, ctx);
    this.assertFile(dto.filename, dto.mimeType, dto.size);
    await this.assertUnderLimit(dto.businessId);

    const fileKey = this.buildKey(tenantId, dto.businessId, dto.filename, dto.label);
    const { uploadUrl } = await this.storage.createSignedUploadUrl(BUCKET, fileKey);
    return { uploadUrl, fileKey };
  }

  async createRecord(tenantId: string, ctx: UserCtx, dto: CreateMenuPhotoDto) {
    await this.assertCanManage(tenantId, dto.businessId, ctx);
    this.assertFile(dto.filename, dto.mimeType, dto.size);

    // The key must be one we issued for THIS tenant + business — otherwise a
    // caller could register someone else's file (or any path) as their menu.
    const prefix = `${tenantId}/menu/${dto.businessId}/`;
    if (!dto.fileKey.startsWith(prefix) || dto.fileKey.includes('..')) {
      throw new BadRequestException('That file was not uploaded for this business. Please upload it again.');
    }

    const count = await this.assertUnderLimit(dto.businessId);

    // Direct-to-storage uploads are unverified until we look at the real bytes.
    await this.storage.verifyStoredFile(BUCKET, dto.fileKey, MENU_MIME_TYPES);

    const row = await this.db.media.create({
      data: {
        tenantId,
        businessId: dto.businessId,
        url: JSON.stringify({ bucket: BUCKET, path: dto.fileKey }),
        type: MENU_TYPE,
        filename: dto.filename,
        size: dto.size,
        mimeType: dto.mimeType,
        title: dto.label?.trim() || null,
        tags: ['food-menu'],
        sortOrder: count,
      },
    });
    return this.toPublic(row);
  }

  /** Public: the customer-facing menu for a business. */
  async listPublic(businessId: string) {
    const business = await this.db.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found.');

    const rows = await this.db.media.findMany({
      where: { businessId, type: MENU_TYPE, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toPublic(r));
  }

  private toPublic(row: { id: string; url: string; title: string | null; filename: string; createdAt: Date }) {
    let publicUrl = '';
    try {
      const ref = JSON.parse(row.url);
      publicUrl = this.storage.generatePublicUrl(ref.bucket, ref.path);
    } catch {
      publicUrl = row.url;
    }
    return { id: row.id, title: row.title, filename: row.filename, publicUrl, createdAt: row.createdAt };
  }
}
