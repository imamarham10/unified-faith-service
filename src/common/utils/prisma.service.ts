import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private logger: Logger;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not set in environment variables. ' +
        'Please set DATABASE_URL in your .env file.',
      );
    }

    // Prisma 7.2.0 requires adapter or accelerateUrl for PostgreSQL
    if (databaseUrl.startsWith('prisma+')) {
      super({ accelerateUrl: databaseUrl });
    } else {
      // Standard PostgreSQL - use adapter
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
          rejectUnauthorized: false, // Accept self-signed certificates
        },
      });
      const adapter = new PrismaPg(pool);
      super({ adapter });
    }
    
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
  }
}
