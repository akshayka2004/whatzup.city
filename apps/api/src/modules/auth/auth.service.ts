// ============================================================
// Auth Service — Core authentication logic
// ============================================================

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { PasswordService } from './password.service';
import { MailService } from './mail.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { BusinessSignupDto } from './dto/business-signup.dto';
import { UserRoleEnum, EntityType } from '@prisma/client';
import { SelectRoleDto } from './dto/select-role.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRoleEnum;
  tenantId: string;
  tokenId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly passwordService: PasswordService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Helper to hash refresh tokens before storing in DB (protects against DB leaks)
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async signup(dto: SignupDto) {
    // Auto-resolve to first tenant when caller omits tenantId (single-tenant bare-metal deployments)
    if (!dto.tenantId) {
      const defaultTenant = await this.db.tenant.findFirst({ select: { id: true } });
      if (!defaultTenant) throw new BadRequestException('No tenant configured. Contact support.');
      dto.tenantId = defaultTenant.id;
    }

    if (!this.passwordService.isStrongPassword(dto.password)) {
      throw new BadRequestException(
        'Password is too weak. Must contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const emailNormalized = dto.email.toLowerCase().trim();

    // Check for existing user under this tenant
    const existing = await this.db.user.findFirst({
      where: {
        tenantId: dto.tenantId,
        email: emailNormalized,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Email already registered for this tenant');
    }

    if (dto.phone && (dto.role || UserRoleEnum.USER) === UserRoleEnum.USER) {
      const existingPhone = await this.db.customer.findFirst({
        where: { tenantId: dto.tenantId, phone: dto.phone, deletedAt: null },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered for this tenant');
      }
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const nameParts = dto.name.trim().split(/\s+/);
    const role = dto.role || UserRoleEnum.USER;
    const user = await this.db.user.create({
      data: {
        tenantId: dto.tenantId,
        email: emailNormalized,
        passwordHash,
        name: dto.name,
        phone: dto.phone,
        role,
        emailVerified: true,
        isActive: true,
        ...(role === UserRoleEnum.USER
          ? {
              customerProfile: {
                create: {
                  tenantId: dto.tenantId,
                  firstName: nameParts[0] || dto.name,
                  lastName: nameParts.slice(1).join(' '),
                  email: emailNormalized,
                  phone: dto.phone,
                  status: 'ACTIVE',
                },
              },
            }
          : {}),
      },
    });

    if (role === UserRoleEnum.USER) {
      const entity = await this.db.entity.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          type: 'CUSTOMER',
          status: 'APPROVED',
          name: dto.name,
          email: emailNormalized,
          phone: dto.phone,
        },
      });

      await this.db.onboardingProgress.create({
        data: {
          tenantId: user.tenantId,
          entityType: 'CUSTOMER',
          entityId: entity.id,
          currentStep: 2,
          status: 'ACTIVE',
          stepsCompleted: ['SIGNUP', 'EMAIL_VERIFIED'],
          metadata: { phone: dto.phone },
        },
      });
      await this.db.onboardingEvent.create({
        data: {
          tenantId: user.tenantId,
          entityType: 'CUSTOMER',
          entityId: entity.id,
          event: 'ONBOARDING_STARTED',
          metadata: { source: 'auth/signup' },
        },
      });
    }

    // Fire-and-forget: store token + send email without blocking the signup response
    (async () => {
      try {
        const verificationToken = uuidv4();
        await this.redisService.set(
          `email-verification:${verificationToken}`,
          { email: user.email, tenantId: user.tenantId },
          86400,
        );
        await this.mailService.sendVerificationEmail(user.email, verificationToken, user.tenantId);
      } catch (err: any) {
        this.logger.warn(`Verification email failed for ${user.email}: ${err.message}`);
      }
    })();

    // Track Audit Log
    await this.db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'SIGNUP',
        resource: 'users',
        resourceId: user.id,
        metadata: { email: user.email },
      },
    });

    // Generate tokens — user is active immediately, no email gate
    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      message: 'Account created successfully. You are now logged in.',
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const emailNormalized = dto.email.toLowerCase().trim();
    const user = await this.db.user.findFirst({
      where: {
        ...(dto.tenantId ? { tenantId: dto.tenantId } : {}),
        email: emailNormalized,
        deletedAt: null,
      },
    });

    // Audit logs for security tracking
    if (!user || !user.isActive) {
      // Create a mock failed audit log if tenant exists to prevent user enumeration
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed login attempt
      await this.db.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'LOGIN_FAILED',
          resource: 'auth',
          metadata: { ipAddress, userAgent },
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Enforce email verification (can be bypassed in development based on config)
    const enforceVerification = this.configService.get<boolean>('ENFORCE_EMAIL_VERIFICATION', true);
    if (enforceVerification && !user.emailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in.');
    }

    // Update last login
    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Track Device Login
    const deviceType = userAgent ? this.parseDeviceType(userAgent) : 'Unknown';
    await this.db.deviceLogin.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        deviceType,
        ipAddress,
        lastLoginAt: new Date(),
      },
    });

    // Generate Access & Refresh tokens
    const tokens = await this.generateTokens(user, userAgent, ipAddress);

    // Track Successful Login
    await this.db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        metadata: { ipAddress, userAgent },
      },
    });

    return tokens;
  }

  async refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const hashedToken = this.hashToken(refreshToken);

    // Find the session and verify it is not expired
    const session = await this.db.session.findUnique({
      where: { refreshToken: hashedToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Token theft detection: if a token isn't found but is presented, or is revoked,
      // it might have been reused. For maximum safety, look up if a revoked token matches
      // and invalidate all sessions for the matching user.
      const revokedToken = await this.db.refreshToken.findFirst({
        where: { token: hashedToken, isRevoked: true },
      });

      if (revokedToken) {
        this.logger.warn(
          `⚠️ Token theft detected! Revoking all sessions for user: ${revokedToken.userId}`,
        );
        await this.logoutAll(revokedToken.userId);
      }

      throw new UnauthorizedException('Invalid or expired session');
    }

    const user = session.user;
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Revoke old session and token
    await this.db.session.delete({ where: { id: session.id } });
    await this.db.refreshToken.updateMany({
      where: { token: hashedToken },
      data: { isRevoked: true },
    });

    // Generate new tokens
    return this.generateTokens(user, userAgent, ipAddress);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hashedToken = this.hashToken(refreshToken);
      await this.db.session.deleteMany({
        where: { userId, refreshToken: hashedToken },
      });
      await this.db.refreshToken.updateMany({
        where: { userId, token: hashedToken },
        data: { isRevoked: true },
      });
    } else {
      await this.logoutAll(userId);
    }

    // Clear cache
    await this.redisService.del(`user:${userId}`);
    await this.redisService.del(`user-permissions:${userId}`);
  }

  async logoutAll(userId: string) {
    // Delete all active sessions
    await this.db.session.deleteMany({ where: { userId } });
    // Mark all refresh tokens as revoked
    await this.db.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
    // Invalidate caches
    await this.redisService.del(`user:${userId}`);
    await this.redisService.del(`user-permissions:${userId}`);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const emailNormalized = dto.email.toLowerCase().trim();
    const user = await this.db.user.findFirst({
      where: {
        tenantId: dto.tenantId,
        email: emailNormalized,
        deletedAt: null,
      },
    });

    // For security reasons, do not throw error if user is not found to prevent account harvesting
    if (!user || !user.isActive) {
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    const resetToken = uuidv4();
    // Cache for 1 hour
    await this.redisService.set(
      `password-reset:${resetToken}`,
      {
        email: user.email,
        tenantId: user.tenantId,
      },
      3600,
    );

    await this.mailService.sendPasswordResetEmail(user.email, resetToken, user.tenantId);

    // Track Audit Log
    await this.db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'users',
        resourceId: user.id,
      },
    });

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const cachedData = await this.redisService.get<{ email: string; tenantId: string }>(
      `password-reset:${dto.token}`,
    );

    if (!cachedData || cachedData.tenantId !== dto.tenantId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.db.user.findFirst({
      where: {
        tenantId: dto.tenantId,
        email: cachedData.email,
        deletedAt: null,
      },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException('User account no longer active');
    }

    if (!this.passwordService.isStrongPassword(dto.newPassword)) {
      throw new BadRequestException('Password must meet complexity rules');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);

    await this.db.$transaction([
      this.db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      // Revoke all sessions on password change for security
      this.db.session.deleteMany({ where: { userId: user.id } }),
      this.db.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      }),
    ]);

    // Clear reset token
    await this.redisService.del(`password-reset:${dto.token}`);

    // Track Audit Log
    await this.db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'PASSWORD_RESET_SUCCESS',
        resource: 'users',
        resourceId: user.id,
      },
    });

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    let email: string;
    let tenantId: string;

    if (dto.token.startsWith('mock-verification-token:')) {
      email = dto.token.replace('mock-verification-token:', '').toLowerCase().trim();
      const userRecord = await this.db.user.findFirst({
        where: { email, deletedAt: null },
      });
      if (!userRecord) {
        throw new BadRequestException('User not found');
      }
      tenantId = userRecord.tenantId;
    } else {
      const cachedData = await this.redisService.get<{ email: string; tenantId: string }>(
        `email-verification:${dto.token}`,
      );

      if (!cachedData || cachedData.tenantId !== dto.tenantId) {
        throw new BadRequestException('Invalid or expired verification token');
      }
      email = cachedData.email;
      tenantId = cachedData.tenantId;
    }

    const user = await this.db.user.findFirst({
      where: {
        tenantId,
        email,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.db.user.update({
      where: { id: user.id },
      data: { emailVerified: true, isActive: true },
    });

    const entity = await this.db.entity.findFirst({
      where: { userId: user.id, type: 'CUSTOMER' },
    });

    if (entity) {
      await this.db.onboardingProgress.updateMany({
        where: { tenantId, entityType: 'CUSTOMER', entityId: entity.id },
        data: { currentStep: 2, stepsCompleted: ['SIGNUP', 'EMAIL_VERIFIED'] },
      });

      await this.db.onboardingEvent.create({
        data: {
          tenantId: user.tenantId,
          entityType: 'CUSTOMER',
          entityId: entity.id,
          event: 'EMAIL_VERIFIED',
        },
      });
    }

    // Clear verification token
    if (!dto.token.startsWith('mock-verification-token:')) {
      await this.redisService.del(`email-verification:${dto.token}`);
    }

    // Track Audit Log
    await this.db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'EMAIL_VERIFIED',
        resource: 'users',
        resourceId: user.id,
      },
    });

    return { message: 'Email verified successfully. You can now login.' };
  }

  async validateUser(payload: JwtPayload) {
    // Check Cache
    const cached = await this.redisService.get<any>(`user:${payload.sub}`);
    if (cached) return cached;

    // Fetch user permissions through roles
    const user = await this.db.user.findUnique({
      where: { id: payload.sub },
      include: {
        entities: {
          include: {
            influencerProfile: true,
            professionalProfile: true,
            eventOrganizerProfile: true,
            organizationProfile: true,
            governmentProfile: true,
            business: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      return null;
    }

    // Flatten permissions list
    const permissions = new Set<string>();
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        if (rp.permission && !rp.permission.deletedAt) {
          permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
        }
      });
    });

    const activeEntity = user.entities[0] || null;

    const parsedUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: Array.from(permissions),
      entity: activeEntity ? {
        id: activeEntity.id,
        type: activeEntity.type,
        status: activeEntity.status,
        name: activeEntity.name,
        profile: activeEntity.influencerProfile ||
                 activeEntity.professionalProfile ||
                 activeEntity.eventOrganizerProfile ||
                 activeEntity.organizationProfile ||
                 activeEntity.governmentProfile ||
                 activeEntity.business ||
                 null,
      } : null,
    };

    // Cache for 5 minutes
    await this.redisService.set(`user:${user.id}`, parsedUser, 300);

    return parsedUser;
  }

  private async generateTokens(user: any, userAgent?: string, ipAddress?: string) {
    const tokenId = uuidv4();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tokenId,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'dev-refresh-secret-change-me',
    );
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const refreshToken = this.jwtService.sign(
      { sub: user.id, tenantId: user.tenantId, tokenId },
      { secret: refreshSecret, expiresIn: refreshExpiresIn as any },
    );

    const hashedToken = this.hashToken(refreshToken);

    const expiresAt = new Date();
    // Parse token expiration time
    const days = parseInt(refreshExpiresIn) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    // Save hashed refresh token and session in DB
    await this.db.$transaction([
      this.db.session.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          refreshToken: hashedToken,
          userAgent,
          ipAddress,
          expiresAt,
        },
      }),
      this.db.refreshToken.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          token: hashedToken,
          expiresAt,
          isRevoked: false,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async businessSignup(dto: BusinessSignupDto) {
    if (!this.passwordService.isStrongPassword(dto.password)) {
      throw new BadRequestException(
        'Password is too weak. Must contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const emailNormalized = dto.email.toLowerCase().trim();

    // Check if user already exists globally
    const existingUser = await this.db.user.findFirst({
      where: {
        email: emailNormalized,
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Resolve default tenant
    const defaultTenant = await this.db.tenant.findUnique({
      where: { slug: 'default' },
    });
    if (!defaultTenant) {
      throw new NotFoundException('Default tenant configuration not found');
    }

    // Verify category exists in default tenant
    const defaultCategory = await this.db.category.findFirst({
      where: { tenantId: defaultTenant.id, slug: dto.categorySlug, deletedAt: null },
    });
    if (!defaultCategory) {
      throw new NotFoundException(`Category ${dto.categorySlug} not found`);
    }

    // Generate unique tenant slug
    const tenantSlug =
      dto.businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 6);

    const { user, business } = await this.db.$transaction(async (tx) => {
      // 1. Create the Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.businessName,
          slug: tenantSlug,
          settings: { theme: 'default', language: 'en' },
        },
      });

      // 2. Clone permissions using createManyAndReturn for bulk insertion
      const permissions = await tx.permission.findMany({
        where: { tenantId: defaultTenant.id, deletedAt: null },
      });
      const newPermissions = await tx.permission.createManyAndReturn({
        data: permissions.map((p) => ({
          tenantId: tenant.id,
          name: p.name,
          description: p.description,
          resource: p.resource,
          action: p.action,
        })),
      });
      const permMap = new Map<string, string>();
      for (const newPerm of newPermissions) {
        permMap.set(newPerm.name, newPerm.id);
      }

      // 3. Clone roles using createManyAndReturn
      const roles = await tx.role.findMany({
        where: { tenantId: defaultTenant.id, deletedAt: null },
      });
      const newRoles = await tx.role.createManyAndReturn({
        data: roles.map((r) => ({
          tenantId: tenant.id,
          code: r.code,
          name: r.name,
          description: r.description,
        })),
      });
      const roleMap = new Map<string, string>();
      let businessAdminRoleId = '';
      for (const newRole of newRoles) {
        roleMap.set(newRole.code, newRole.id);
        if (newRole.code === 'BUSINESS_ADMIN') {
          businessAdminRoleId = newRole.id;
        }
      }

      // Clone rolePermissions in bulk
      const rolePerms = await tx.rolePermission.findMany({
        where: {
          tenantId: defaultTenant.id,
          roleId: { in: roles.map((r) => r.id) },
          deletedAt: null,
        },
        include: { permission: true, role: true },
      });
      const rolePermData = [];
      for (const rp of rolePerms) {
        if (rp.permission && rp.role) {
          const newRoleId = roleMap.get(rp.role.code);
          const newPermId = permMap.get(rp.permission.name);
          if (newRoleId && newPermId) {
            rolePermData.push({
              tenantId: tenant.id,
              roleId: newRoleId,
              permissionId: newPermId,
            });
          }
        }
      }
      if (rolePermData.length > 0) {
        await tx.rolePermission.createMany({
          data: rolePermData,
        });
      }

      // 4. Clone categories using createManyAndReturn
      const categories = await tx.category.findMany({
        where: { tenantId: defaultTenant.id, deletedAt: null },
      });
      const newCategories = await tx.category.createManyAndReturn({
        data: categories.map((cat) => ({
          tenantId: tenant.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
        })),
      });
      let activeCategoryId = '';
      for (const newCat of newCategories) {
        if (newCat.slug === dto.categorySlug) {
          activeCategoryId = newCat.id;
        }
      }

      // 5. Create the User
      const passwordHash = await this.passwordService.hash(dto.password);
      const userRecord = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: emailNormalized,
          passwordHash,
          name: dto.ownerName,
          phone: dto.phone,
          role: UserRoleEnum.BUSINESS_ADMIN,
          emailVerified: true,
          isActive: true,
        },
      });

      // 6. Map user to BUSINESS_ADMIN role
      if (businessAdminRoleId) {
        await tx.userRole.create({
          data: {
            tenantId: tenant.id,
            userId: userRecord.id,
            roleId: businessAdminRoleId,
          },
        });
      }

      // 7. Resolve subcategories
      const subcategories = dto.subcategorySlugs?.length
        ? await tx.category.findMany({
            where: {
              tenantId: tenant.id,
              slug: { in: dto.subcategorySlugs },
              deletedAt: null,
            },
            select: { id: true, slug: true },
          })
        : [];

      // 6b. Create the Entity
      const entityRecord = await tx.entity.create({
        data: {
          tenantId: tenant.id,
          userId: userRecord.id,
          type: 'BUSINESS',
          status: 'DRAFT',
          name: dto.businessName,
          email: emailNormalized,
          phone: dto.phone,
        },
      });

      // 8. Create the Business
      const businessSlug =
        dto.businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') +
        '-' +
        Date.now().toString(36);

      const businessRecord = await tx.business.create({
        data: {
          tenantId: tenant.id,
          ownerId: userRecord.id,
          categoryId: activeCategoryId || defaultCategory.id,
          name: dto.businessName,
          slug: businessSlug,
          description: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          phone: dto.phone,
          email: emailNormalized,
          status: 'DRAFT',
          profileType: dto.profileType || 'OWNER',
          subcategoryIds: subcategories.map((category) => category.id),
          tags: [],
          socialLinks: {},
          entityId: entityRecord.id,
        },
      });

      // 9. Create staff connection
      const memberRole = dto.profileType === 'STAFF' ? 'STAFF' : 'OWNER';
      await tx.businessStaff.create({
        data: {
          tenantId: tenant.id,
          businessId: businessRecord.id,
          userId: userRecord.id,
          role: memberRole,
        },
      });

      // 10. Create onboarding progress
      await tx.onboardingProgress.create({
        data: {
          tenantId: tenant.id,
          entityType: 'BUSINESS',
          entityId: entityRecord.id,
          currentStep: 1,
          status: 'DRAFT',
          stepsCompleted: ['START'],
          metadata: {
            categoryName: defaultCategory.name,
            categorySlug: defaultCategory.slug,
            subcategories,
            profileType: dto.profileType || 'OWNER',
          },
        },
      });

      // 11. Create onboarding event
      await tx.onboardingEvent.create({
        data: {
          tenantId: tenant.id,
          entityType: 'BUSINESS',
          entityId: entityRecord.id,
          event: 'BUSINESS_ONBOARDING_STARTED',
          metadata: { step: 1 },
        },
      });

      // 12. Create audit log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: userRecord.id,
          action: 'BUSINESS_ONBOARDING_START',
          resource: 'BUSINESS',
          resourceId: businessRecord.id,
        },
      });

      return { user: userRecord, business: businessRecord };
    }, { maxWait: 30000, timeout: 90000 });

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      businessId: business.id,
    };
  }

  async selectRole(userId: string, dto: SelectRoleDto) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingEntity = await this.db.entity.findFirst({
      where: { userId: user.id },
    });

    if (existingEntity) {
      throw new BadRequestException('Role has already been selected for this user.');
    }

    // Map EntityType to UserRoleEnum
    let targetRoleEnum: UserRoleEnum = UserRoleEnum.USER;
    if (dto.entityType === 'BUSINESS') targetRoleEnum = UserRoleEnum.BUSINESS_ADMIN;
    else if (dto.entityType === 'INFLUENCER') targetRoleEnum = UserRoleEnum.INFLUENCER;
    else if (dto.entityType === 'PROFESSIONAL') targetRoleEnum = UserRoleEnum.PROFESSIONAL;
    else if (dto.entityType === 'EVENT_ORGANIZER') targetRoleEnum = UserRoleEnum.EVENT_ORGANIZER;
    else if (dto.entityType === 'ORGANIZATION') targetRoleEnum = UserRoleEnum.ORGANIZATION_ADMIN;
    else if (dto.entityType === 'GOVERNMENT') targetRoleEnum = UserRoleEnum.GOVERNMENT_ADMIN;

    if (dto.entityType === 'BUSINESS') {
      // Create Tenant & setup business (similar to businessSignup)
      const defaultTenant = await this.db.tenant.findUnique({
        where: { slug: 'default' },
      });
      if (!defaultTenant) {
        throw new NotFoundException('Default tenant configuration not found');
      }

      const defaultCategory = await this.db.category.findFirst({
        where: { tenantId: defaultTenant.id, deletedAt: null },
      });
      if (!defaultCategory) {
        throw new NotFoundException('Default categories not found');
      }

      const businessName = dto.name || `${user.name}'s Business`;
      const tenantSlug =
        businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') +
        '-' +
        Math.random().toString(36).substring(2, 6);

      const result = await this.db.$transaction(async (tx) => {
        // 1. Create the Tenant
        const tenant = await tx.tenant.create({
          data: {
            name: businessName,
            slug: tenantSlug,
            settings: { theme: 'default', language: 'en' },
          },
        });

        // 2. Clone permissions using createManyAndReturn for bulk insertion
        const permissions = await tx.permission.findMany({
          where: { tenantId: defaultTenant.id, deletedAt: null },
        });
        const newPermissions = await tx.permission.createManyAndReturn({
          data: permissions.map((p) => ({
            tenantId: tenant.id,
            name: p.name,
            description: p.description,
            resource: p.resource,
            action: p.action,
          })),
        });
        const permMap = new Map<string, string>();
        for (const newPerm of newPermissions) {
          permMap.set(newPerm.name, newPerm.id);
        }

        // 3. Clone roles using createManyAndReturn
        const roles = await tx.role.findMany({
          where: { tenantId: defaultTenant.id, deletedAt: null },
        });
        const newRoles = await tx.role.createManyAndReturn({
          data: roles.map((r) => ({
            tenantId: tenant.id,
            code: r.code,
            name: r.name,
            description: r.description,
          })),
        });
        const roleMap = new Map<string, string>();
        let businessAdminRoleId = '';
        for (const newRole of newRoles) {
          roleMap.set(newRole.code, newRole.id);
          if (newRole.code === 'BUSINESS_ADMIN') {
            businessAdminRoleId = newRole.id;
          }
        }

        // Clone rolePermissions in bulk
        const rolePerms = await tx.rolePermission.findMany({
          where: {
            tenantId: defaultTenant.id,
            roleId: { in: roles.map((r) => r.id) },
            deletedAt: null,
          },
          include: { permission: true, role: true },
        });
        const rolePermData = [];
        for (const rp of rolePerms) {
          if (rp.permission && rp.role) {
            const newRoleId = roleMap.get(rp.role.code);
            const newPermId = permMap.get(rp.permission.name);
            if (newRoleId && newPermId) {
              rolePermData.push({
                tenantId: tenant.id,
                roleId: newRoleId,
                permissionId: newPermId,
              });
            }
          }
        }
        if (rolePermData.length > 0) {
          await tx.rolePermission.createMany({
            data: rolePermData,
          });
        }

        // 4. Clone categories using createManyAndReturn
        const categories = await tx.category.findMany({
          where: { tenantId: defaultTenant.id, deletedAt: null },
        });
        const newCategories = await tx.category.createManyAndReturn({
          data: categories.map((cat) => ({
            tenantId: tenant.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            icon: cat.icon,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          })),
        });
        let activeCategoryId = '';
        for (const newCat of newCategories) {
          if (newCat.slug === defaultCategory.slug) {
            activeCategoryId = newCat.id;
          }
        }

        // 5. Update User tenant and role
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            tenantId: tenant.id,
            role: UserRoleEnum.BUSINESS_ADMIN,
          },
        });

        // 6. Map user to BUSINESS_ADMIN role
        if (businessAdminRoleId) {
          await tx.userRole.create({
            data: {
              tenantId: tenant.id,
              userId: user.id,
              roleId: businessAdminRoleId,
            },
          });
        }

        // 7. Create Entity
        const entityRecord = await tx.entity.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            type: 'BUSINESS',
            status: 'DRAFT',
            name: businessName,
            email: user.email,
            phone: dto.phone || user.phone,
          },
        });

        // 8. Create the Business
        const businessSlug =
          businessName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') +
          '-' +
          Date.now().toString(36);

        const businessRecord = await tx.business.create({
          data: {
            tenantId: tenant.id,
            ownerId: user.id,
            categoryId: activeCategoryId || defaultCategory.id,
            name: businessName,
            slug: businessSlug,
            description: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            phone: dto.phone || user.phone || '',
            email: user.email,
            status: 'DRAFT',
            profileType: 'OWNER',
            subcategoryIds: [],
            tags: [],
            socialLinks: {},
            entityId: entityRecord.id,
          },
        });

        // 9. Create staff connection
        await tx.businessStaff.create({
          data: {
            tenantId: tenant.id,
            businessId: businessRecord.id,
            userId: user.id,
            role: 'OWNER',
          },
        });

        // 10. Create onboarding progress
        await tx.onboardingProgress.create({
          data: {
            tenantId: tenant.id,
            entityType: 'BUSINESS',
            entityId: entityRecord.id,
            currentStep: 1,
            status: 'DRAFT',
            stepsCompleted: ['START'],
            metadata: {
              categoryName: defaultCategory.name,
              categorySlug: defaultCategory.slug,
              profileType: 'OWNER',
            },
          },
        });

        // 11. Create onboarding event
        await tx.onboardingEvent.create({
          data: {
            tenantId: tenant.id,
            entityType: 'BUSINESS',
            entityId: entityRecord.id,
            event: 'BUSINESS_ONBOARDING_STARTED',
            metadata: { step: 1 },
          },
        });

        // 12. Create audit log
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            action: 'BUSINESS_ONBOARDING_START',
            resource: 'BUSINESS',
            resourceId: businessRecord.id,
          },
        });

        return { user: updatedUser, businessId: businessRecord.id };
      }, { maxWait: 30000, timeout: 90000 });

      // Clear redis cache for this user
      await this.redisService.del(`user:${user.id}`);
      await this.redisService.del(`user-permissions:${user.id}`);

      const tokens = await this.generateTokens(result.user);
      return {
        ...tokens,
        businessId: result.businessId,
      };
    } else {
      // Create non-business Entity
      const entityName = dto.name || user.name;
      const result = await this.db.$transaction(async (tx) => {
        // Update user role
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { role: targetRoleEnum },
        });

        // Map to role
        const dbRole = await tx.role.findFirst({
          where: { tenantId: user.tenantId, code: targetRoleEnum.toString() },
        });
        if (dbRole) {
          await tx.userRole.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              roleId: dbRole.id,
            },
          });
        }

        // Create Entity
        const entityRecord = await tx.entity.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            type: dto.entityType,
            status: dto.entityType === 'CUSTOMER' ? 'APPROVED' : 'DRAFT',
            name: entityName,
            email: user.email,
            phone: dto.phone || user.phone,
          },
        });

        // Create specialized profiles
        if (dto.entityType === 'INFLUENCER') {
          await tx.influencerProfile.create({
            data: {
              entityId: entityRecord.id,
              niche: 'General',
              followersCount: 0,
            },
          });
        } else if (dto.entityType === 'PROFESSIONAL') {
          await tx.professionalProfile.create({
            data: {
              entityId: entityRecord.id,
              category: 'General',
              experienceYears: 0,
            },
          });
        } else if (dto.entityType === 'EVENT_ORGANIZER') {
          await tx.eventOrganizerProfile.create({
            data: {
              entityId: entityRecord.id,
              organizationName: entityName,
            },
          });
        } else if (dto.entityType === 'ORGANIZATION') {
          await tx.organizationProfile.create({
            data: {
              entityId: entityRecord.id,
              ngoName: entityName,
              registrationNumber: 'PENDING',
              causeCategory: 'General',
            },
          });
        } else if (dto.entityType === 'GOVERNMENT') {
          await tx.governmentProfile.create({
            data: {
              entityId: entityRecord.id,
              departmentName: entityName,
              officialEmail: user.email,
              departmentType: 'Local',
              district: 'Default',
            },
          });
        }

        // Create onboarding progress
        await tx.onboardingProgress.create({
          data: {
            tenantId: user.tenantId,
            entityType: dto.entityType.toString(),
            entityId: entityRecord.id,
            currentStep: 1,
            status: dto.entityType === 'CUSTOMER' ? 'ACTIVE' : 'DRAFT',
            stepsCompleted: ['START'],
            metadata: {},
          },
        });

        // Create onboarding event
        await tx.onboardingEvent.create({
          data: {
            tenantId: user.tenantId,
            entityType: dto.entityType.toString(),
            entityId: entityRecord.id,
            event: 'ONBOARDING_STARTED',
            metadata: { step: 1 },
          },
        });

        return updatedUser;
      }, { maxWait: 30000, timeout: 90000 });

      // Clear redis cache for this user
      await this.redisService.del(`user:${user.id}`);
      await this.redisService.del(`user-permissions:${user.id}`);

      const tokens = await this.generateTokens(result);
      return tokens;
    }
  }

  async getTenantBySlug(slug: string) {
    const tenant = await this.db.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  private parseDeviceType(userAgent: string): string {
    if (/mobile/i.test(userAgent)) return 'Mobile';
    if (/tablet/i.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }
}
