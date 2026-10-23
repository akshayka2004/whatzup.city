// ============================================================
// Phone OTP — issue and check one-time login codes
//
// Codes live only in Redis (hashed, 5 minutes). A phone that is not on exactly one active
// account gets no SMS, and the response is identical either way, so the endpoint cannot be
// used to find out which numbers are registered or to spend SMS credit on strangers.
// ============================================================

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { DatabaseService } from '../../common/database/database.service';
import { RedisService } from '../../common/redis/redis.service';
import { normalizeIndianMobile } from '../../common/utils/phone';
import { SmsService } from './sms.service';

interface StoredCode {
  /** HMAC of phone + code. */
  h: string;
  /** Wrong guesses so far. */
  n: number;
  /** Epoch ms the code stops working. */
  exp: number;
  /** The one account this code signs in. */
  uid: string;
}

const GENERIC_INVALID = 'That code is wrong or has expired. Request a new one.';

@Injectable()
export class OtpService {
  static readonly CODE_TTL_SECONDS = 300;
  static readonly RESEND_SECONDS = 30;
  static readonly MAX_CODES_PER_HOUR = 5;
  static readonly MAX_GUESSES = 5;
  private static readonly IP_REQUESTS_PER_HOUR = 20;
  private static readonly IP_VERIFIES_PER_15_MIN = 20;

  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  /** Same answer for every number; the SMS (if any) goes out after we respond. */
  async request(rawPhone: string, ip = 'unknown'): Promise<{ resendIn: number }> {
    const phone = normalizeIndianMobile(rawPhone);
    if (!phone) throw new BadRequestException('Enter a valid 10-digit mobile number.');

    await this.bump(
      `otp:req:ip:${ip}`,
      3600,
      OtpService.IP_REQUESTS_PER_HOUR,
      'Too many requests. Try again later.',
    );

    // The cooldown and hourly cap apply to every number, registered or not.
    if (await this.redis.exists(`otp:cool:${phone}`)) {
      throw new HttpException(
        `Please wait ${OtpService.RESEND_SECONDS} seconds before asking for another code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.redis.set(`otp:cool:${phone}`, '1', OtpService.RESEND_SECONDS);
    await this.bump(
      `otp:hour:${phone}`,
      3600,
      OtpService.MAX_CODES_PER_HOUR,
      'Too many codes requested for this number. Try again in an hour.',
    );

    const ids = await this.findUserIds(phone);
    if (ids.length === 1) {
      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      const entry: StoredCode = {
        h: this.hash(phone, code),
        n: 0,
        exp: Date.now() + OtpService.CODE_TTL_SECONDS * 1000,
        uid: ids[0],
      };
      await this.redis.set(`otp:code:${phone}`, entry, OtpService.CODE_TTL_SECONDS);
      // Not awaited: a slow or failing provider must not change the response or its timing.
      void this.sms
        .sendOtp(phone, code, OtpService.CODE_TTL_SECONDS / 60)
        .catch((err) => this.logger.error(`OTP SMS failed: ${err.message}`));
    } else if (ids.length > 1) {
      this.logger.warn(`OTP login skipped: a phone number is on ${ids.length} active accounts`);
    }

    return { resendIn: OtpService.RESEND_SECONDS };
  }

  /** Returns the id of the account the code signs in, or throws. */
  async verify(rawPhone: string, code: string, ip = 'unknown'): Promise<string> {
    const phone = normalizeIndianMobile(rawPhone);
    if (!phone || !/^\d{6}$/.test(code)) throw new UnauthorizedException(GENERIC_INVALID);

    await this.bump(
      `otp:ver:ip:${ip}`,
      900,
      OtpService.IP_VERIFIES_PER_15_MIN,
      'Too many attempts. Try again in 15 minutes.',
    );

    const key = `otp:code:${phone}`;
    const entry = await this.redis.get<StoredCode>(key);
    if (!entry || entry.exp <= Date.now()) throw new UnauthorizedException(GENERIC_INVALID);

    const guesses = entry.n + 1;
    if (guesses > OtpService.MAX_GUESSES) {
      await this.redis.del(key);
      throw new UnauthorizedException(GENERIC_INVALID);
    }

    const given = Buffer.from(this.hash(phone, code));
    const want = Buffer.from(entry.h);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
      const left = Math.max(1, Math.ceil((entry.exp - Date.now()) / 1000));
      await this.redis.set(key, { ...entry, n: guesses }, left);
      throw new UnauthorizedException(GENERIC_INVALID);
    }

    // One use only.
    await this.redis.del(key);

    // The number could have changed hands since the code was sent.
    const ids = await this.findUserIds(phone);
    if (ids.length !== 1 || ids[0] !== entry.uid) throw new UnauthorizedException(GENERIC_INVALID);
    return entry.uid;
  }

  /** Active, non-deleted accounts whose phone ends in these 10 digits, however it was typed. */
  async findUserIds(phone10: string): Promise<string[]> {
    const rows = await this.db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM users
      WHERE deleted_at IS NULL
        AND is_active = true
        AND phone IS NOT NULL
        AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ${phone10}
      LIMIT 2
    `);
    return rows.map((r) => r.id);
  }

  private hash(phone: string, code: string): string {
    const secret = this.config.get<string>('JWT_SECRET', 'dev-secret-change-me');
    return crypto.createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
  }

  private async bump(key: string, ttlSeconds: number, max: number, message: string) {
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, ttlSeconds);
    if (count > max) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
