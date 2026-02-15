import { Module } from '@nestjs/common';
import { PrayersController } from './controllers/prayers.controller';
import { PrayersService } from './services/prayers.service';
import { PrayerCalculationsService } from './services/prayer-calculations.service';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [PrayersController],
  providers: [PrayersService, PrayerCalculationsService, PrismaService],
  exports: [PrayersService],
})
export class PrayersModule {}
