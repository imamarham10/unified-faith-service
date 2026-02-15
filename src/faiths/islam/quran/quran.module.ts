import { Module } from '@nestjs/common';
import { QuranController } from './controllers/quran.controller';
import { QuranService } from './services/quran.service';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [QuranController],
  providers: [QuranService, PrismaService],
  exports: [QuranService],
})
export class QuranModule {}
