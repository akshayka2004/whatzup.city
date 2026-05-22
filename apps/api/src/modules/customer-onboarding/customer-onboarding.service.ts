import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../audit/audit.service';
import {
  CustomerSignupDto,
  PreparePhoneVerificationDto,
  ProfileCompletionDto,
} from './dto/customer-signup.dto';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CustomerOnboardingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    @InjectQueue('onboarding-queue') private readonly onboardingQueue: Queue,
  ) {}

  async signup(dto: CustomerSignupDto) {
    const emailNormalized = dto.email.toLowerCase().trim();

    // Check duplicate
    const existing = await this.db.user.findFirst({
      where: { tenantId: dto.tenantId, email: emailNormalized, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (dto.phone) {
      const existingPhone = await this.db.customer.findFirst({
        where: { tenantId: dto.tenantId, phone: dto.phone, deletedAt: null },
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.db.user.create({
      data: {
        tenantId: dto.tenantId,
        email: emailNormalized,
        passwordHash,
        name: `${dto.firstName} ${dto.lastName}`.trim(),
        phone: dto.phone,
        role: 'USER',
        emailVerified: false,
        isActive: false,
        customerProfile: {
          create: {
            tenantId: dto.tenantId,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: emailNormalized,
            phone: dto.phone,
            status: 'PENDING',
          },
        },
      },
      include: { customerProfile: true },
    });

    // Create onboarding progress tracker
    const onboarding = await this.db.onboardingProgress.create({
      data: {
        tenantId: dto.tenantId,
        entityType: 'CUSTOMER',
        entityId: user.id,
        currentStep: 1,
        status: 'PENDING',
        stepsCompleted: ['SIGNUP'],
        metadata: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
      },
    });

    // Track event
    await this.db.onboardingEvent.create({
      data: {
        tenantId: dto.tenantId,
        entityType: 'CUSTOMER',
        entityId: user.id,
        event: 'ONBOARDING_STARTED',
        metadata: { step: 1 },
      },
    });

    // Generate email verification token
    const token = uuidv4();
    await this.redis.set(
      `email-verify:${token}`,
      { userId: user.id, tenantId: user.tenantId },
      86400,
    ); // 24h

    // Dispatch verification notification via queue
    await this.onboardingQueue.add('send-verification-email', {
      email: user.email,
      token,
      tenantId: user.tenantId,
    });

    await this.audit.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'CUSTOMER_SIGNUP',
      resource: 'USER',
      resourceId: user.id,
      metadata: { email: user.email },
    });

    return {
      message: 'Signup successful. Verification email sent.',
      userId: user.id,
      onboardingId: onboarding.id,
    };
  }

  async verifyEmail(token: string) {
    const cached = await this.redis.get<{ userId: string; tenantId: string }>(
      `email-verify:${token}`,
    );
    if (!cached) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.db.user.update({
      where: { id: cached.userId },
      data: { emailVerified: true, isActive: true },
    });

    await this.db.customer.updateMany({
      where: { tenantId: cached.tenantId, userId: cached.userId },
      data: { status: 'PENDING' },
    });

    await this.db.onboardingProgress.update({
      where: {
        tenantId_entityType_entityId: {
          tenantId: cached.tenantId,
          entityType: 'CUSTOMER',
          entityId: cached.userId,
        },
      },
      data: {
        currentStep: 2,
        stepsCompleted: ['SIGNUP', 'EMAIL_VERIFIED'],
      },
    });

    await this.db.onboardingEvent.create({
      data: {
        tenantId: cached.tenantId,
        entityType: 'CUSTOMER',
        entityId: cached.userId,
        event: 'EMAIL_VERIFIED',
      },
    });

    await this.redis.del(`email-verify:${token}`);

    return { message: 'Email verified successfully. Proceed to profile completion.' };
  }

  async completeProfile(userId: string, tenantId: string, dto: ProfileCompletionDto) {
    const user = await this.db.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const updatedUser = await this.db.user.update({
      where: { id: userId },
      data: {
        avatar: dto.avatar,
        isActive: true,
      },
    });

    const nameParts = user.name.split(' ');
    await this.db.customer.updateMany({
      where: { tenantId, userId, deletedAt: null },
      data: {
        firstName: nameParts[0] || user.name,
        lastName: nameParts.slice(1).join(' '),
        phone: user.phone,
        avatar: dto.avatar,
        city: dto.city,
        district: dto.district,
        state: dto.state,
        preferences: dto.preferences || {},
        status: 'ACTIVE',
      },
    });

    // Update progress
    await this.db.onboardingProgress.update({
      where: {
        tenantId_entityType_entityId: { tenantId, entityType: 'CUSTOMER', entityId: userId },
      },
      data: {
        currentStep: 3,
        status: 'ACTIVE',
        stepsCompleted: ['SIGNUP', 'EMAIL_VERIFIED', 'PROFILE_COMPLETED', 'PREFERENCES'],
        metadata: {
          city: dto.city,
          district: dto.district,
          state: dto.state,
          preferences: dto.preferences,
        },
      },
    });

    // Record onboarding completed event
    await this.db.onboardingEvent.create({
      data: {
        tenantId,
        entityType: 'CUSTOMER',
        entityId: userId,
        event: 'ONBOARDING_COMPLETED',
        metadata: JSON.parse(JSON.stringify(dto)),
      },
    });

    // Log user activity preference profile
    await this.db.userActivity.create({
      data: {
        tenantId,
        userId,
        activityType: 'ONBOARDING_COMPLETE',
        metadata: { preferences: dto.preferences },
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CUSTOMER_ONBOARDING_COMPLETE',
      resource: 'USER',
      resourceId: userId,
    });

    return {
      message: 'Profile completed successfully. Welcome to the platform!',
      user: updatedUser,
    };
  }

  async getProgress(userId: string, tenantId: string) {
    const progress = await this.db.onboardingProgress.findUnique({
      where: {
        tenantId_entityType_entityId: { tenantId, entityType: 'CUSTOMER', entityId: userId },
      },
    });
    if (!progress) throw new NotFoundException('Onboarding progress tracker not found');
    return progress;
  }

  async preparePhoneVerification(
    userId: string,
    tenantId: string,
    dto: PreparePhoneVerificationDto,
  ) {
    const customer = await this.db.customer.findFirst({
      where: { tenantId, userId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer profile not found');

    const duplicatePhone = await this.db.customer.findFirst({
      where: {
        tenantId,
        phone: dto.phone,
        deletedAt: null,
        NOT: { userId },
      },
    });
    if (duplicatePhone) throw new ConflictException('Phone number already registered');

    const token = uuidv4();
    await this.redis.set(`phone-verify:${token}`, { userId, tenantId, phone: dto.phone }, 600);

    await this.db.customer.update({
      where: { id: customer.id },
      data: { phone: dto.phone, phoneVerified: false },
    });
    await this.db.user.update({
      where: { id: userId },
      data: { phone: dto.phone },
    });

    await this.onboardingQueue.add('send-phone-verification', {
      userId,
      tenantId,
      phone: dto.phone,
      token,
    });

    await this.db.onboardingEvent.create({
      data: {
        tenantId,
        entityType: 'CUSTOMER',
        entityId: userId,
        event: 'PHONE_VERIFICATION_PREPARED',
        metadata: { phone: dto.phone },
      },
    });

    await this.audit.log({
      tenantId,
      userId,
      action: 'CUSTOMER_PHONE_VERIFICATION_PREPARED',
      resource: 'CUSTOMER',
      resourceId: customer.id,
    });

    return { message: 'Phone verification prepared.', expiresIn: 600 };
  }
}
