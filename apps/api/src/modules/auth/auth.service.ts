// ============================================================
// Auth Service — Core authentication logic
// ============================================================

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
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
import { CivicSignupDto } from './dto/civic-signup.dto';
import { UserRoleEnum } from '@prisma/client';
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
    try {
      // 1. Resolve tenant (auto-select first tenant for single-tenant deployments)
      if (!dto.tenantId) {
        const defaultTenant = await this.db.tenant.findFirst({ select: { id: true } });
        if (!defaultTenant) {
          throw new BadRequestException('No tenant configured. Contact support.');
        }
        dto.tenantId = defaultTenant.id;
      }

      // 2. Validate password strength
      if (!this.passwordService.isStrongPassword(dto.password)) {
        throw new BadRequestException(
          'Password is too weak. Must contain uppercase, lowercase, numbers, and special characters.',
        );
      }

      // 3. Normalise inputs
      const emailNormalized = dto.email.toLowerCase().trim();
      const phoneNormalized = dto.phone?.trim() || null;
      const nameNormalized = dto.name?.trim() || '';
      const role = dto.role || UserRoleEnum.USER;
      const isCustomer = role === UserRoleEnum.USER;

      if (!nameNormalized) {
        throw new BadRequestException('Name is required');
      }

      // 4. Pre-check uniqueness (cheap reads — better error than P2002)
      const [existingUser, existingPhone] = await Promise.all([
        this.db.user.findFirst({
          where: { tenantId: dto.tenantId, email: emailNormalized, deletedAt: null },
          select: { id: true },
        }),
        isCustomer && phoneNormalized
          ? this.db.customer.findFirst({
              where: { tenantId: dto.tenantId, phone: phoneNormalized, deletedAt: null },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      if (existingUser) {
        throw new ConflictException('Email already registered for this tenant');
      }
      if (existingPhone) {
        throw new ConflictException('Phone number already registered for this tenant');
      }

      // 5. Hash password (expensive — done before the transaction so the txn stays short)
      const passwordHash = await this.passwordService.hash(dto.password);

      // 5a. Referral: resolve referrer if a referral code was supplied
      let referrerId: string | undefined;
      if ((dto as any).referralCode) {
        const referrer = await this.db.user.findFirst({
          where: {
            referralCode: String((dto as any).referralCode).trim().toUpperCase(),
            deletedAt: null,
          },
          select: { id: true },
        });
        if (referrer) referrerId = referrer.id;
      }

      // 5b. Generate a unique referral code for the new user (8 alphanum chars)
      const newReferralCode = Math.random().toString(36).slice(2, 10).toUpperCase();

      const nameParts = nameNormalized.split(/\s+/);
      const firstName = (nameParts[0] || nameNormalized).slice(0, 100);
      const lastName = nameParts.slice(1).join(' ').slice(0, 100);

      // 6. Atomic write — user + (customer profile + entity + onboarding) all-or-nothing
      const user = await this.db.$transaction(
        async (tx) => {
          const createdUser = await tx.user.create({
            data: {
              tenantId: dto.tenantId!,
              email: emailNormalized,
              passwordHash,
              name: nameNormalized,
              phone: phoneNormalized,
              role,
              emailVerified: true,
              isActive: true,
              referralCode: newReferralCode,
              ...(referrerId ? { referredBy: referrerId } : {}),
              ...(dto.acceptedTerms ? { acceptedTermsAt: new Date(), termsVersion: '1.0' } : {}),
              ...(dto.acceptedPrivacyPolicy ? { acceptedPrivacyAt: new Date(), privacyPolicyVersion: '1.0' } : {}),
              ...(isCustomer
                ? {
                    customerProfile: {
                      create: {
                        tenantId: dto.tenantId!,
                        firstName,
                        lastName,
                        email: emailNormalized,
                        phone: phoneNormalized,
                        status: 'ACTIVE',
                      },
                    },
                  }
                : {}),
            },
            select: { id: true, tenantId: true, email: true, name: true, role: true },
          });

          if (isCustomer) {
            const entity = await tx.entity.create({
              data: {
                tenantId: createdUser.tenantId,
                userId: createdUser.id,
                type: 'CUSTOMER',
                status: 'APPROVED',
                name: nameNormalized,
                email: emailNormalized,
                phone: phoneNormalized,
              },
              select: { id: true },
            });

            await tx.onboardingProgress.create({
              data: {
                tenantId: createdUser.tenantId,
                entityType: 'CUSTOMER',
                entityId: entity.id,
                currentStep: 2,
                status: 'ACTIVE',
                stepsCompleted: ['SIGNUP', 'EMAIL_VERIFIED'],
                metadata: phoneNormalized ? { phone: phoneNormalized } : {},
              },
            });

            await tx.onboardingEvent.create({
              data: {
                tenantId: createdUser.tenantId,
                entityType: 'CUSTOMER',
                entityId: entity.id,
                event: 'ONBOARDING_STARTED',
                metadata: { source: 'auth/signup' },
              },
            });
          }

          return createdUser;
        },
        { maxWait: 10000, timeout: 30000 },
      );

      // 7. Generate session tokens (own transaction)
      const tokens = await this.generateTokens(user);

      // 8. Fire-and-forget side effects — never block the response
      void this.postSignupSideEffects(user).catch((err) =>
        this.logger.warn(`Post-signup side-effects failed for ${user.email}: ${err.message}`),
      );

      return {
        ...tokens,
        message: 'Account created successfully. You are now logged in.',
      };
    } catch (err: any) {
      // Pass-through known HTTP exceptions verbatim
      if (err?.status && err?.message) throw err;

      // Log unknown errors with full context so PM2 logs surface the cause
      this.logger.error(
        `Signup failed for ${dto.email}: ${err?.message || err}`,
        err?.stack,
      );

      // Convert known Prisma errors to actionable messages
      if (err?.code === 'P2002') {
        throw new ConflictException('A user with this email or phone already exists');
      }
      if (err?.code === 'P2003') {
        throw new BadRequestException('Invalid tenant reference');
      }
      if (err?.code?.startsWith?.('P')) {
        throw new BadRequestException(`Database error (${err.code}). Please try again.`);
      }

      throw new BadRequestException(
        err?.message || 'Registration failed due to an unexpected error',
      );
    }
  }

  /**
   * Non-blocking side effects after successful signup.
   * Email send + audit log — failures must NOT cause the signup response to fail.
   */
  private async postSignupSideEffects(user: { id: string; tenantId: string; email: string }) {
    // Audit log (best-effort)
    try {
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
    } catch (err: any) {
      this.logger.warn(`Audit log failed for ${user.email}: ${err.message}`);
    }

    // Verification email (best-effort)
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
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const emailNormalized = dto.email.toLowerCase().trim();

    // ── Brute-force protection (Redis counters) ───────────────────────
    // IP bucket  : 10 attempts / 15 min
    // User bucket: 5  attempts / 10 min
    const ipKey   = `login:ip:${ipAddress || 'unknown'}`;
    const userKey = `login:user:${emailNormalized}`;

    const [ipCount, userCount] = await Promise.all([
      this.redisService.incr(ipKey),
      this.redisService.incr(userKey),
    ]);
    // Set TTL only on first increment (atomic create)
    if (ipCount   === 1) await this.redisService.expire(ipKey,   900); // 15 min
    if (userCount === 1) await this.redisService.expire(userKey, 600); // 10 min

    if (ipCount > 10 || userCount > 5) {
      throw new HttpException(
        'Too many login attempts. Please try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // ── Fetch user (include active entity for login response) ─────────
    const user = await this.db.user.findFirst({
      where: {
        ...(dto.tenantId ? { tenantId: dto.tenantId } : {}),
        email: emailNormalized,
        deletedAt: null,
      },
      include: {
        entities: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ── Password verify (intentionally slow — argon2) ─────────────────
    const isPasswordValid = await this.passwordService.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Fire-and-forget audit log — don't add latency on the hot path
      this.db.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'LOGIN_FAILED',
          resource: 'auth',
          metadata: { ipAddress, userAgent },
        },
      }).catch(() => {});
      throw new UnauthorizedException('Invalid credentials');
    }

    // Clear rate-limit counters on success
    await Promise.all([
      this.redisService.del(ipKey),
      this.redisService.del(userKey),
    ]);

    // Enforce email verification (must compare as string — get<boolean> does NOT coerce)
    const enforceVerification =
      this.configService.get<string>('ENFORCE_EMAIL_VERIFICATION', 'true') !== 'false';
    if (enforceVerification && !user.emailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in.');
    }

    // ── Parallel: token generation + lastLoginAt update + deviceLogin ──
    const deviceType = userAgent ? this.parseDeviceType(userAgent) : 'Unknown';
    const now = new Date();
    const [tokens] = await Promise.all([
      this.generateTokens(user, userAgent, ipAddress),
      this.db.user.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
      this.db.deviceLogin.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          deviceType,
          ipAddress,
          lastLoginAt: now,
        },
      }),
    ]);

    // Fire-and-forget success audit log
    this.db.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        resource: 'auth',
        metadata: { ipAddress, userAgent },
      },
    }).catch(() => {});

    // Return entity in response so frontend can skip a second /me roundtrip
    const activeEntity = user.entities?.[0] ?? null;

    // For staff/moderator accounts without an entity, resolve businessId via BusinessStaff
    let staffBusinessId: string | undefined;
    if (!activeEntity) {
      // Prefer isActive staff records; fallback without filter for robustness
      let staffRecord = await this.db.businessStaff.findFirst({
        where: { userId: user.id, deletedAt: null, isActive: true },
        include: { business: { select: { id: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (!staffRecord) {
        staffRecord = await this.db.businessStaff.findFirst({
          where: { userId: user.id, deletedAt: null },
          include: { business: { select: { id: true } } },
          orderBy: { createdAt: 'desc' },
        });
      }
      staffBusinessId = staffRecord?.business?.id;

      // Further fallback: owner lookup
      if (!staffBusinessId) {
        const ownerRecord = await this.db.business.findFirst({
          where: { ownerId: user.id, deletedAt: null },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        });
        staffBusinessId = ownerRecord?.id;
      }
    }

    return {
      ...tokens,
      businessId: staffBusinessId,
      user: {
        ...tokens.user,
        businessId: staffBusinessId,
        entity: activeEntity
          ? { id: activeEntity.id, type: activeEntity.type, status: activeEntity.status, name: activeEntity.name }
          : null,
      },
    };
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
    // `as any` on include + result: civicProfile is a newly-added relation —
    // Prisma client types on VPS regenerate after `prisma generate`. Cast is
    // safe because the SQL query runs correctly regardless of TS types.
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
            civicProfile: true,
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
      } as any,
    }) as any;

    if (!user || !user.isActive || user.deletedAt) {
      return null;
    }

    // Flatten permissions list
    const permissions = new Set<string>();
    user.userRoles.forEach((ur: any) => {
      ur.role.rolePermissions.forEach((rp: any) => {
        if (rp.permission && !rp.permission.deletedAt) {
          permissions.add(`${rp.permission.resource}:${rp.permission.action}`);
        }
      });
    });

    const activeEntity = user.entities[0] || null;

    // Resolve associated businessId so the frontend can use it directly.
    let staffBusinessId: string | undefined;
    if (!activeEntity) {
      // Try active staff record first; fallback without isActive filter
      // in case isActive column has a null value (schema default may not apply retroactively)
      let staffRecord = await this.db.businessStaff.findFirst({
        where: { userId: user.id, deletedAt: null, isActive: true },
        include: { business: { select: { id: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (!staffRecord) {
        staffRecord = await this.db.businessStaff.findFirst({
          where: { userId: user.id, deletedAt: null },
          include: { business: { select: { id: true } } },
          orderBy: { createdAt: 'desc' },
        });
      }
      staffBusinessId = staffRecord?.business?.id;

      if (!staffBusinessId) {
        // Fallback: check if the user is the owner of a business (legacy / direct owner flow)
        const ownerRecord = await this.db.business.findFirst({
          where: { ownerId: user.id, deletedAt: null },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
        });
        staffBusinessId = ownerRecord?.id;
      }
    } else if (activeEntity.type === 'BUSINESS' && activeEntity.business) {
      staffBusinessId = activeEntity.business.id;
    }

    const parsedUser = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: Array.from(permissions),
      businessId: staffBusinessId,
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
                 (activeEntity as any).civicProfile ||
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

    // Resolve category — fall back to first available if slug not found
    let defaultCategory = await this.db.category.findFirst({
      where: { tenantId: defaultTenant.id, slug: dto.categorySlug, deletedAt: null },
    });
    if (!defaultCategory) {
      defaultCategory = await this.db.category.findFirst({
        where: { tenantId: defaultTenant.id, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      });
    }
    if (!defaultCategory) {
      throw new NotFoundException('No categories configured. Please contact support.');
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
      const bizReferralCode = Math.random().toString(36).slice(2, 10).toUpperCase();

      // Resolve the referrer from the supplied referral code so referredBy is
      // stored. Referral codes are uppercase; the referrer usually lives in the
      // default tenant (cross-tenant lookup — referredBy is a plain uuid).
      let bizReferredBy: string | undefined;
      if (dto.referralCode) {
        const referrer = await tx.user.findFirst({
          where: { referralCode: dto.referralCode.trim().toUpperCase(), deletedAt: null },
          select: { id: true },
        });
        if (referrer) bizReferredBy = referrer.id;
      }

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
          referralCode: bizReferralCode,
          ...(bizReferredBy ? { referredBy: bizReferredBy } : {}),
          ...(dto.acceptedTerms ? { acceptedTermsAt: new Date(), termsVersion: '1.0' } : {}),
          ...(dto.acceptedPrivacyPolicy ? { acceptedPrivacyAt: new Date(), privacyPolicyVersion: '1.0' } : {}),
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

      // 6b. Create the Entity — immediately PENDING_VERIFICATION so it
      // lands in admin moderation queue (not verified until admin acts).
      const entityRecord = await tx.entity.create({
        data: {
          tenantId: tenant.id,
          userId: userRecord.id,
          type: 'BUSINESS',
          status: 'PENDING_VERIFICATION',
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
          status: 'PENDING_VERIFICATION',
          isVerified: false,
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
          status: 'PENDING_VERIFICATION',
          stepsCompleted: ['START'],
          metadata: {
            categoryName: defaultCategory.name,
            categorySlug: defaultCategory.slug,
            subcategories,
            profileType: dto.profileType || 'OWNER',
          },
        },
      });

      // 10b. Create VerificationRequest — admin moderation queue source.
      // Every new business signup MUST appear in admin review tab.
      await tx.verificationRequest.create({
        data: {
          tenantId: tenant.id,
          entityId: entityRecord.id,
          status: 'PENDING',
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

        // 7. Create Entity — PENDING_VERIFICATION for admin review queue
        const entityRecord = await tx.entity.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            type: 'BUSINESS',
            status: 'PENDING_VERIFICATION',
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
            status: 'PENDING_VERIFICATION',
            isVerified: false,
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
            status: 'PENDING_VERIFICATION',
            stepsCompleted: ['START'],
            metadata: {
              categoryName: defaultCategory.name,
              categorySlug: defaultCategory.slug,
              profileType: 'OWNER',
            },
          },
        });

        // 10b. Create VerificationRequest — admin moderation queue source.
        await tx.verificationRequest.create({
          data: {
            tenantId: tenant.id,
            entityId: entityRecord.id,
            status: 'PENDING',
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

        // Create Entity — CUSTOMER auto-approved; all others
        // PENDING_VERIFICATION until admin acts.
        const entityRecord = await tx.entity.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            type: dto.entityType,
            status: dto.entityType === 'CUSTOMER' ? 'APPROVED' : 'PENDING_VERIFICATION',
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
            status: dto.entityType === 'CUSTOMER' ? 'ACTIVE' : 'PENDING_VERIFICATION',
            stepsCompleted: ['START'],
            metadata: {},
          },
        });

        // VerificationRequest for non-CUSTOMER entities → admin queue
        if (dto.entityType !== 'CUSTOMER') {
          await tx.verificationRequest.create({
            data: {
              tenantId: user.tenantId,
              entityId: entityRecord.id,
              status: 'PENDING',
            },
          });
        }

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

  // ── NGO / Community / News Forum signup ─────────────────────────────────

  async civicSignup(dto: CivicSignupDto) {
    if (!this.passwordService.isStrongPassword(dto.password)) {
      throw new BadRequestException(
        'Password is too weak. Must contain uppercase, lowercase, numbers, and special characters.',
      );
    }

    const emailNormalized = dto.email.toLowerCase().trim();

    const existingUser = await this.db.user.findFirst({
      where: { email: emailNormalized, deletedAt: null },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Use the default platform tenant (same as government/customer signups)
    const defaultTenant = await this.db.tenant.findFirst({ select: { id: true } });
    if (!defaultTenant) {
      throw new BadRequestException('No tenant configured. Contact support.');
    }

    // Role + EntityType mapping — use string literals so this compiles even
    // before `prisma generate` adds the new enum values to the client types.
    const roleMap: Record<string, string> = {
      NGO: 'NGO_ADMIN',
      COMMUNITY: 'COMMUNITY_ADMIN',
      NEWS_FORUM: 'NEWS_FORUM_ADMIN',
    };
    const entityTypeMap: Record<string, string> = {
      NGO: 'NGO',
      COMMUNITY: 'COMMUNITY',
      NEWS_FORUM: 'NEWS_FORUM',
    };

    const assignedRole = (roleMap[dto.organizationType] ?? 'NGO_ADMIN') as any;
    const entityType   = (entityTypeMap[dto.organizationType] ?? 'NGO') as any;

    const passwordHash  = await this.passwordService.hash(dto.password);
    const referralCode  = Math.random().toString(36).slice(2, 10).toUpperCase();

    // Resolve referrer if a code was supplied
    let referrerId: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.db.user.findFirst({
        where: { referralCode: dto.referralCode.trim().toUpperCase(), deletedAt: null },
        select: { id: true },
      });
      if (referrer) referrerId = referrer.id;
    }

    const { user, entity } = await this.db.$transaction(
      async (tx) => {
        const userRecord = await tx.user.create({
          data: {
            tenantId: defaultTenant.id,
            email: emailNormalized,
            passwordHash,
            name: dto.contactName,
            phone: dto.phone,
            role: assignedRole,
            emailVerified: true,
            isActive: true,
            referralCode,
            ...(referrerId ? { referredBy: referrerId } : {}),
            ...(dto.acceptedTerms ? { acceptedTermsAt: new Date(), termsVersion: '1.0' } : {}),
            ...(dto.acceptedPrivacyPolicy ? { acceptedPrivacyAt: new Date(), privacyPolicyVersion: '1.0' } : {}),
          },
        });

        const entityRecord = await tx.entity.create({
          data: {
            tenantId: defaultTenant.id,
            userId: userRecord.id,
            type: entityType,
            status: 'PENDING_VERIFICATION',
            name: dto.organizationName,
            email: emailNormalized,
            phone: dto.phone,
          },
        });

        // Civic-specific profile
        await (tx as any).civicProfile.create({
          data: {
            entityId: entityRecord.id,
            organizationType: dto.organizationType,
            organizationName: dto.organizationName,
            contactName: dto.contactName,
            description: dto.description ?? null,
            address: dto.address ?? null,
            district: dto.district ?? 'Thiruvananthapuram',
            website: dto.website ?? null,
          },
        });

        // Put in admin verification queue
        await tx.verificationRequest.create({
          data: {
            tenantId: defaultTenant.id,
            entityId: entityRecord.id,
            status: 'PENDING',
          },
        });

        // Onboarding progress
        await tx.onboardingProgress.create({
          data: {
            tenantId: defaultTenant.id,
            entityType,
            entityId: entityRecord.id,
            currentStep: 1,
            status: 'PENDING_VERIFICATION',
            stepsCompleted: ['SIGNUP'],
            metadata: { organizationType: dto.organizationType },
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            tenantId: defaultTenant.id,
            userId: userRecord.id,
            action: 'CIVIC_SIGNUP',
            resource: entityType,
            resourceId: entityRecord.id,
            metadata: { organizationType: dto.organizationType, email: emailNormalized },
          },
        });

        return { user: userRecord, entity: entityRecord };
      },
      { maxWait: 10000, timeout: 30000 },
    );

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      entityId: entity.id,
      message: 'Organisation account created. Pending admin verification.',
    };
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
