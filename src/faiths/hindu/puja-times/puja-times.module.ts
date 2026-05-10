import { Module } from '@nestjs/common';
import { PanchangModule } from '../panchang/panchang.module';
import { PujaTimesController } from './controllers/puja-times.controller';
import { PujaTimesService } from './services/puja-times.service';
import { PujaLogService } from './services/puja-log.service';

@Module({
  imports: [PanchangModule],
  controllers: [PujaTimesController],
  providers: [PujaTimesService, PujaLogService],
  exports: [PujaTimesService],
})
export class PujaTimesModule {}
