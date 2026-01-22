import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PreferencesController } from '../controllers/preferences.controller';
import { PreferencesService } from '../services/preferences.service';
import { PrismaService } from '../repositories/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [PreferencesController],
  providers: [PreferencesService, PrismaService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
