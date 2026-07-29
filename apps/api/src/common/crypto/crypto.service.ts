import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Application-level encryption for identity documents (PAN, GSTIN).
 *
 * AES-256-GCM: authenticated, so tampering is detected rather than silently
 * decrypting to garbage. Stored format is `v1:<iv>:<authTag>:<ciphertext>`,
 * all base64 — the version prefix lets us rotate the scheme later without
 * guessing at what an old row contains.
 *
 * The key comes from ENCRYPTION_KEY (32 bytes, hex or base64). It must live
 * outside the database: a DB dump alone must not be enough to read PANs.
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer | null;
  private static readonly PREFIX = 'v1';

  constructor(private readonly config: ConfigService) {
    this.key = this.loadKey();
  }

  private loadKey(): Buffer | null {
    const raw = this.config.get<string>('ENCRYPTION_KEY');
    if (!raw) {
      // Not fatal in development — values are stored as-is so local work isn't
      // blocked. env.validation refuses to boot without it in production.
      this.logger.warn(
        'ENCRYPTION_KEY is not set — PAN/GSTIN will be stored unencrypted. Set it before going to production.',
      );
      return null;
    }
    const buf = /^[0-9a-f]{64}$/i.test(raw)
      ? Buffer.from(raw, 'hex')
      : Buffer.from(raw, 'base64');
    if (buf.length !== 32) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY must decode to exactly 32 bytes (64 hex chars, or base64 of 32 bytes).',
      );
    }
    return buf;
  }

  get enabled() {
    return this.key !== null;
  }

  /** Returns the stored representation. Null/empty passes straight through. */
  encrypt(plain?: string | null): string | null {
    if (plain === null || plain === undefined || plain === '') return null;
    if (!this.key) return plain;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      CryptoService.PREFIX,
      iv.toString('base64'),
      tag.toString('base64'),
      enc.toString('base64'),
    ].join(':');
  }

  /**
   * Reverses encrypt(). Values written before encryption was enabled are
   * returned unchanged, so existing rows keep working without a backfill.
   */
  decrypt(stored?: string | null): string | null {
    if (stored === null || stored === undefined || stored === '') return null;
    if (!stored.startsWith(`${CryptoService.PREFIX}:`)) return stored; // legacy plaintext
    if (!this.key) {
      this.logger.error('Encrypted value found but ENCRYPTION_KEY is not set.');
      return null;
    }
    try {
      const [, ivB64, tagB64, dataB64] = stored.split(':');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(ivB64, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      const dec = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
      ]);
      return dec.toString('utf8');
    } catch (err: any) {
      // Auth-tag failure means the ciphertext was tampered with or the key changed.
      this.logger.error(`Failed to decrypt value: ${err.message}`);
      return null;
    }
  }

  /**
   * Display form for identity documents — keeps the last 4 characters so an
   * admin can match a record without exposing the full number.
   * ABCDE1234F -> ******234F
   */
  static mask(value?: string | null, visible = 4): string | null {
    if (!value) return null;
    if (value.length <= visible) return '*'.repeat(value.length);
    return '*'.repeat(value.length - visible) + value.slice(-visible);
  }
}
