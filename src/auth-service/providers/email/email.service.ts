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
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login OTP</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Unified Faith Service</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Your Login Verification Code</h2>
            <p>Hello,</p>
            <p>Your one-time password (OTP) for login is:</p>
            <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
            </div>
            <p>This code will expire in <strong>5 minutes</strong>.</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you didn't request this code, please ignore this email.
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
