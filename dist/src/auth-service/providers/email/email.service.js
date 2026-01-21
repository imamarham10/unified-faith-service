"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const smtp_provider_1 = require("./smtp.provider");
const ses_provider_1 = require("./ses.provider");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService, smtpProvider, sesProvider) {
        this.configService = configService;
        this.smtpProvider = smtpProvider;
        this.sesProvider = sesProvider;
        this.logger = new common_1.Logger(EmailService_1.name);
        const providerType = this.configService.get('EMAIL_PROVIDER', 'smtp');
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
    async sendEmail(options) {
        return this.provider.sendEmail(options);
    }
    async sendOtpEmail(to, otp) {
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
    getOtpEmailTemplate(otp) {
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
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        smtp_provider_1.SmtpProvider,
        ses_provider_1.SesProvider])
], EmailService);
//# sourceMappingURL=email.service.js.map