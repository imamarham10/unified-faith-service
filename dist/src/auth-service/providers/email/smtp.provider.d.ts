import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions } from './email.provider.interface';
export declare class SmtpProvider implements EmailProvider {
    private configService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService);
    sendEmail(options: EmailOptions): Promise<void>;
}
