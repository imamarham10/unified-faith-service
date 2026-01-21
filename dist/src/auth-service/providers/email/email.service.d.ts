import { ConfigService } from '@nestjs/config';
import { EmailOptions } from './email.provider.interface';
import { SmtpProvider } from './smtp.provider';
import { SesProvider } from './ses.provider';
export declare class EmailService {
    private configService;
    private smtpProvider;
    private sesProvider;
    private readonly logger;
    private provider;
    constructor(configService: ConfigService, smtpProvider: SmtpProvider, sesProvider: SesProvider);
    sendEmail(options: EmailOptions): Promise<void>;
    sendOtpEmail(to: string, otp: string): Promise<void>;
    private getOtpEmailTemplate;
}
