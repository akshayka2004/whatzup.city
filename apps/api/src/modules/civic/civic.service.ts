import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { PasswordService } from '../auth/password.service';
import { UpdateCivicProfileDto } from './dto/update-civic-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const CIVIC_ROLES = ['NGO_ADMIN', 'COMMUNITY_ADMIN', 'NEWS_FORUM_ADMIN'];
const CIVIC_ENTITY_TYPES = ['NGO', 'COMMUNITY', 'NEWS_FORUM'];

@Injectable()
export class CivicService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly passwordService: PasswordService,
  ) {}

  /** Resolve the civic entity (+profile) owned by this user. */
  private async resolveEntity(userId: string) {
    const entity = await (this.db as any).entity.findFirst({
      where: { userId, type: { in: CIVIC_ENTITY_TYPES }, deletedAt: null },
      include: { civicProfile: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!entity) {
      throw new NotFoundException('Civic profile not found for this account.');
    }
    return entity;
  }

  async getProfile(userId: string) {
    const entity = await this.resolveEntity(userId);
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, referralCode: true },
    });
    const profile = entity.civicProfile;

    return {
      entityId: entity.id,
      entityType: entity.type,
      status: entity.status,
      email: user?.email ?? entity.email,
      referralCode: user?.referralCode ?? null,
      organizationName: profile?.organizationName ?? entity.name,
      contactName: profile?.contactName ?? user?.name ?? '',
      phone: user?.phone ?? entity.phone ?? '',
      description: profile?.description ?? '',
      address: profile?.address ?? '',
      district: profile?.district ?? '',
      website: profile?.website ?? '',
      logoUrl: profile?.logoUrl ?? null,
      bannerUrl: profile?.bannerUrl ?? null,
      socialLinks: this.normalizeLinks(profile?.socialLinks),
    };
  }

  async updateProfile(userId: string, dto: UpdateCivicProfileDto) {
    const entity = await this.resolveEntity(userId);

    const profileData: Record<string, any> = {};
    if (dto.organizationName !== undefined) profileData.organizationName = dto.organizationName;
    if (dto.contactName !== undefined) profileData.contactName = dto.contactName;
    if (dto.description !== undefined) profileData.description = dto.description;
    if (dto.address !== undefined) profileData.address = dto.address;
    if (dto.district !== undefined) profileData.district = dto.district;
    if (dto.website !== undefined) profileData.website = dto.website;
    if (dto.logoUrl !== undefined) profileData.logoUrl = dto.logoUrl;
    if (dto.bannerUrl !== undefined) profileData.bannerUrl = dto.bannerUrl;
    if (dto.socialLinks !== undefined) {
      profileData.socialLinks = (dto.socialLinks || [])
        .filter((l) => l && l.label?.trim() && l.url?.trim())
        .map((l) => ({ label: l.label.trim(), url: this.normalizeUrl(l.url.trim()) }));
    }

    if (Object.keys(profileData).length > 0) {
      await (this.db as any).civicProfile.update({
        where: { entityId: entity.id },
        data: profileData,
      });
    }

    // Keep entity name + user record in sync
    if (dto.organizationName !== undefined) {
      await this.db.entity.update({
        where: { id: entity.id },
        data: { name: dto.organizationName },
      });
    }
    const userData: Record<string, any> = {};
    if (dto.contactName !== undefined) userData.name = dto.contactName;
    if (dto.phone !== undefined) userData.phone = dto.phone;
    if (Object.keys(userData).length > 0) {
      await this.db.user.update({ where: { id: userId }, data: userData });
    }

    // Bust cached user blob so /me reflects changes immediately
    await this.redis.del(`user:${userId}`);

    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (!this.passwordService.isStrongPassword(dto.newPassword)) {
      throw new BadRequestException(
        'New password too weak. Needs uppercase, lowercase, number, and special character.',
      );
    }
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) throw new NotFoundException('Account not found.');

    const ok = await this.passwordService.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect.');

    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await this.db.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Password updated successfully.' };
  }

  async getReferrals(userId: string, role?: string) {
    // Referrals only apply to NGO / Community / News Forum accounts
    if (role && !CIVIC_ROLES.includes(role)) {
      throw new ForbiddenException('Referrals are only available for civic accounts.');
    }

    const [count, referrals] = await Promise.all([
      this.db.user.count({ where: { referredBy: userId, deletedAt: null } }),
      this.db.user.findMany({
        where: { referredBy: userId, deletedAt: null },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return { count, referrals };
  }

  private normalizeLinks(raw: any): { label: string; url: string }[] {
    if (Array.isArray(raw)) {
      return raw
        .filter((l) => l && l.label && l.url)
        .map((l) => ({ label: String(l.label), url: String(l.url) }));
    }
    return [];
  }

  private normalizeUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  }
}
