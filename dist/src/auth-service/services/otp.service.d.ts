import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../repositories/prisma.service';
import { EmailService } from '../providers/email/email.service';
export declare class OtpService {
    private prisma;
    private emailService;
    private configService;
    private readonly otpExpiresIn;
    private readonly maxAttempts;
    private readonly rateLimitRequests;
    private readonly rateLimitWindow;
    constructor(prisma: PrismaService, emailService: EmailService, configService: ConfigService);
    private generateOtp;
    requestOtp(email: string): Promise<{
        message: string;
        expiresIn: number;
    }>;
    verifyOtp(email: string, otp: string): Promise<boolean>;
    private checkRateLimit;
    cleanupExpiredOtps(): Promise<void>;
}
