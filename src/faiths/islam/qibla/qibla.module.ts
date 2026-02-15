import { Module } from '@nestjs/common';
import { QiblaController } from './controllers/qibla.controller';
import { QiblaService } from './services/qibla.service';
import { PrismaService } from '../../../common/utils/prisma.service';

@Module({
  controllers: [QiblaController],
  providers: [QiblaService, PrismaService],
  exports: [QiblaService],
})
export class QiblaModule {}
