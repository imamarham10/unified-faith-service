import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../common/utils/prisma.service';
import { EmailService } from '../../auth-service/providers/email/email.service';
import { GoogleSheetsService } from './google-sheets.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour, per IP

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private emailService: EmailService,
    private googleSheetsService: GoogleSheetsService,
  ) {}

  /** Returns false once an IP has submitted RATE_LIMIT_MAX times within the window. */
  async checkRateLimit(ip: string): Promise<boolean> {
    const key = `feedback:rl:${ip}`;
    const count = (await this.cacheManager.get<number>(key)) || 0;
    if (count >= RATE_LIMIT_MAX) {
      return false;
    }
    await this.cacheManager.set(key, count + 1, RATE_LIMIT_WINDOW_MS);
    return true;
  }

  async create(dto: CreateFeedbackDto, userId: string | null) {
    const feedback = await this.prisma.feedback.create({
      data: {
        type: dto.type,
        message: dto.message,
        email: dto.email,
        userId: userId ?? undefined,
        pageUrl: dto.pageUrl,
        faithContext: dto.faithContext,
        userAgent: dto.userAgent,
      },
    });

    // Notifications are best-effort and must never fail or block the submission
    // response — each side effect swallows its own error and just logs it.
    void Promise.all([
      this.emailService
        .sendFeedbackNotificationEmail(feedback)
        .catch((err) => this.logger.warn(`Feedback email notification failed: ${err.message}`)),
      this.googleSheetsService
        .appendFeedbackRow(feedback)
        .catch((err) => this.logger.warn(`Feedback sheet append failed: ${err.message}`)),
    ]);

    return feedback;
  }

  async findAll() {
    return this.prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
