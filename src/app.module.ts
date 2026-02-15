import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    AuthModule,
    UsersModule,
    FaithModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
