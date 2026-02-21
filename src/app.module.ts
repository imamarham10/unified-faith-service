import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth-service/modules/auth.module';
import { UsersModule } from './users-service/modules/users.module';
import { FaithModule } from './faiths/faith.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'src/auth-service/.env'],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const isTls = redisUrl.startsWith('rediss://');
        return {
          stores: [
            createKeyv(
              isTls
                ? {
                    url: redisUrl,
                    socket: {
                      tls: true as const,
                      rejectUnauthorized: false, // Required for Aiven self-signed TLS
                    },
                  }
                : { url: redisUrl },
            ),
          ],
          ttl: 3600 * 1000, // Default TTL: 1 hour (in ms)
        };
      },
    }),
    AuthModule,
    UsersModule,
    FaithModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
