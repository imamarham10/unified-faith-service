import { Module } from '@nestjs/common';
import { PanchangController } from './controllers/panchang.controller';
import { PanchangService } from './services/panchang.service';
import { SunPositionService } from './services/sun-position.service';
import { FestivalRuleService } from './services/festival-rule.service';

@Module({
  controllers: [PanchangController],
  providers: [PanchangService, SunPositionService, FestivalRuleService],
  exports: [PanchangService, SunPositionService, FestivalRuleService],
})
export class PanchangModule {}
