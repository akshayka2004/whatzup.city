import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async getMe(userId: string, tenantId: string) {
    const user = await this.db.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        emailVerified: true,
        referralCode: true,
        createdAt: true,
        customerProfile: true,
      },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const progress = await this.db.onboardingProgress.findUnique({
      where: {
        tenantId_entityType_entityId: { tenantId, entityType: 'CUSTOMER', entityId: userId },
      },
    });

    return { user, onboardingProgress: progress };
  }

  async updateMe(userId: string, tenantId: string, dto: UpdateCustomerDto) {
    const customer = await this.db.customer.findFirst({
      where: { tenantId, userId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer profile not found');

    if (dto.phone && dto.phone !== customer.phone) {
      const duplicate = await this.db.customer.findFirst({
        where: { tenantId, phone: dto.phone, deletedAt: null, NOT: { userId } },
      });
      if (duplicate) throw new ConflictException('Phone number already registered');
    }

    const firstName = dto.firstName ?? customer.firstName;
    const lastName = dto.lastName ?? customer.lastName;
    const name = `${firstName} ${lastName}`.trim();
    const preferences = (dto.preferences ?? customer.preferences ?? {}) as any;

    const [updatedUser, updatedCustomer] = await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: {
          name,
          phone: dto.phone,
          avatar: dto.avatar,
          updatedBy: userId,
        },
      }),
      this.db.customer.update({
        where: { id: customer.id },
        data: {
          firstName,
          lastName,
          phone: dto.phone,
          avatar: dto.avatar,
          city: dto.city,
          district: dto.district,
          state: dto.state,
          preferences,
          updatedBy: userId,
        },
      }),
      this.db.onboardingProgress.updateMany({
        where: { tenantId, entityType: 'CUSTOMER', entityId: userId },
        data: {
          metadata: {
            city: dto.city ?? customer.city,
            district: dto.district ?? customer.district,
            state: dto.state ?? customer.state,
            preferences,
          },
        },
      }),
    ]);

    await this.audit.log({
      tenantId,
      userId,
      action: 'CUSTOMER_PROFILE_UPDATED',
      resource: 'CUSTOMER',
      resourceId: customer.id,
      oldData: customer,
      newData: updatedCustomer,
    });

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
      customer: updatedCustomer,
    };
  }
}
