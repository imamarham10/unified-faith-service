import { Module } from '@nestjs/common';
import { DhikrController } from './controllers/dhikr.controller';
import { DhikrService } from './services/dhikr.service';
import { DhikrDictionaryService } from './services/dhikr-dictionary.service';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [DhikrController],
  providers: [DhikrService, DhikrDictionaryService, PrismaService],
  exports: [DhikrService, DhikrDictionaryService],
})
export class DhikrModule {}
