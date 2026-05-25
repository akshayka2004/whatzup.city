import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../common/database/repositories/product.repository';
import { AuditService } from '../audit/audit.service';
import { TenantResolverService } from '../../common/database/tenant-resolver.service';
import { PaginationParamsDto, SortOrder } from '../../common/database/pagination/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly auditService: AuditService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  async create(tenantId: string, userId: string, businessId: string, data: any) {
    const product = await this.productRepo.create(tenantId, { businessId, ...data });

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
    const pagination = new PaginationParamsDto();
    pagination.page = page;
    pagination.limit = limit;
    pagination.sortBy = 'sortOrder';
    pagination.sortOrder = SortOrder.ASC;

    return this.productRepo.findMany(tenantId, { businessId }, pagination);
  }

  async findById(tenantId: string, id: string) {
    tenantId = await this.tenantResolver.resolveTenantId(tenantId);
    const product = await this.productRepo.findOne(tenantId, id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(tenantId: string, id: string, userId: string, data: any) {
    const existing = await this.productRepo.findOne(tenantId, id);
    if (!existing) throw new NotFoundException('Product not found');

    const updated = await this.productRepo.update(tenantId, id, data);

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
