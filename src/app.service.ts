import { Injectable } from '@nestjs/common';
import { SUPPORTED_FAITHS } from './common/constants/faiths.constant';
import { PrismaService } from './common/utils/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Unified Faith Service API is running!';
  }

  getSupportedFaiths() {
    return SUPPORTED_FAITHS;
  }

  async checkHealth() {
    // A real DB round-trip, not a static response — this is what a keep-warm
    // ping needs to hit, since Neon's compute suspends independent of
    // whether the Vercel function itself is warm.
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
