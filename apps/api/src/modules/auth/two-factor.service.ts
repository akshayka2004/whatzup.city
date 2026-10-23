import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { PasswordService } from './password.service';
import { SecurityAlertService } from '../../common/alerts/security-alert.service';
import { twoFactorRequiredFor } from '../../common/utils/two-factor-policy';
import {
  TOTP_STEP_SECONDS,
  generateTotpSecret,
  otpauthUrl,
  verifyTotp,
} from '../../common/utils/totp';

const ISSUER = 'whtzup.city';
const CHALLENGE_TTL_SECONDS = 300;
const CHALLENGE_MAX_ATTEMPTS = 5;
const RECOVERY_CODE_COUNT = 10;

const hashCode = (code: string) =>
  createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');

function newRecoveryCode(): string {
  const raw = randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

/**
 * TOTP second factor. Setup stores an encrypted pending secret; enabling proves the
 * app is scanned and issues one-time recovery codes. Login with 2FA on returns a
 * short-lived challenge instead of tokens, redeemed with a code at /auth/2fa/login.
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly crypto: CryptoService,
    private readonly passwordService: PasswordService,
    @Optional() private readonly alerts?: SecurityAlertService,
  ) {}

  async status(userId: string) {
    const user = await this.load(userId);
    return {
      enabled: !!user.twoFactorEnabledAt,
      enabledAt: user.twoFactorEnabledAt,
      recoveryCodesLeft: user.twoFactorRecoveryCodes.length,
      required: twoFactorRequiredFor(user.role),
    };
  }

  async setup(userId: string) {
    const user = await this.load(userId);
    if (user.twoFactorEnabledAt) throw new ConflictException('Two-factor sign-in is already on.');
    const secret = generateTotpSecret();
    await this.db.user.update({
      where: { id: userId },
      data: { twoFactorSecret: this.crypto.encrypt(secret), twoFactorRecoveryCodes: [] },
    });
    return { secret, otpauthUrl: otpauthUrl(secret, user.email, ISSUER) };
  }

  async enable(userId: string, code: string) {
    const user = await this.load(userId);
    if (user.twoFactorEnabledAt) throw new ConflictException('Two-factor sign-in is already on.');
    const secret = this.crypto.decrypt(user.twoFactorSecret);
    if (!secret) throw new BadRequestException('Start setup first.');
    if (!(await this.checkTotp(userId, secret, code))) {
      throw new BadRequestException(
        'That code is not right. Check the time on your phone and try again.',
      );
    }
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
    await this.db.user.update({
      where: { id: userId },
      data: { twoFactorEnabledAt: new Date(), twoFactorRecoveryCodes: codes.map(hashCode) },
    });
    await this.redis.del(`user:${userId}`);
    return { recoveryCodes: codes };
  }

  async disable(userId: string, password: string, code: string) {
    const user = await this.load(userId);
    if (!user.twoFactorEnabledAt) return { enabled: false };
    if (twoFactorRequiredFor(user.role)) {
      throw new BadRequestException('Two-factor sign-in is required for your role.');
    }
    const passwordOk = await this.passwordService.compare(password ?? '', user.passwordHash);
    if (!passwordOk || !(await this.verifyCode(user, code))) {
      throw new UnauthorizedException('Password or code is not right.');
    }
    await this.db.user.update({
      where: { id: userId },
      data: { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorRecoveryCodes: [] },
    });
    await this.redis.del(`user:${userId}`);
    void this.alerts?.alert('TWO_FACTOR_DISABLED', `Two-factor turned off for ${user.email}`, {
      userId,
      role: user.role,
    });
    return { enabled: false };
  }

  async regenerateRecoveryCodes(userId: string, code: string) {
    const user = await this.load(userId);
    if (!user.twoFactorEnabledAt) throw new BadRequestException('Two-factor sign-in is off.');
    const secret = this.crypto.decrypt(user.twoFactorSecret);
    if (!secret || !(await this.checkTotp(userId, secret, code))) {
      throw new UnauthorizedException('That code is not right.');
    }
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
    await this.db.user.update({
      where: { id: userId },
      data: { twoFactorRecoveryCodes: codes.map(hashCode) },
    });
    return { recoveryCodes: codes };
  }

  /** Issued after a correct password when 2FA is on; redeemed by redeemChallenge(). */
  async createChallenge(userId: string): Promise<string> {
    const token = uuidv4();
    await this.redis.set(`2fa:challenge:${token}`, { userId }, CHALLENGE_TTL_SECONDS);
    return token;
  }

  /** The user id behind a valid challenge + code; the challenge is single-use. */
  async redeemChallenge(token: string, code: string): Promise<string> {
    const key = `2fa:challenge:${token}`;
    const challenge = await this.redis.get<{ userId: string }>(key);
    if (!challenge?.userId) {
      throw new UnauthorizedException('This sign-in has expired. Enter your password again.');
    }
    const attemptsKey = `${key}:attempts`;
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) await this.redis.expire(attemptsKey, CHALLENGE_TTL_SECONDS);
    if (attempts > CHALLENGE_MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new HttpException(
        'Too many wrong codes. Enter your password again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const user = await this.load(challenge.userId);
    if (!(await this.verifyCode(user, code))) {
      throw new UnauthorizedException('That code is not right.');
    }
    await this.redis.del(key);
    return user.id;
  }

  /** TOTP code, or a recovery code (consumed on use). */
  private async verifyCode(
    user: { id: string; twoFactorSecret: string | null; twoFactorRecoveryCodes: string[] },
    code: string,
  ): Promise<boolean> {
    const input = (code ?? '').trim();
    if (/^\d{6}$/.test(input.replace(/\s/g, ''))) {
      const secret = this.crypto.decrypt(user.twoFactorSecret);
      return !!secret && this.checkTotp(user.id, secret, input);
    }
    const hashed = Buffer.from(hashCode(input));
    const match = user.twoFactorRecoveryCodes.find(
      (h) => h.length === hashed.length && timingSafeEqual(Buffer.from(h), hashed),
    );
    if (!match) return false;
    await this.db.user.update({
      where: { id: user.id },
      data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((h) => h !== match) },
    });
    return true;
  }

  /** Valid and not already used in its time step (blocks replay of an observed code). */
  private async checkTotp(userId: string, secret: string, code: string): Promise<boolean> {
    const step = verifyTotp(secret, code);
    if (step === null) return false;
    const usedKey = `2fa:used:${userId}:${step}`;
    if ((await this.redis.incr(usedKey)) !== 1) return false;
    await this.redis.expire(usedKey, TOTP_STEP_SECONDS * 4);
    return true;
  }

  private async load(userId: string) {
    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        twoFactorSecret: true,
        twoFactorEnabledAt: true,
        twoFactorRecoveryCodes: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
