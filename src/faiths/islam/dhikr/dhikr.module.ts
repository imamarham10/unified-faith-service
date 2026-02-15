import { Module } from '@nestjs/common';
import { DhikrController } from './controllers/dhikr.controller';
import { DhikrService } from './services/dhikr.service';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [DhikrController],
  providers: [DhikrService, PrismaService],
  exports: [DhikrService],
})
export class DhikrModule {}
