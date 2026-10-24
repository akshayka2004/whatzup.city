import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly provider: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('MAIL_PROVIDER', 'console');
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    const isProd = process.env.NODE_ENV === 'production';

    switch (this.provider) {
      case 'resend':
        return this.sendWithResend(options);
      case 'sendgrid':
        return this.sendWithSendGrid(options);
      case 'smtp':
        return this.sendWithSmtp(options);
      case 'console':
      default:
        // Bodies carry one-time links (password reset, verification). Printing them
        // in production would let anyone with log access take over accounts.
        if (isProd) {
          this.logger.warn(
            `MAIL_PROVIDER is "${this.provider}"; email "${options.subject}" was NOT sent. Configure resend or sendgrid.`,
          );
          return false;
        }
        this.logger.log(
          `[SIMULATED MAIL] To: ${options.to} | Subject: ${options.subject}\nBody: ${options.text}`,
        );
        return true;
    }
  }

  async sendVerificationEmail(email: string, token: string, tenantId: string): Promise<boolean> {
    const webUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${webUrl}/verify-email?token=${token}&tenant=${tenantId}`;

    return this.sendMail({
      to: email,
      subject: 'Verify your Email Address',
      text: `Hello, please verify your email by clicking the link: ${verificationUrl}`,
      html: `<p>Hello,</p><p>Please verify your email address by clicking <a href="${verificationUrl}">here</a>.</p>`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, tenantId: string): Promise<boolean> {
    const webUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${webUrl}/reset-password?token=${token}&tenant=${tenantId}`;

    return this.sendMail({
      to: email,
      subject: 'Reset Password Request',
      text: `Hello, you requested a password reset. Reset here: ${resetUrl}`,
      html: `<p>Hello,</p><p>You requested a password reset. Click <a href="${resetUrl}">here</a> to choose a new password.</p>`,
    });
  }

  private get from(): string {
    return this.configService.get<string>('MAIL_FROM', 'whtzup.city <no-reply@whtzup.city>');
  }

  private async postJson(url: string, apiKey: string, body: unknown): Promise<boolean> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        this.logger.error(`Mail provider HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (e: any) {
      this.logger.error(`Mail provider unreachable: ${e?.message}`);
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  private async sendWithResend(options: MailOptions): Promise<boolean> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.error('MAIL_PROVIDER=resend but RESEND_API_KEY is not set');
      return false;
    }
    return this.postJson('https://api.resend.com/emails', apiKey, {
      from: this.from,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      ...(options.html ? { html: options.html } : {}),
    });
  }

  private async sendWithSendGrid(options: MailOptions): Promise<boolean> {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      this.logger.error('MAIL_PROVIDER=sendgrid but SENDGRID_API_KEY is not set');
      return false;
    }
    const match = /^(.*)<(.+)>$/.exec(this.from.trim());
    const from = match ? { name: match[1].trim(), email: match[2].trim() } : { email: this.from };
    return this.postJson('https://api.sendgrid.com/v3/mail/send', apiKey, {
      personalizations: [{ to: [{ email: options.to }] }],
      from,
      subject: options.subject,
      content: [
        { type: 'text/plain', value: options.text },
        ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
      ],
    });
  }

  private async sendWithSmtp(options: MailOptions): Promise<boolean> {
    // No SMTP client is bundled; use the resend or sendgrid HTTP providers.
    this.logger.error(`MAIL_PROVIDER=smtp is not supported; "${options.subject}" was NOT sent.`);
    return false;
  }
}
