import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private logger: Logger;
  // Stored so onModuleDestroy can drain the pool and prevent connection leaks on hot-reload
  private pool: Pool | null;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not set in environment variables. ' +
        'Please set DATABASE_URL in your .env file.',
      );
    }

    // Compute super() options up-front so we can call super() once at the root level
    // (TypeScript requires super() to be a root-level statement when the class has initialized fields)
    let superOptions: ConstructorParameters<typeof PrismaClient>[0];
    let pgPool: Pool | null = null;

    if (databaseUrl.startsWith('prisma+')) {
      superOptions = { accelerateUrl: databaseUrl };
    } else {
      // Cap pool to 8 connections — Aiven free tier has limited connection slots
      // (max_connections=20 total, shared with the auth-service and users-service
      // pools at 3 each: worst case 8+3+3=14, comfortable margin under 20).
      // Was capped at 3 after a July incident (Vercel txn timeouts under too many
      // pooled connections) but the faith home-page loaders (islam.tsx, hindu.tsx)
      // each fan out 5-6 concurrent Prisma-backed requests through this SAME pool
      // (every faiths/* module injects this one) — 3 connections forced those
      // requests to queue, adding measured seconds of latency on page load.
      // idleTimeoutMillis releases idle clients quickly between hot-reloads.
      pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 8,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      });
      superOptions = { adapter: new PrismaPg(pgPool) };
    }

    super(superOptions);

    this.pool = pgPool;
    this.logger = new Logger(PrismaService.name);
  }

  async onModuleInit() {
    const databaseUrl = process.env.DATABASE_URL;
    this.logger.log(`Connecting to database: ${databaseUrl?.substring(0, 50)}...`);

    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.warn(
        'Failed to connect to database on startup. ' +
        'Connection will be attempted on first query. Error: ' + error.message,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database disconnected');
    } catch (error) {
      this.logger.warn('Error disconnecting from database:', error.message);
    }
    // Drain the pool so hot-reloads don't accumulate stale connections
    if (this.pool) {
      try {
        await this.pool.end();
        this.logger.log('Connection pool drained');
      } catch (error) {
        this.logger.warn('Error draining connection pool:', error.message);
      }
    }
  }
}
