import { Module } from '@nestjs/common';
import { ProfileModule } from './profile.module';
import { PreferencesModule } from './preferences.module';
import { AuthModule } from '../../auth-service/modules/auth.module';
import { DeviceTokenController } from '../controllers/device-token.controller';
import { DeviceTokenService } from '../services/device-token.service';
import { AccountController } from '../controllers/account.controller';
import { AccountService } from '../services/account.service';
@Module({
  imports: [
    ProfileModule,
    PreferencesModule,
    AuthModule, // For JWT validation and guards
  ],
  controllers: [DeviceTokenController, AccountController],
  providers: [DeviceTokenService, AccountService],
  exports: [DeviceTokenService],
})
export class UsersModule {}
