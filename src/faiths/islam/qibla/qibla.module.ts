import { Module } from '@nestjs/common';
import { QiblaController } from './controllers/qibla.controller';
import { QiblaService } from './services/qibla.service';
@Module({
  controllers: [QiblaController],
  providers: [QiblaService],
  exports: [QiblaService],
})
export class QiblaModule {}
