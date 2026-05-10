import { Module } from '@nestjs/common';
import { PanchangController } from './controllers/panchang.controller';
import { PanchangService } from './services/panchang.service';
import { SunPositionService } from './services/sun-position.service';

@Module({
  controllers: [PanchangController],
  providers: [PanchangService, SunPositionService],
  exports: [PanchangService, SunPositionService],
})
export class PanchangModule {}
