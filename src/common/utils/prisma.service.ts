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
      // Cap pool to 5 connections — Aiven's plan allows ~20 total.
      // CORRECTED (2026-08-30): this is the ONLY PrismaService/pool in the
      // whole app — @Global() PrismaModule, every faiths/auth/users service
      // injects this exact instance. Two other "PrismaService" files used to
      // exist (auth-service/repositories, users-service/repositories) but
      // were unreferenced dead code — deleted. There was never a 3-way pool
      // split; login and faith-page queries were always on this one pool,
      // which is why they failed together during the max:8 incident
      // (2026-08-29): under a burst of concurrent serverless instances, N
      // instances x max each can exceed Aiven's 20-connection ceiling and get
      // rejected server-side, hitting every request routed through this pool
      // at once. Going with a modest 3->5 bump (not back to 8) — real
      // concurrency headroom for a traffic spike (e.g. a marketing push)
      // needs an actual connection pooler (PgBouncer via Aiven, or Prisma
      // Accelerate — see the accelerateUrl branch above, currently unused)
      // in front of Postgres, not a bigger per-instance pool number, since
      // Vercel can spin up more concurrent instances than any fixed max
      // safely supports.
      // idleTimeoutMillis releases idle clients quickly between hot-reloads.
      pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 5,
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
