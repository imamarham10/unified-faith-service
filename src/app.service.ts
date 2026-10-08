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
    // A real DB round-trip, not a static response, so the keep-warm ping
    // exercises the connection pool and not just the Vercel function. This
    // originally existed because Neon's compute auto-suspended on its own;
    // RDS is provisioned and never suspends, but the round-trip is still
    // what makes this endpoint a meaningful health check.
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
