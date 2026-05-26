import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';

type StaffRole = 'BUSINESS_OWNER' | 'BUSINESS_ADMIN' | 'BUSINESS_MODERATOR' | 'BUSINESS_STAFF';

@Injectable()
export class TeamService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Resolve businessId — accept either business.id OR entity.id. Caller must be
   * the business owner.
   */
  private async resolveBusinessForOwner(tenantId: string, businessOrEntityId: string, userId: string) {
    const business = await this.db.business.findFirst({
      where: {
        tenantId,
        OR: [{ id: businessOrEntityId }, { entityId: businessOrEntityId }],
        deletedAt: null,
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId) {
      throw new ForbiddenException('Only the business owner can manage team members');
    }
    return business;
  }

  async listMembers(tenantId: string, businessOrEntityId: string, userId: string) {
    const business = await this.resolveBusinessForOwner(tenantId, businessOrEntityId, userId);
    const staff = await this.db.businessStaff.findMany({
      where: { tenantId, businessId: business.id, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, lastLoginAt: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return staff.map((s) => ({
      id: s.id,
      userId: s.userId,
      role: s.role,
      isActive: s.isActive,
      name: s.user?.name || '',
      email: s.user?.email || '',
      avatar: s.user?.avatar || '',
      lastActive: s.user?.lastLoginAt,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Admin creates a new account for a team member. The admin specifies email +
   * temp password. The team member uses these credentials to log in.
   */
  async createMember(
    tenantId: string,
    businessOrEntityId: string,
    actingUserId: string,
    data: { name: string; email: string; password: string; role: StaffRole; phone?: string },
  ) {
    if (!data.email || !data.password || !data.name) {
      throw new BadRequestException('Name, email and password are required');
    }
    if (data.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const business = await this.resolveBusinessForOwner(tenantId, businessOrEntityId, actingUserId);
    const emailNormalized = data.email.trim().toLowerCase();

    const existingUser = await this.db.user.findFirst({
      where: { email: emailNormalized, deletedAt: null },
    });
    if (existingUser) {
      throw new ConflictException('A user account with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(data.password);

    // Map frontend role to BusinessMemberRole
    const memberRole = data.role === 'BUSINESS_OWNER' || data.role === 'BUSINESS_ADMIN'
      ? 'OWNER'
      : data.role === 'BUSINESS_MODERATOR'
        ? 'MODERATOR'
        : 'STAFF';

    // Set the User.role to the correct business role so login redirects to /dashboard
    // and businessId resolves correctly from the JWT/me endpoint.
    const userRoleEnum = memberRole === 'OWNER'
      ? 'BUSINESS_OWNER'
      : memberRole === 'MODERATOR'
        ? 'BUSINESS_MODERATOR'
        : 'BUSINESS_STAFF';

    // Create user — pre-verified so they can sign in immediately.
    const user = await this.db.user.create({
      data: {
        tenantId,
        email: emailNormalized,
        passwordHash,
        name: data.name.trim(),
        phone: data.phone || null,
        role: userRoleEnum as any,
        isActive: true,
        emailVerified: true,
      },
    });

    const staff = await this.db.businessStaff.create({
      data: {
        tenantId,
        businessId: business.id,
        userId: user.id,
        role: memberRole as any,
      },
    });

    await this.audit.log({
      tenantId,
      userId: actingUserId,
      action: 'CREATE_TEAM_MEMBER',
      resource: 'BUSINESS_STAFF',
      resourceId: staff.id,
      newData: { userId: user.id, businessId: business.id, role: memberRole },
    });

    return {
      id: staff.id,
      userId: user.id,
      role: memberRole,
      isActive: true,
      name: user.name,
      email: user.email,
      createdAt: staff.createdAt,
    };
  }

  async removeMember(tenantId: string, staffId: string, actingUserId: string) {
    const staff = await this.db.businessStaff.findFirst({
      where: { id: staffId, tenantId, deletedAt: null },
    });
    if (!staff) throw new NotFoundException('Team member not found');

    await this.resolveBusinessForOwner(tenantId, staff.businessId, actingUserId);

    await this.db.businessStaff.update({
      where: { id: staffId },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.log({
      tenantId,
      userId: actingUserId,
      action: 'REMOVE_TEAM_MEMBER',
      resource: 'BUSINESS_STAFF',
      resourceId: staffId,
    });

    return { success: true };
  }
}
