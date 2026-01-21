import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions } from './email.provider.interface';
export declare class SesProvider implements EmailProvider {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    sendEmail(options: EmailOptions): Promise<void>;
}
