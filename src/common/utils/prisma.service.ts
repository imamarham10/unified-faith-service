import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { prismaSchemaOptions } from './db-schema';

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
      // MIGRATED (2026-10-08): DATABASE_URL now points at the habuild-dev RDS
      // instance (database "utility", schema "faith"), not Neon. RDS has no
      // PgBouncer in front of it, so unlike the Neon -pooler endpoint this
      // max:10 is 10 real backend connections — but max_connections there is
      // 800 with ~46 in use, so there is ample headroom. DATABASE_URL and
      // DATABASE_URL_UNPOOLED are now the same host; the split is kept only
      // because prisma.config.ts still reads the UNPOOLED one.
      // Prior history: Neon (2026-08-30) after Aiven "too many connections"
      // incidents, where the root cause was no pooler at all on Aiven's
      // Free/Developer tiers, only per-instance limits directly against
      // Postgres. max:10 was a deliberate step up from the old max:3 —
      // reassess with real traffic data before going higher.
      // idleTimeoutMillis releases idle clients quickly between hot-reloads.
      pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
      });
      // The tables live in the "faith" schema — see db-schema.ts for why this
      // can't ride along in the connection string.
      superOptions = {
        adapter: new PrismaPg(pgPool, prismaSchemaOptions(databaseUrl)),
      };
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
