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
        this.logger.log(
          `📬 [SIMULATED MAIL] To: ${options.to} | Subject: ${options.subject}\nBody: ${options.text}`,
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

  private async sendWithResend(options: MailOptions): Promise<boolean> {
    this.logger.log(`Resend: Sending email to ${options.to}`);
    // Integration logic placeholder for `resend` package or HTTP call
    return true;
  }

  private async sendWithSendGrid(options: MailOptions): Promise<boolean> {
    this.logger.log(`SendGrid: Sending email to ${options.to}`);
    // Integration logic placeholder for `@sendgrid/mail`
    return true;
  }

  private async sendWithSmtp(options: MailOptions): Promise<boolean> {
    this.logger.log(`SMTP: Sending email to ${options.to}`);
    // Integration logic placeholder for `nodemailer`
    return true;
  }
}
