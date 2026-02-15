import { Module } from '@nestjs/common';
import { CalendarController } from './controllers/calendar.controller';
import { CalendarService } from './services/calendar.service';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, PrismaService],
  exports: [CalendarService]
})
export class CalendarModule {}
