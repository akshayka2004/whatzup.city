import { Injectable, NotFoundException, ForbiddenException, Logger, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Resolve a businessId — accepts either business.id OR entity.id (JWT stores
   * entity.id for business users). Returns the matching Business or throws.
   */
  private async resolveBusiness(tenantId: string, businessOrEntityId: string, userId: string) {
    const business = await this.db.business.findFirst({
      where: {
        tenantId,
        OR: [{ id: businessOrEntityId }, { entityId: businessOrEntityId }],
        deletedAt: null,
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    // Owner check — business owner OR staff with OWNER role
    if (business.ownerId !== userId) {
      const staff = await this.db.businessStaff.findFirst({
        where: { tenantId, businessId: business.id, userId, deletedAt: null },
      });
      if (!staff) throw new ForbiddenException('Not authorized to manage branches of this business');
    }
    return business;
  }

  private parseCoords(geoCoords?: string): { latitude?: number; longitude?: number } {
    if (!geoCoords) return {};
    const parts = geoCoords.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { latitude: parts[0], longitude: parts[1] };
    }
    return {};
  }

  async findByBusiness(tenantId: string, businessOrEntityId: string, userId: string) {
    const business = await this.resolveBusiness(tenantId, businessOrEntityId, userId);
    return this.db.businessBranch.findMany({
      where: { tenantId, businessId: business.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, businessOrEntityId: string, userId: string, data: any) {
    const business = await this.resolveBusiness(tenantId, businessOrEntityId, userId);
    const { latitude, longitude } = this.parseCoords(data.geoCoords);

    // If branch admin credentials provided, validate email uniqueness before creating branch
    const adminEmail = data.adminEmail?.trim().toLowerCase();
    const adminPassword = data.adminPassword;
    if (adminEmail && adminPassword) {
      const existing = await this.db.user.findFirst({ where: { email: adminEmail, deletedAt: null } });
      if (existing) throw new ConflictException(`A user with email "${adminEmail}" already exists`);
    }

    const branch = await this.db.businessBranch.create({
      data: {
        tenantId,
        businessId: business.id,
        name: data.name,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        phone: data.phone || null,
        email: data.email || null,
        managerName: data.managerName || data.adminName || null,
        managerPhone: data.managerPhone || null,
        managerEmail: data.managerEmail || adminEmail || null,
        operatingHours: data.operatingHours || data.hours || null,
        latitude,
        longitude,
        isActive: data.isActive !== false,
      },
    });

    // Auto-create branch admin user if credentials were supplied
    if (adminEmail && adminPassword) {
      try {
        const passwordHash = await this.passwordService.hash(adminPassword);
        const adminUser = await this.db.user.create({
          data: {
            tenantId,
            email: adminEmail,
            passwordHash,
            name: (data.adminName || data.managerName || 'Branch Admin').trim(),
            phone: data.adminPhone || data.managerPhone || null,
            role: 'BUSINESS_STAFF' as any,
            isActive: true,
            emailVerified: true,
          },
        });

        await this.db.businessStaff.create({
          data: {
            tenantId,
            businessId: business.id,
            userId: adminUser.id,
            role: 'STAFF' as any,
            isActive: true,
          },
        });

        this.logger.log(`Branch admin user created: ${adminEmail} for branch ${branch.id}`);
      } catch (err: any) {
        this.logger.error(`Failed to create branch admin user: ${err.message}`);
        // Non-fatal — branch was created, admin user creation is best-effort
      }
    }

    await this.audit.log({
      tenantId,
      userId,
      action: 'CREATE_BRANCH',
      resource: 'BUSINESS_BRANCH',
      resourceId: branch.id,
      newData: { ...branch, adminEmail: adminEmail || undefined },
    });

    return branch;
  }

  async update(tenantId: string, branchId: string, userId: string, data: any) {
    const existing = await this.db.businessBranch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Branch not found');

    // Ensure user owns the parent business
    await this.resolveBusiness(tenantId, existing.businessId, userId);

    const { latitude, longitude } = this.parseCoords(data.geoCoords);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.managerName !== undefined) updateData.managerName = data.managerName;
    if (data.managerPhone !== undefined) updateData.managerPhone = data.managerPhone;
    if (data.managerEmail !== undefined) updateData.managerEmail = data.managerEmail;
    if (data.operatingHours !== undefined || data.hours !== undefined) {
      updateData.operatingHours = data.operatingHours ?? data.hours;
    }
    if (data.geoCoords !== undefined) {
      updateData.latitude = latitude;
      updateData.longitude = longitude;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const branch = await this.db.businessBranch.update({
      where: { id: branchId },
      data: updateData,
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'UPDATE_BRANCH',
      resource: 'BUSINESS_BRANCH',
      resourceId: branchId,
      oldData: existing,
      newData: branch,
    });

    return branch;
  }

  async remove(tenantId: string, branchId: string, userId: string) {
    const existing = await this.db.businessBranch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Branch not found');
    await this.resolveBusiness(tenantId, existing.businessId, userId);

    await this.db.businessBranch.update({
      where: { id: branchId },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'DELETE_BRANCH',
      resource: 'BUSINESS_BRANCH',
      resourceId: branchId,
    });

    return { success: true };
  }

  async getPerformance(tenantId: string, branchId: string, userId: string, days = 30) {
    const branch = await this.db.businessBranch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    await this.resolveBusiness(tenantId, branch.businessId, userId);

    const since = new Date(Date.now() - days * 86_400_000);

    // Pull from analyticsEvent table — events scoped to parent business since
    // events are not branch-tagged in the current schema.
    const events = await this.db.analyticsEvent.groupBy({
      by: ['event'],
      where: {
        tenantId,
        businessId: branch.businessId,
        createdAt: { gte: since },
      },
      _count: true,
    });

    return {
      branch,
      events,
      windowDays: days,
    };
  }
}
