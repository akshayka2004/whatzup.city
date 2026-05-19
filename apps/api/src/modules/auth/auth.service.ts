// ============================================================
// Auth Service — Core authentication logic
// ============================================================

import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { UserRole } from '@saas/types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    tenantId: string;
    role?: UserRole;
  }) {
    // Check for existing user
    const existing = await this.db.user.findUnique({
      where: { tenantId_email: { tenantId: data.tenantId, email: data.email } },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.db.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role || UserRole.PUBLIC_USER,
      },
    });

    return this.generateTokens(user);
  }

  async login(email: string, password: string, tenantId: string) {
    const user = await this.db.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    const session = await this.db.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate refresh token
    await this.db.session.delete({ where: { id: session.id } });

    return this.generateTokens(session.user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.db.session.deleteMany({
        where: { userId, refreshToken },
      });
    } else {
      // Revoke all sessions
      await this.db.session.deleteMany({
        where: { userId },
      });
    }

    // Invalidate cached user data
    await this.redisService.del(`user:${userId}`);
  }

  async validateUser(payload: JwtPayload) {
    // Check cache first
    const cached = await this.redisService.get<any>(`user:${payload.sub}`);
    if (cached) return cached;

    const user = await this.db.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Cache for 5 minutes
    await this.redisService.set(`user:${user.id}`, user, 300);

    return user;
  }

  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn) || 7);

    // Store refresh token in database
    await this.db.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
