import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductRepository } from '../../common/database/repositories/product.repository';
import { AuditService } from '../audit/audit.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { DatabaseService } from '../../common/database/database.service';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly auditService: AuditService,
    private readonly tenantResolver: TenantResolverService,
    private readonly db: DatabaseService,
  ) {}

  /** Accept entity.id OR business.id — same pattern as offers service */
  private async resolveBusinessId(tenantId: string, businessOrEntityId: string): Promise<string> {
    const biz = await this.db.business.findFirst({
      where: {
        tenantId,
        OR: [{ id: businessOrEntityId }, { entityId: businessOrEntityId }],
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!biz) throw new BadRequestException('Business not found for product');
    return biz.id;
  }

  async create(tenantId: string, userId: string, businessId: string, data: any) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const actualBusinessId = await this.resolveBusinessId(tenantId, businessId);

    // Only pass fields that exist in the Product schema
    const payload: any = {
      businessId: actualBusinessId,
      name: data.name,
      description: data.description?.trim() || '',
      price: parseFloat(String(data.price || '0')) || 0,
    };
    if (data.isAvailable !== undefined) payload.isAvailable = Boolean(data.isAvailable);
    if (data.sortOrder !== undefined) payload.sortOrder = Number(data.sortOrder) || 0;

    const product = await this.productRepo.create(tenantId, payload);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CREATE_PRODUCT',
      resource: 'PRODUCT',
      resourceId: product.id,
      newData: product,
    });

    return product;
  }

  async findByBusiness(tenantId: string, businessId: string, page = 1, limit = 20) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    // Resolve entity.id → actual business.id (same as create/update)
    const actualBusinessId = await this.resolveBusinessId(tenantId, businessId);
    const pagination = new PaginationParamsDto();
    pagination.page = page;
    pagination.limit = limit;
    pagination.sortBy = 'sortOrder';
    pagination.sortOrder = SortOrder.ASC;

    return this.productRepo.findMany(tenantId, { businessId: actualBusinessId }, pagination);
  }

  async findById(tenantId: string, id: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const product = await this.productRepo.findOne(tenantId, id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(tenantId: string, id: string, userId: string, data: any) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const existing = await this.productRepo.findOne(tenantId, id);
    if (!existing) throw new NotFoundException('Product not found');

    // Strip to valid fields only
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.description !== undefined) payload.description = data.description || '';
    if (data.price !== undefined) payload.price = parseFloat(String(data.price)) || 0;
    if (data.isAvailable !== undefined) payload.isAvailable = Boolean(data.isAvailable);
    if (data.sortOrder !== undefined) payload.sortOrder = Number(data.sortOrder) || 0;

    const updated = await this.productRepo.update(tenantId, id, payload);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPDATE_PRODUCT',
      resource: 'PRODUCT',
      resourceId: id,
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async softDelete(tenantId: string, id: string, userId: string) {
    const existing = await this.productRepo.findOne(tenantId, id);
    if (!existing) throw new NotFoundException('Product not found');

    const deleted = await this.productRepo.softDelete(tenantId, id);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'DELETE_PRODUCT',
      resource: 'PRODUCT',
      resourceId: id,
    });

    return deleted;
  }
}
