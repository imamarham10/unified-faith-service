import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PreferencesController } from '../controllers/preferences.controller';
import { PreferencesService } from '../services/preferences.service';
@Module({
  imports: [ConfigModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
