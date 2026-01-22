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

    // Prisma 7.2.0 requires adapter or accelerateUrl even for standard PostgreSQL
    // For Prisma Accelerate (URL starts with "prisma+"), use accelerateUrl
    // For standard PostgreSQL, use PostgreSQL adapter
    if (databaseUrl.startsWith('prisma+')) {
      super({ accelerateUrl: databaseUrl });
    } else {
      // Standard PostgreSQL - use adapter
      // Aiven databases use self-signed certificates, so we need to accept them
      // Configure SSL to accept self-signed certificates
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
          rejectUnauthorized: false, // Accept self-signed certificates (required for Aiven)
        },
      });
      const adapter = new PrismaPg(pool);
      super({ adapter });
    }
    
    // Initialize logger after super() call
    this.logger = new Logger(PrismaService.name);
  }

  async onModuleInit() {
    // Log what URL we're using (first 50 chars for security)
    const databaseUrl = process.env.DATABASE_URL;
    this.logger.log(`Connecting to users database: ${databaseUrl?.substring(0, 50)}...`);
    
    try {
      await this.$connect();
      this.logger.log('Users database connected successfully');
    } catch (error) {
      // Log error but don't crash the app
      // The connection will be retried on the first query
      this.logger.warn(
        'Failed to connect to users database on startup. ' +
        'Connection will be attempted on first query. Error: ' + error.message,
      );
      // Don't throw - allow app to start even if DB is temporarily unavailable
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Users database disconnected');
    } catch (error) {
      this.logger.warn('Error disconnecting from users database:', error.message);
    }
  }
}
