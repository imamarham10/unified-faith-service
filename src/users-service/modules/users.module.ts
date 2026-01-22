import { Module } from '@nestjs/common';
import { ProfileModule } from './profile.module';
import { PreferencesModule } from './preferences.module';
import { AuthModule } from '../../auth-service/modules/auth.module';
import { DeviceTokenController } from '../controllers/device-token.controller';
import { DeviceTokenService } from '../services/device-token.service';
import { PrismaService } from '../repositories/prisma.service';

@Module({
  imports: [
    ProfileModule,
    PreferencesModule,
    AuthModule, // For JWT validation and guards
  ],
  controllers: [DeviceTokenController],
  providers: [DeviceTokenService, PrismaService],
  exports: [DeviceTokenService],
})
export class UsersModule {}
