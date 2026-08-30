import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions } from './email.provider.interface';
import { SmtpProvider } from './smtp.provider';
import { SesProvider } from './ses.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private provider: EmailProvider;

  constructor(
    private configService: ConfigService,
    private smtpProvider: SmtpProvider,
    private sesProvider: SesProvider,
  ) {
    // Select provider based on configuration
    const providerType = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');
    
    switch (providerType.toLowerCase()) {
      case 'ses':
        this.provider = this.sesProvider;
        this.logger.log('Using AWS SES email provider');
        break;
      case 'smtp':
      default:
        this.provider = this.smtpProvider;
        this.logger.log('Using SMTP email provider');
        break;
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    return this.provider.sendEmail(options);
  }

  async sendFeedbackNotificationEmail(feedback: {
    id: string;
    type: string;
    message: string;
    email?: string | null;
    pageUrl: string;
    faithContext?: string | null;
  }): Promise<void> {
    const to = this.configService.get<string>('FEEDBACK_NOTIFY_EMAIL');
    if (!to) {
      this.logger.debug('FEEDBACK_NOTIFY_EMAIL not set — skipping feedback email notification.');
      return;
    }

    const typeLabel = feedback.type.replace('_', ' ').toUpperCase();
    const subject = `[Siraat Feedback] ${typeLabel}`;
    const text = [
      `Type: ${typeLabel}`,
      `Page: ${feedback.pageUrl}`,
      feedback.faithContext ? `Faith: ${feedback.faithContext}` : null,
      feedback.email ? `Reporter email: ${feedback.email}` : 'Reporter email: (not provided)',
      '',
      feedback.message,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendEmail({ to, subject, text });
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Your Login OTP Code';
    const html = this.getOtpEmailTemplate(otp);
    const text = `Your login OTP code is: ${otp}. This code will expire in 5 minutes.`;

    await this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }

  private getOtpEmailTemplate(otp: string): string {
    return this.getCodeEmailTemplate({
      heading: 'Your Login Verification Code',
      intro: 'Your one-time password (OTP) for login is:',
      otp,
    });
  }

  async sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Reset your password';
    const html = this.getCodeEmailTemplate({
      heading: 'Reset Your Password',
      intro: 'Use this code to reset your password:',
      otp,
    });
    const text = `Your password reset code is: ${otp}. This code will expire in 5 minutes. If you didn't request this, you can safely ignore this email.`;

    await this.sendEmail({ to, subject, text, html });
  }

  private getCodeEmailTemplate({
    heading,
    intro,
    otp,
  }: {
    heading: string;
    intro: string;
    otp: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${heading}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Unified Faith Service</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">${heading}</h2>
            <p>Hello,</p>
            <p>${intro}</p>
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
            </div>
            <p>This code will expire in <strong>5 minutes</strong>.</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you didn't request this code, please ignore this email — your account is safe.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Unified Faith Service. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
  }
}
