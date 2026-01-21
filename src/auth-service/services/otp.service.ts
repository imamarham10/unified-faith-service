import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../repositories/prisma.service';
import { EmailService } from '../providers/email/email.service';

@Injectable()
export class OtpService {
  private readonly otpExpiresIn: number;
  private readonly maxAttempts: number;
  private readonly rateLimitRequests: number;
  private readonly rateLimitWindow: number;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.otpExpiresIn = this.configService.get<number>('OTP_EXPIRES_IN', 300); // 5 minutes
    this.maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 3);
    this.rateLimitRequests = this.configService.get<number>('OTP_RATE_LIMIT_REQUESTS', 3);
    this.rateLimitWindow = this.configService.get<number>('OTP_RATE_LIMIT_WINDOW', 900); // 15 minutes
  }

  /**
   * Generate a 6-digit numeric OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Request OTP - generates and sends OTP to user
   */
  async requestOtp(email: string): Promise<{ message: string; expiresIn: number }> {
    // Check rate limiting
    await this.checkRateLimit(email);

    // Invalidate previous OTPs for this email
    await this.prisma.otpCode.updateMany({
      where: {
        identifier: email,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        isUsed: true,
      },
    });

    // Generate new OTP
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + this.otpExpiresIn * 1000);

    // Store OTP in database
    await this.prisma.otpCode.create({
      data: {
        identifier: email,
        codeHash: otpHash,
        expiresAt,
        attempts: 0,
        isUsed: false,
      },
    });

    // Send OTP via email
    await this.emailService.sendOtpEmail(email, otp);

    return {
      message: 'OTP sent successfully',
      expiresIn: this.otpExpiresIn,
    };
  }

  /**
   * Verify OTP - validates OTP and returns user data if valid
   */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    // Find active OTP for this email
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        identifier: email,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Check attempts
    if (otpRecord.attempts >= this.maxAttempts) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
      throw new BadRequestException('OTP attempts exceeded. Please request a new OTP.');
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.codeHash);

    if (!isValid) {
      // Increment attempts
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });
      throw new BadRequestException(`Invalid OTP. ${this.maxAttempts - otpRecord.attempts - 1} attempts remaining.`);
    }

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    return true;
  }

  /**
   * Check rate limiting for OTP requests
   */
  private async checkRateLimit(email: string): Promise<void> {
    const windowStart = new Date(Date.now() - this.rateLimitWindow * 1000);

    const recentRequests = await this.prisma.otpCode.count({
      where: {
        identifier: email,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    if (recentRequests >= this.rateLimitRequests) {
      throw new HttpException(
        `Too many OTP requests. Please try again after ${this.rateLimitWindow / 60} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Cleanup expired OTPs (should be run as a scheduled job)
   */
  async cleanupExpiredOtps(): Promise<void> {
    await this.prisma.otpCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
