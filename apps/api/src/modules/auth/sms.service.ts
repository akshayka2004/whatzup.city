// ============================================================
// SMS sender — one-time codes only. MSG91 in production; a log sender for local work.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MSG91_OTP_URL = 'https://control.msg91.com/api/v5/otp';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Sends `code` to an Indian mobile (10 digits). The message text is the DLT-approved
   * template configured in MSG91 (it carries the ##OTP## variable), so no wording lives here.
   * Throws when the provider refuses, so callers can log it; never include the code in errors.
   */
  async sendOtp(phone10: string, code: string, expiryMinutes: number): Promise<void> {
    const provider = this.config.get<string>('SMS_PROVIDER', 'msg91');

    if (provider === 'log') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SMS_PROVIDER=log is not allowed in production');
      }
      this.logger.warn(`[dev] OTP for ${phone10}: ${code}`);
      return;
    }

    const authKey = this.config.get<string>('MSG91_AUTH_KEY');
    const templateId = this.config.get<string>('MSG91_OTP_TEMPLATE_ID');
    if (!authKey || !templateId) {
      throw new Error('MSG91_AUTH_KEY / MSG91_OTP_TEMPLATE_ID are not set');
    }

    const url = new URL(MSG91_OTP_URL);
    url.searchParams.set('template_id', templateId);
    url.searchParams.set('mobile', `91${phone10}`);
    url.searchParams.set('otp', code);
    url.searchParams.set('otp_expiry', String(expiryMinutes));

    const res = await fetch(url, {
      method: 'POST',
      headers: { authkey: authKey, 'content-type': 'application/json', accept: 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(8000),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || body?.type === 'error') {
      throw new Error(
        `MSG91 rejected the OTP request (${res.status}): ${body?.message ?? 'no detail'}`,
      );
    }
  }
}
